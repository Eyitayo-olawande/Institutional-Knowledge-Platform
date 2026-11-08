import { listPeople, wording } from "@mantle/db/tenant";
import { Badge, Button, Card, StatTile } from "@mantle/ui";
import { cookies } from "next/headers";
import { t } from "../../../i18n.ts";
import { requireFeature, requirePermission } from "../../../server/session.ts";
import { AppShell } from "../../_components/AppShell.tsx";
import { importStaff } from "./actions.ts";
import { RESULT_COOKIE, type ImportResult } from "./import_result.ts";

const COUNTS = ["joined", "moved", "updated", "unchanged", "left"] as const;

export default async function People() {
  const ctx = await requirePermission("people.view");
  const { tenant, db } = ctx;
  await requireFeature(tenant, "people_import");
  const people = await listPeople(db);
  const labels = await wording(db);
  const raw = (await cookies()).get(RESULT_COOKIE)?.value;
  const result = raw ? (JSON.parse(raw) as ImportResult) : undefined;

  return (
    <AppShell ctx={ctx} active="people">
      <div className="admin-hero-wrap">
        <div className="admin-banner">
          <div className="people-banner-bg" />
          <div className="admin-banner-shade" />
          <div className="admin-banner-copy">
            <h1>
              {t("people.banner_heading").split(" ")[0]}{" "}
              <span>{t("people.banner_heading").split(" ").slice(1).join(" ")}</span>
            </h1>
            <p>{t("people.banner_sub")}</p>
            <div className="admin-banner-rule" />
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/learning-professional.png" alt="" aria-hidden="true" className="admin-banner-person" />
      </div>

      <div className="paths-admin-layout">
        {/* Staff table */}
        <Card>
          <h2 style={{ marginTop: 0 }}>{t("people.list_heading", { count: people.length })}</h2>
          {people.length === 0 ? (
            <p className="sub">{t("people.empty")}</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("people.columns.employee_id")}</th>
                    <th>{t("people.columns.name")}</th>
                    <th>{t("people.columns.email")}</th>
                    <th>{labels.department.singular}</th>
                    <th>{t("people.columns.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id}>
                      <td>{p.employeeId}</td>
                      <td><strong>{p.fullName}</strong></td>
                      <td>{p.workEmail}</td>
                      <td>{p.department}</td>
                      <td><Badge tone={p.status === "active" ? "success" : "neutral"}>{t(`people.statuses.${p.status}`)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Import sidebar */}
        <aside className="paths-admin-aside">
          {result ? (
            <section role="status" style={{ marginBottom: 16 }}>
              {result.joined !== undefined ? (
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginBottom: 12 }}>
                  {COUNTS.map((k) => (
                    <StatTile key={k} label={t(`people.import.labels.${k}`)} value={result[k] ?? 0} />
                  ))}
                </div>
              ) : null}
              {result.problems.length > 0 ? (
                <div className="alert alert-danger" role="alert">
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {result.problems.map((p) => (
                      <li key={`${p.line}-${p.key}`}>
                        {p.line > 0 ? t("people.import.line", { line: p.line }) : null}
                        {t(p.key, { columns: p.columns ?? "" })}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
          <Card>
            <h2 style={{ marginTop: 0 }}>{t("people.import.heading")}</h2>
            <p className="muted" style={{ marginTop: 0 }}>{t("people.import.format")}</p>
            <form action={importStaff}>
              <label className="field">
                {t("people.import.file")}
                <input className="input" type="file" name="file" accept=".csv,text/csv" required />
              </label>
              <label className="check" style={{ marginBottom: 12 }}>
                <input type="checkbox" name="mark_leavers" /> {t("people.import.mark_leavers")}
              </label>
              <div>
                <Button type="submit">{t("people.import.submit")}</Button>
              </div>
            </form>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
