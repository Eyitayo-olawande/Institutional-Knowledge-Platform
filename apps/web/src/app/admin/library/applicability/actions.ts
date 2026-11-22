"use server";

import { addItemApplicabilityRule, removeItemApplicabilityRule } from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../../server/session.ts";

const ID = /^[0-9a-f-]{36}$/;

function optionalId(form: FormData, name: string): string | null {
  const v = form.get(name);
  if (typeof v !== "string" || v === "") return null;
  if (!ID.test(v)) throw new Error(`Invalid ${name}`);
  return v;
}

export async function addRuleAction(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("library.edit");
  const itemId = optionalId(form, "itemId");
  if (!itemId) redirect("/admin/library/applicability");
  const departmentId = optionalId(form, "departmentId");
  const roleLevelId = optionalId(form, "roleLevelId");
  const unitId = optionalId(form, "unitId");
  await addItemApplicabilityRule(db, { itemId, departmentId, roleLevelId, unitId }, `user:${user.id}`);
  redirect(`/admin/library/applicability?item=${itemId}`);
}

export async function removeRuleAction(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("library.edit");
  const ruleId = optionalId(form, "ruleId");
  const itemId = optionalId(form, "itemId");
  if (ruleId) await removeItemApplicabilityRule(db, ruleId, `user:${user.id}`);
  redirect(itemId ? `/admin/library/applicability?item=${itemId}` : "/admin/library/applicability");
}
