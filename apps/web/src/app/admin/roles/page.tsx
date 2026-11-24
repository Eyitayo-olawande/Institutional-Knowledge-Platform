import { listTenantRoles, listUsers } from "@mantle/db/tenant";
import { ACTIONS } from "@mantle/platform/identity";
import { Button, Card } from "@mantle/ui";
import Link from "next/link";
import { t } from "../../../i18n.ts";
import { initials } from "../../../server/nav.ts";
import { requirePermission } from "../../../server/session.ts";
import { AppShell, PageHead } from "../../_components/AppShell.tsx";
import { archiveRole, createRole, saveRoles, unarchiveRole, updateRole } from "./actions.ts";

const ASSIGN_ERRORS = new Set(["unknown_person", "own_admin", "unknown_role"]);
const DEF_ERRORS = new Set(["name_taken", "missing", "is_system", "has_people"]);

const ACTION_LABELS: Record<string, string> = {
  "people.view": t("roles.actions.people_view"),
  "people.import": t("roles.actions.people_import"),
  "roles.manage": t("roles.actions.roles_manage"),
  "wording.edit": t("roles.actions.wording_edit"),
  "structure.manage": t("roles.actions.structure_manage"),
  "activity.view": t("roles.actions.activity_view"),
  "library.view": t("roles.actions.library_view"),
  "library.edit": t("roles.actions.library_edit"),
  "library.all_areas": t("roles.actions.library_all_areas"),
  "areas.manage": t("roles.actions.areas_manage"),
  "paths.edit": t("roles.actions.paths_edit"),
  "nominations.manage": t("roles.actions.nominations_manage"),
  "candidates.manage": t("roles.actions.candidates_manage"),
  "reports.view": t("roles.actions.reports_view"),
  "team.view": t("roles.actions.team_view"),
};

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string; error?: string; edit?: string; show_archived?: string }>;
}) {
  const ctx = await requirePermission("roles.manage");
  const { tab: tabParam, saved, error, edit: editId, show_archived } = await searchParams;
  const tab = tabParam === "definitions" ? "definitions" : "users";
  const showArchived = show_archived === "1";

  const [users, allRoles] = await Promise.all([
    listUsers(ctx.db),
    listTenantRoles(ctx.db, showArchived || tab === "definitions"),
  ]);

  const activeRoles = allRoles.filter((r) => !r.archived);

  return (
    <AppShell ctx={ctx} active="roles">
      <PageHead title={t("roles.title")} sub={t("roles.explain")} />

      <div className="tabs" role="tablist" style={{ marginBottom: 16 }}>
        <Link href="/admin/roles?tab=users" role="tab" aria-selected={tab === "users"}>{t("roles.tab_users")}</Link>
        <Link href="/admin/roles?tab=definitions" role="tab" aria-selected={tab === "definitions"}>{t("roles.tab_definitions")}</Link>
      </div>

      {tab === "users" ? (
        <div>
          {saved === "1" ? <div className="alert alert-success" role="status"><p>{t("roles.saved")}</p></div> : null}
          {error && ASSIGN_ERRORS.has(error) ? <div className="alert alert-danger" role="alert"><p>{t(`roles.errors.${error}`)}</p></div> : null}
          <Card>
            <ul className="list">
              {users.map((u) => {
                const heldNames = new Set((u.roles ?? "").split(",").map((r) => r.trim()).filter(Boolean));
                return (
                  <li key={u.id} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div className="avatar" aria-hidden="true">{initials(u.name)}</div>
                    <form action={saveRoles} className="grow" style={{ minWidth: 240 }}>
                      <input type="hidden" name="userId" value={u.id} />
                      <div className="title">{u.name}</div>
                      <div className="muted">{u.email}</div>
                      <div className="role-checks">
                        {activeRoles.map((role) => (
                          <label key={role.name} className="check">
                            <input type="checkbox" name={`role_${role.name}`} defaultChecked={heldNames.has(role.name)} />
                            {role.label}
                            {role.isSystem ? null : <span className="badge badge-sm" style={{ marginLeft: 4 }}>{t("roles.custom_badge")}</span>}
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
        </div>
      ) : (
        <div>
          {saved === "1" ? <div className="alert alert-success" role="status"><p>{t("roles.def_saved")}</p></div> : null}
          {error && DEF_ERRORS.has(error) ? <div className="alert alert-danger" role="alert"><p>{t(`roles.def_errors.${error}`)}</p></div> : null}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Link
              href={showArchived ? "/admin/roles?tab=definitions" : "/admin/roles?tab=definitions&show_archived=1"}
              className="btn btn-ghost btn-sm"
            >
              {showArchived ? t("roles.hide_archived") : t("roles.show_archived")}
            </Link>
            <Link href="/admin/roles?tab=definitions&edit=new" className="btn btn-primary btn-sm">{t("roles.new_role_btn")}</Link>
          </div>

          {editId === "new" ? (
            <Card style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>{t("roles.create_heading")}</h3>
              <form action={createRole}>
                <div style={{ marginBottom: 12 }}>
                  <label className="label">{t("roles.label_field")}</label>
                  <input className="input" name="label" required placeholder={t("roles.label_placeholder")} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="label">{t("roles.name_field")}</label>
                  <input className="input" name="name" placeholder={t("roles.name_auto_note")} />
                  <p className="muted" style={{ marginTop: 4 }}>{t("roles.name_hint")}</p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="label">{t("roles.permissions_field")}</label>
                  <div className="role-checks">
                    {ACTIONS.map((action) => (
                      <label key={action} className="check">
                        <input type="checkbox" name={`action_${action}`} />
                        {ACTION_LABELS[action] ?? action}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Button type="submit" variant="primary">{t("roles.create_btn")}</Button>
                  <Link href="/admin/roles?tab=definitions" className="btn btn-ghost">{t("roles.cancel")}</Link>
                </div>
              </form>
            </Card>
          ) : null}

          <Card>
            <table className="table">
              <thead>
                <tr>
                  <th>{t("roles.col_label")}</th>
                  <th>{t("roles.col_name")}</th>
                  <th>{t("roles.col_permissions")}</th>
                  <th>{t("roles.col_type")}</th>
                  <th>{t("roles.col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {allRoles.map((role) => (
                  <tr key={role.id} style={role.archived ? { opacity: 0.5 } : {}}>
                    <td><strong>{role.label}</strong></td>
                    <td><code>{role.name}</code></td>
                    <td>
                      {role.archived
                        ? <span className="muted">{t("roles.archived_label")}</span>
                        : role.actions.length > 0
                          ? String(role.actions.length)
                          : <span className="muted">{t("roles.no_permissions")}</span>}
                    </td>
                    <td>
                      {role.isSystem
                        ? <span className="badge">{t("roles.system_badge")}</span>
                        : <span className="badge badge-outline">{t("roles.custom_badge")}</span>}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                        {!role.archived ? (
                          <Link href={`/admin/roles?tab=definitions&edit=${role.id}`} className="btn btn-ghost btn-sm">{t("roles.edit_btn")}</Link>
                        ) : null}
                        {!role.isSystem && !role.archived ? (
                          <form action={archiveRole} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={role.id} />
                            <Button type="submit" variant="ghost" size="sm">{t("roles.archive_btn")}</Button>
                          </form>
                        ) : null}
                        {!role.isSystem && role.archived ? (
                          <form action={unarchiveRole} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={role.id} />
                            <Button type="submit" variant="ghost" size="sm">{t("roles.unarchive_btn")}</Button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {editId && editId !== "new" ? (() => {
            const role = allRoles.find((r) => r.id === editId);
            if (!role) return null;
            const heldActions = new Set(role.actions);
            return (
              <Card style={{ marginTop: 16 }}>
                <h3 style={{ marginTop: 0 }}>{t("roles.edit_heading")}</h3>
                <form action={updateRole}>
                  <input type="hidden" name="id" value={role.id} />
                  <div style={{ marginBottom: 12 }}>
                    <label className="label">{t("roles.label_field")}</label>
                    <input className="input" name="label" defaultValue={role.label} required />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="label">{t("roles.permissions_field")}</label>
                    <div className="role-checks">
                      {ACTIONS.map((action) => (
                        <label key={action} className="check">
                          <input type="checkbox" name={`action_${action}`} defaultChecked={heldActions.has(action)} />
                          {ACTION_LABELS[action] ?? action}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <Button type="submit" variant="primary">{t("roles.save")}</Button>
                    <Link href="/admin/roles?tab=definitions" className="btn btn-ghost">{t("roles.cancel")}</Link>
                  </div>
                </form>
              </Card>
            );
          })() : null}
        </div>
      )}
    </AppShell>
  );
}
