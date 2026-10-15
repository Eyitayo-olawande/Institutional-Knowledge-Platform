"use server";

import { changeUserRoles, listUsers } from "@mantle/db/tenant";
import { formatRoles, isRole, ROLES, type Role } from "@mantle/platform/identity";
import { notify } from "@mantle/platform/notifications";
import { t } from "../../../i18n.ts";
import { mailer } from "../../../server/auth.ts";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../server/session.ts";

export async function saveRoles(form: FormData): Promise<void> {
  const { db, user, tenant } = await requirePermission("roles.manage");
  const userId = String(form.get("userId") ?? "");
  if (!(await listUsers(db)).some((u) => u.id === userId)) redirect("/admin/roles?error=unknown_person");
  const chosen = ROLES.filter((role) => form.get(`role_${role}`) === "on");
  const roles = new Set<Role>(chosen.filter(isRole));
  // Nobody can remove their own administrator role and lock everyone out.
  if (userId === user.id && !roles.has("learning_administrator")) redirect("/admin/roles?error=own_admin");
  const before = (await listUsers(db)).find((u) => u.id === userId)?.roles;
  const after = formatRoles(roles);
  await changeUserRoles(db, userId, after, `user:${user.id}`);
  if (before !== after) {
    await notify(db, mailer, {
      event: "roles.changed",
      userIds: [userId],
      params: { organisation: tenant.name, roles: [...roles].map((r) => t(`roles.names.${r}`)).join(", ") || t("roles.none") },
    });
  }
  redirect("/admin/roles?saved=1");
}
