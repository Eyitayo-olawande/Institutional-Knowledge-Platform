import { listActiveStaff, listAreaGrants, listAreas, wording } from "@mantle/db/tenant";
import { Button, Card } from "@mantle/ui";
import { t } from "../../../i18n.ts";
import { requirePermission } from "../../../server/session.ts";
import { AppShell, PageHead } from "../../_components/AppShell.tsx";
import { grantAccess, revokeAccess } from "./actions.ts";

const DONE = new Set(["granted", "revoked"]);

// Who outside a department can see its Department Learning area.
export default async function Areas({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const ctx = await requirePermission("areas.manage");
  const { db } = ctx;
  const { done, error } = await searchParams;
  const [areas, grants, labels, staff] = await Promise.all([
    listAreas(db),
    listAreaGrants(db),
    wording(db),
    listActiveStaff(db),
  ]);
  const departmentAreas = areas.filter((a) => a.kind === "department");

  return (
    <AppShell ctx={ctx} active="areas">
      <PageHead title={t("areas.title")} sub={t("areas.explain", { department: labels.department.singular.toLowerCase() })} />
      {done && DONE.has(done) ? <div className="alert alert-success" role="status"><p>{t(`areas.${done}`)}</p></div> : null}
      {error ? <div className="alert alert-danger" role="alert"><p>{t("areas.error")}</p></div> : null}

      {departmentAreas.length === 0 ? (
        <Card><p className="sub">{t("areas.empty", { departments: labels.department.plural.toLowerCase() })}</p></Card>
      ) : (
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          {departmentAreas.map((area) => {
            const granted = grants.filter((g) => g.areaId === area.id);
            const members = staff.filter((p) => p.departmentId === area.departmentId).length;
            const candidates = staff.filter((p) => p.departmentId !== area.departmentId && !granted.some((g) => g.personId === p.id));
            return (
              <Card key={area.id}>
                <h2>{area.departmentName}</h2>
                <p className="muted" style={{ marginTop: 0 }}>{t("areas.members", { count: members })}</p>
                {granted.length === 0 ? (
                  <p className="sub">{t("areas.no_grants")}</p>
                ) : (
                  <ul className="list">
                    {granted.map((g) => (
                      <li key={g.personId}>
                        <div className="grow">
                          <strong>{g.fullName}</strong>
                          <div className="muted" style={{ fontSize: 13 }}>{g.workEmail}</div>
                        </div>
                        <form action={revokeAccess}>
                          <input type="hidden" name="areaId" value={area.id} />
                          <input type="hidden" name="personId" value={g.personId} />
                          <Button type="submit" variant="ghost" size="sm" aria-label={t("areas.remove_label", { name: g.fullName })}>{t("areas.remove")}</Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                {candidates.length > 0 ? (
                  <form action={grantAccess} className="row" style={{ marginTop: 12, flexWrap: "nowrap" }}>
                    <input type="hidden" name="areaId" value={area.id} />
                    <select className="input" name="personId" required defaultValue="" aria-label={t("areas.person_label", { name: area.departmentName ?? "" })}>
                      <option value="" disabled>{t("areas.choose_person")}</option>
                      {candidates.map((p) => (
                        <option key={p.id} value={p.id}>{p.fullName}</option>
                      ))}
                    </select>
                    <Button type="submit" variant="secondary" size="sm">{t("areas.grant")}</Button>
                  </form>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
