"use server";

import {
  archiveTenantRole,
  changeUserRoles,
  createTenantRole,
  listTenantRoles,
  listUsers,
  unarchiveTenantRole,
  updateTenantRole,
} from "@mantle/db/tenant";
import { ACTIONS } from "@mantle/platform/identity";
import { notify } from "@mantle/platform/notifications";
import { t } from "../../../i18n.ts";
import { mailer } from "../../../server/auth.ts";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../server/session.ts";

// --- User role assignment (updated to use DB-driven roles) ---

export async function saveRoles(form: FormData): Promise<void> {
  const { db, user, tenant } = await requirePermission("roles.manage");
  const userId = String(form.get("userId") ?? "");
  const allUsers = await listUsers(db);
  if (!allUsers.some((u) => u.id === userId)) redirect("/admin/roles?tab=users&error=unknown_person");

  const activeRoles = await listTenantRoles(db, false);
  const chosen = activeRoles.filter((role) => form.get(`role_${role.name}`) === "on");
  const chosenNames = chosen.map((r) => r.name);

  if (userId === user.id && !chosenNames.includes("learning_administrator")) {
    redirect("/admin/roles?tab=users&error=own_admin");
  }

  const before = allUsers.find((u) => u.id === userId)?.roles ?? "";
  const after = chosenNames.join(",");
  await changeUserRoles(db, userId, after, `user:${user.id}`);

  if (before !== after) {
    await notify(db, mailer, {
      event: "roles.changed",
      userIds: [userId],
      params: {
        organisation: tenant.name,
        roles: chosen.map((r) => r.label).join(", ") || t("roles.none"),
      },
    });
  }
  redirect("/admin/roles?tab=users&saved=1");
}

// --- Role definition management (Phase 3) ---

export async function createRole(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("roles.manage");
  const labelRaw = String(form.get("label") ?? "").trim();
  if (!labelRaw) redirect("/admin/roles?tab=definitions&edit=new&error=missing");

  const nameRaw = String(form.get("name") ?? "").trim();
  const name = nameRaw
    ? nameRaw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40)
    : labelRaw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);

  const actions = ACTIONS.filter((action) => form.get(`action_${action}`) === "on");
  const { result } = await createTenantRole(db, name, labelRaw, [...actions], `user:${user.id}`);

  if (result === "name_taken") redirect("/admin/roles?tab=definitions&edit=new&error=name_taken");
  redirect("/admin/roles?tab=definitions&saved=1");
}

export async function updateRole(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("roles.manage");
  const id = String(form.get("id") ?? "");
  const label = String(form.get("label") ?? "").trim();
  if (!label || !id) redirect("/admin/roles?tab=definitions&error=missing");

  const actions = ACTIONS.filter((action) => form.get(`action_${action}`) === "on");
  const result = await updateTenantRole(db, id, label, [...actions], `user:${user.id}`);

  if (result === "missing") redirect("/admin/roles?tab=definitions&error=missing");
  redirect("/admin/roles?tab=definitions&saved=1");
}

export async function archiveRole(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("roles.manage");
  const id = String(form.get("id") ?? "");
  const result = await archiveTenantRole(db, id, `user:${user.id}`);

  if (result !== "archived") redirect(`/admin/roles?tab=definitions&error=${result}`);
  redirect("/admin/roles?tab=definitions&saved=1");
}

export async function unarchiveRole(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("roles.manage");
  const id = String(form.get("id") ?? "");
  const result = await unarchiveTenantRole(db, id, `user:${user.id}`);

  if (result === "missing") redirect("/admin/roles?tab=definitions&error=missing");
  redirect("/admin/roles?tab=definitions&saved=1");
}
