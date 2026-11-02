"use server";

import {
  addItemToModule,
  addModuleToStage,
  createModule,
  createPath,
  moveStageModule,
  removeAssignmentRule,
  removeItemFromModule,
  removeModuleFromStage,
  setAssignmentRule,
  setStageDueDays,
} from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { requireFeature, requirePermission } from "../../../server/session.ts";

const ID = /^[0-9a-f-]{36}$/;

async function builder() {
  const ctx = await requirePermission("paths.edit");
  await requireFeature(ctx.tenant, "learning_paths");
  return ctx;
}

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

function optionalId(form: FormData, name: string): string | null {
  const value = field(form, name);
  return ID.test(value) ? value : null;
}

export async function createPathAction(form: FormData): Promise<void> {
  const { db, user } = await builder();
  const name = field(form, "name");
  if (!name) redirect("/admin/paths?error=missing");
  const id = await createPath(db, { name, departmentId: optionalId(form, "departmentId") }, `user:${user.id}`);
  redirect(`/admin/paths/${id}`);
}

export async function addRuleAction(form: FormData): Promise<void> {
  const { db, user } = await builder();
  const pathId = field(form, "pathId");
  if (!ID.test(pathId)) redirect("/admin/paths");
  await setAssignmentRule(db, { pathId, departmentId: optionalId(form, "departmentId"), roleLevelId: optionalId(form, "roleLevelId"), unitId: optionalId(form, "unitId") }, `user:${user.id}`);
  redirect(`/admin/paths/${pathId}`);
}

export async function removeRuleAction(form: FormData): Promise<void> {
  const { db, user } = await builder();
  const pathId = field(form, "pathId");
  const ruleId = field(form, "ruleId");
  if (ID.test(ruleId)) await removeAssignmentRule(db, ruleId, `user:${user.id}`);
  redirect(`/admin/paths/${pathId}`);
}

export async function setDueDaysAction(form: FormData): Promise<void> {
  const { db, user } = await builder();
  const pathId = field(form, "pathId");
  const stageId = field(form, "stageId");
  const dueDays = Number(field(form, "dueDays"));
  if (ID.test(stageId) && Number.isFinite(dueDays) && dueDays > 0) await setStageDueDays(db, stageId, Math.round(dueDays), `user:${user.id}`);
  redirect(`/admin/paths/${pathId}`);
}

export async function createAndAddModuleAction(form: FormData): Promise<void> {
  const { db, user } = await builder();
  const pathId = field(form, "pathId");
  const stageId = field(form, "stageId");
  const title = field(form, "title");
  if (title && ID.test(stageId)) {
    const moduleId = await createModule(db, title, `user:${user.id}`);
    await addModuleToStage(db, stageId, moduleId, `user:${user.id}`);
  }
  redirect(`/admin/paths/${pathId}`);
}

export async function addExistingModuleAction(form: FormData): Promise<void> {
  const { db, user } = await builder();
  const pathId = field(form, "pathId");
  const stageId = field(form, "stageId");
  const moduleId = field(form, "moduleId");
  if (ID.test(stageId) && ID.test(moduleId)) await addModuleToStage(db, stageId, moduleId, `user:${user.id}`);
  redirect(`/admin/paths/${pathId}`);
}

export async function removeModuleAction(form: FormData): Promise<void> {
  const { db, user } = await builder();
  const pathId = field(form, "pathId");
  const stageId = field(form, "stageId");
  const moduleId = field(form, "moduleId");
  if (ID.test(stageId) && ID.test(moduleId)) await removeModuleFromStage(db, stageId, moduleId, `user:${user.id}`);
  redirect(`/admin/paths/${pathId}`);
}

export async function moveModuleAction(form: FormData): Promise<void> {
  const { db, user } = await builder();
  const pathId = field(form, "pathId");
  const stageId = field(form, "stageId");
  const moduleId = field(form, "moduleId");
  const direction = field(form, "direction") === "up" ? "up" : "down";
  if (ID.test(stageId) && ID.test(moduleId)) await moveStageModule(db, stageId, moduleId, direction, `user:${user.id}`);
  redirect(`/admin/paths/${pathId}`);
}

export async function addItemAction(form: FormData): Promise<void> {
  const { db, user } = await builder();
  const pathId = field(form, "pathId");
  const moduleId = field(form, "moduleId");
  const itemId = field(form, "itemId");
  if (ID.test(moduleId) && ID.test(itemId)) await addItemToModule(db, moduleId, itemId, `user:${user.id}`);
  redirect(`/admin/paths/${pathId}`);
}

export async function removeItemAction(form: FormData): Promise<void> {
  const { db, user } = await builder();
  const pathId = field(form, "pathId");
  const moduleId = field(form, "moduleId");
  const itemId = field(form, "itemId");
  if (ID.test(moduleId) && ID.test(itemId)) await removeItemFromModule(db, moduleId, itemId, `user:${user.id}`);
  redirect(`/admin/paths/${pathId}`);
}
