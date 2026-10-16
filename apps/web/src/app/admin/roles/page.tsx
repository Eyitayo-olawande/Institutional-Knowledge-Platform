import { listUsers } from "@mantle/db/tenant";
import { parseRoles, ROLES } from "@mantle/platform/identity";
import { Button, Card } from "@mantle/ui";
import { t } from "../../../i18n.ts";
import { initials } from "../../../server/nav.ts";
import { requirePermission } from "../../../server/session.ts";
import { AppShell, PageHead } from "../../_components/AppShell.tsx";
import { saveRoles } from "./actions.ts";

const ERRORS = new Set(["unknown_person", "own_admin"]);

export default async function Roles({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const ctx = await requirePermission("roles.manage");
  const users = await listUsers(ctx.db);
  const { saved, error } = await searchParams;

  return (
    <AppShell ctx={ctx} active="roles">
      <PageHead title={t("roles.title")} sub={t("roles.explain")} />
      {saved ? <div className="alert alert-success" role="status"><p>{t("roles.saved")}</p></div> : null}
      {error && ERRORS.has(error) ? <div className="alert alert-danger" role="alert"><p>{t(`roles.errors.${error}`)}</p></div> : null}
      <Card>
        <ul className="list">
          {users.map((u) => {
            const held = new Set(parseRoles(u.roles));
            return (
              <li key={u.id} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                <div className="avatar" aria-hidden="true">{initials(u.name)}</div>
                <form action={saveRoles} className="grow" style={{ minWidth: 240 }}>
                  <input type="hidden" name="userId" value={u.id} />
                  <div className="title">{u.name}</div>
                  <div className="muted">{u.email}</div>
                  <div className="row" style={{ gap: 4, margin: "6px 0 8px" }}>
                    {ROLES.map((role) => (
                      <label key={role} className="check" style={{ marginRight: 12 }}>
                        <input type="checkbox" name={`role_${role}`} defaultChecked={held.has(role)} /> {t(`roles.names.${role}`)}
                      </label>
                    ))}
                  </div>
                  <Button type="submit" variant="secondary" size="sm">{t("roles.save")}</Button>
                </form>
              </li>
            );
          })}
        </ul>
      </Card>
    </AppShell>
  );
}
