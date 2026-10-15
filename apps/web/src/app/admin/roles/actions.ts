"use server";

import { changeUserRoles, listUsers } from "@mantle/db/tenant";
import { formatRoles, isRole, ROLES, type Role } from "@mantle/platform/identity";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../server/session.ts";

export async function saveRoles(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("roles.manage");
  const userId = String(form.get("userId") ?? "");
  if (!(await listUsers(db)).some((u) => u.id === userId)) redirect("/admin/roles?error=unknown_person");
  const chosen = ROLES.filter((role) => form.get(`role_${role}`) === "on");
  const roles = new Set<Role>(chosen.filter(isRole));
  // Nobody can remove their own administrator role and lock everyone out.
  if (userId === user.id && !roles.has("learning_administrator")) redirect("/admin/roles?error=own_admin");
  await changeUserRoles(db, userId, formatRoles(roles), `user:${user.id}`);
  redirect("/admin/roles?saved=1");
}
