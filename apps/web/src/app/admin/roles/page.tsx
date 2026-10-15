import { listUsers } from "@mantle/db/tenant";
import { parseRoles, ROLES } from "@mantle/platform/identity";
import { Button, color, space } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { requirePermission } from "../../../server/session.ts";
import { saveRoles } from "./actions.ts";

const ERRORS = new Set(["unknown_person", "own_admin"]);

export default async function Roles({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { tenant, db } = await requirePermission("roles.manage");
  const users = await listUsers(db);
  const { saved, error } = await searchParams;

  return (
    <main style={{ padding: space.md, maxWidth: 960 }}>
      <p>
        <Link href="/">{t("people.back")}</Link>
      </p>
      <h1>{t("roles.heading", { name: tenant.name })}</h1>
      <p>{t("roles.explain")}</p>
      {saved && <p role="status" style={{ color: color.success }}>{t("roles.saved")}</p>}
      {error && ERRORS.has(error) && <p role="alert" style={{ color: color.danger }}>{t(`roles.errors.${error}`)}</p>}
      {users.map((u) => {
        const held = new Set(parseRoles(u.roles));
        return (
          <form key={u.id} action={saveRoles} style={{ borderTop: `1px solid ${color.border}`, padding: `${space.sm} 0` }}>
            <input type="hidden" name="userId" value={u.id} />
            <p>
              <strong>{u.name}</strong> {u.email}
            </p>
            <p style={{ display: "flex", flexWrap: "wrap", gap: space.md }}>
              {ROLES.map((role) => (
                <label key={role}>
                  <input type="checkbox" name={`role_${role}`} defaultChecked={held.has(role)} /> {t(`roles.names.${role}`)}
                </label>
              ))}
            </p>
            <Button type="submit" variant="secondary">{t("roles.save")}</Button>
          </form>
        );
      })}
    </main>
  );
}
