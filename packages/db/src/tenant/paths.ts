import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { recordActivity } from "./activity.ts";
import type { TenantDb } from "./client.ts";
import { assignmentRules, assignments, libraryItems, moduleItems, modules, moduleProgress, pathStages, paths, stageModules } from "./schema.ts";

// Learning paths (work package E8, Blueprint v3.1 section 5). A path has
// four fixed stages; a module sits in one or more stages across one or
// more paths and is completed once for all of them.

export const STAGE_ORDER = ["common", "department", "role", "certificate"] as const;
export type StageKind = (typeof STAGE_ORDER)[number];

export const DEFAULT_DUE_DAYS: Readonly<Record<StageKind, number>> = {
  common: 14,
  department: 42,
  role: 70,
  certificate: 90,
};

type Tx = Parameters<Parameters<TenantDb["transaction"]>[0]>[0];
type Db = TenantDb | Tx;

// ----------------------------------------------------- pure, testable -----

// Adds whole days to a YYYY-MM-DD date, in UTC so the day does not shift
// with the server's local time zone.
export function addDays(date: string, days: number): Date {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export type PathStatus = "not_started" | "in_progress" | "due_soon" | "overdue" | "completed";

export function computePathStatus(input: {
  readonly stages: readonly { readonly kind: StageKind; readonly dueDate: Date; readonly complete: boolean }[];
  readonly anyModuleComplete: boolean;
  readonly today?: Date;
}): PathStatus {
  const today = input.today ?? new Date();
  const ordered = STAGE_ORDER.map((k) => input.stages.find((s) => s.kind === k)).filter((s): s is NonNullable<typeof s> => s !== undefined);
  const current = ordered.find((s) => !s.complete);
  if (!current) return "completed";
  const daysUntilDue = Math.ceil((current.dueDate.getTime() - today.getTime()) / 86_400_000);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 7) return "due_soon";
  return input.anyModuleComplete ? "in_progress" : "not_started";
}

// A stage is reachable once every stage before it (in STAGE_ORDER) is
// complete; a stage with no modules yet does not block the ones after it.
export function isStageUnlocked(stages: readonly { readonly kind: StageKind; readonly complete: boolean }[], kind: StageKind): boolean {
  const idx = STAGE_ORDER.indexOf(kind);
  for (let i = 0; i < idx; i++) {
    const prior = stages.find((s) => s.kind === STAGE_ORDER[i]);
    if (prior && !prior.complete) return false;
  }
  return true;
}

// --------------------------------------------------------- path builder ---

export async function createPath(db: Db, input: { name: string; departmentId: string | null }, actor: string): Promise<string> {
  const [row] = await db.insert(paths).values({ name: input.name, departmentId: input.departmentId, changedBy: actor }).returning({ id: paths.id });
  if (!row) throw new Error("Path was not created.");
  await db.insert(pathStages).values(STAGE_ORDER.map((kind) => ({ pathId: row.id, kind, dueDays: DEFAULT_DUE_DAYS[kind], changedBy: actor })));
  await recordActivity(db, { actor, action: "paths.created", entityType: "path", entityId: row.id, details: { name: input.name } });
  return row.id;
}

export async function listPaths(db: TenantDb) {
  return db.select({ id: paths.id, name: paths.name, departmentId: paths.departmentId }).from(paths).orderBy(asc(paths.name));
}

export interface BuilderStage {
  readonly stageId: string;
  readonly kind: StageKind;
  readonly dueDays: number;
  readonly modules: readonly { id: string; title: string }[];
}

export async function getPathBuilder(db: TenantDb, pathId: string): Promise<{ path: { id: string; name: string; departmentId: string | null }; stages: BuilderStage[] } | null> {
  const [path] = await db.select({ id: paths.id, name: paths.name, departmentId: paths.departmentId }).from(paths).where(eq(paths.id, pathId));
  if (!path) return null;
  const stageRows = await db.select().from(pathStages).where(eq(pathStages.pathId, pathId));
  const stageIds = stageRows.map((s) => s.id);
  const moduleRows = stageIds.length
    ? await db
        .select({ stageId: stageModules.stageId, moduleId: modules.id, title: modules.title, rank: stageModules.rank })
        .from(stageModules)
        .innerJoin(modules, eq(stageModules.moduleId, modules.id))
        .where(inArray(stageModules.stageId, stageIds))
        .orderBy(asc(stageModules.rank))
    : [];
  const stages = STAGE_ORDER.map((kind) => {
    const s = stageRows.find((x) => x.kind === kind);
    if (!s) throw new Error(`Path ${pathId} is missing its ${kind} stage.`);
    return { stageId: s.id, kind, dueDays: s.dueDays, modules: moduleRows.filter((m) => m.stageId === s.id).map((m) => ({ id: m.moduleId, title: m.title })) };
  });
  return { path, stages };
}

export async function setStageDueDays(db: TenantDb, stageId: string, dueDays: number, actor: string): Promise<void> {
  await db.update(pathStages).set({ dueDays, updatedAt: new Date(), changedBy: actor }).where(eq(pathStages.id, stageId));
  await recordActivity(db, { actor, action: "paths.due_days_changed", entityType: "path_stage", entityId: stageId, details: { due_days: dueDays } });
}

export async function createModule(db: TenantDb, title: string, actor: string): Promise<string> {
  const [row] = await db.insert(modules).values({ title, changedBy: actor }).returning({ id: modules.id });
  if (!row) throw new Error("Module was not created.");
  await recordActivity(db, { actor, action: "paths.module_created", entityType: "module", entityId: row.id, details: { title } });
  return row.id;
}

export async function listModules(db: TenantDb) {
  return db.select({ id: modules.id, title: modules.title }).from(modules).orderBy(asc(modules.title));
}

async function nextRank(db: TenantDb, table: typeof stageModules | typeof moduleItems, column: "stageId" | "moduleId", value: string): Promise<number> {
  const rankCol = table === stageModules ? stageModules.rank : moduleItems.rank;
  const whereCol = table === stageModules ? (column === "stageId" ? stageModules.stageId : stageModules.moduleId) : moduleItems.moduleId;
  const [row] = await db.select({ max: sql<number>`coalesce(max(${rankCol}), 0)` }).from(table).where(eq(whereCol, value));
  return (row?.max ?? 0) + 1;
}

export async function addModuleToStage(db: TenantDb, stageId: string, moduleId: string, actor: string): Promise<void> {
  const rank = await nextRank(db, stageModules, "stageId", stageId);
  await db.insert(stageModules).values({ stageId, moduleId, rank, changedBy: actor }).onConflictDoNothing();
  await recordActivity(db, { actor, action: "paths.module_added", entityType: "path_stage", entityId: stageId, details: { module_id: moduleId } });
}

export async function removeModuleFromStage(db: TenantDb, stageId: string, moduleId: string, actor: string): Promise<void> {
  await db.delete(stageModules).where(and(eq(stageModules.stageId, stageId), eq(stageModules.moduleId, moduleId)));
  await recordActivity(db, { actor, action: "paths.module_removed", entityType: "path_stage", entityId: stageId, details: { module_id: moduleId } });
}

// Buttons to move up and down are enough for version 1 (Out of scope: drag and drop).
export async function moveStageModule(db: TenantDb, stageId: string, moduleId: string, direction: "up" | "down", actor: string): Promise<void> {
  const rows = await db.select().from(stageModules).where(eq(stageModules.stageId, stageId)).orderBy(asc(stageModules.rank));
  const idx = rows.findIndex((r) => r.moduleId === moduleId);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= rows.length) return;
  const a = rows[idx];
  const b = rows[swapWith];
  if (!a || !b) return;
  await db.update(stageModules).set({ rank: b.rank }).where(and(eq(stageModules.stageId, stageId), eq(stageModules.moduleId, a.moduleId)));
  await db.update(stageModules).set({ rank: a.rank }).where(and(eq(stageModules.stageId, stageId), eq(stageModules.moduleId, b.moduleId)));
  await recordActivity(db, { actor, action: "paths.module_reordered", entityType: "path_stage", entityId: stageId, details: { module_id: moduleId, direction } });
}

export async function addItemToModule(db: TenantDb, moduleId: string, itemId: string, actor: string): Promise<void> {
  const rank = await nextRank(db, moduleItems, "moduleId", moduleId);
  await db.insert(moduleItems).values({ moduleId, itemId, rank, changedBy: actor }).onConflictDoNothing();
  await recordActivity(db, { actor, action: "paths.item_added", entityType: "module", entityId: moduleId, details: { item_id: itemId } });
}

export async function removeItemFromModule(db: TenantDb, moduleId: string, itemId: string, actor: string): Promise<void> {
  await db.delete(moduleItems).where(and(eq(moduleItems.moduleId, moduleId), eq(moduleItems.itemId, itemId)));
  await recordActivity(db, { actor, action: "paths.item_removed", entityType: "module", entityId: moduleId, details: { item_id: itemId } });
}

export async function listModuleItems(db: TenantDb, moduleId: string) {
  return db
    .select({ id: libraryItems.id, title: libraryItems.title, rank: moduleItems.rank })
    .from(moduleItems)
    .innerJoin(libraryItems, eq(moduleItems.itemId, libraryItems.id))
    .where(eq(moduleItems.moduleId, moduleId))
    .orderBy(asc(moduleItems.rank));
}

// ----------------------------------------------------- assignment rules ---

export interface AssignmentRule {
  readonly id: string;
  readonly pathId: string;
  readonly departmentId: string | null;
  readonly roleLevelId: string | null;
  readonly unitId: string | null;
}

export async function setAssignmentRule(
  db: TenantDb,
  input: { pathId: string; departmentId: string | null; roleLevelId: string | null; unitId: string | null },
  actor: string,
): Promise<string> {
  const [row] = await db.insert(assignmentRules).values({ ...input, changedBy: actor }).returning({ id: assignmentRules.id });
  if (!row) throw new Error("Assignment rule was not created.");
  await recordActivity(db, { actor, action: "paths.rule_added", entityType: "path", entityId: input.pathId, details: {} });
  return row.id;
}

export async function listAssignmentRules(db: TenantDb, pathId: string): Promise<AssignmentRule[]> {
  return db
    .select({ id: assignmentRules.id, pathId: assignmentRules.pathId, departmentId: assignmentRules.departmentId, roleLevelId: assignmentRules.roleLevelId, unitId: assignmentRules.unitId })
    .from(assignmentRules)
    .where(eq(assignmentRules.pathId, pathId));
}

export async function removeAssignmentRule(db: TenantDb, ruleId: string, actor: string): Promise<void> {
  const [rule] = await db.select({ pathId: assignmentRules.pathId }).from(assignmentRules).where(eq(assignmentRules.id, ruleId));
  await db.delete(assignmentRules).where(eq(assignmentRules.id, ruleId));
  if (rule) await recordActivity(db, { actor, action: "paths.rule_removed", entityType: "path", entityId: rule.pathId, details: {} });
}

// Runs when a joiner is recorded by the staff import (acceptance criterion
// 3: importing a Claims Officer joiner assigns the Claims Officer path with
// due dates from the start date). A rule with a null column matches any
// value in that column, so a company wide path uses a rule with every
// column null.
export async function assignOnJoin(
  db: Db,
  input: { personId: string; departmentId: string | null; roleLevelId: string | null; unitId: string | null; startDate: string },
  actor: string,
): Promise<void> {
  const rules = await db.select().from(assignmentRules);
  const matchingPathIds = new Set(
    rules
      .filter(
        (r) =>
          (r.departmentId === null || r.departmentId === input.departmentId) &&
          (r.roleLevelId === null || r.roleLevelId === input.roleLevelId) &&
          (r.unitId === null || r.unitId === input.unitId),
      )
      .map((r) => r.pathId),
  );
  for (const pathId of matchingPathIds) {
    const inserted = await db
      .insert(assignments)
      .values({ pathId, personId: input.personId, startDate: input.startDate, changedBy: actor })
      .onConflictDoNothing()
      .returning({ id: assignments.id });
    if (inserted.length > 0) {
      await recordActivity(db, { actor, action: "paths.assigned", entityType: "person", entityId: input.personId, details: { path_id: pathId } });
    }
  }
}

// ------------------------------------------------------- learner's view ---

export interface AssignmentStageView {
  readonly stageId: string;
  readonly kind: StageKind;
  readonly dueDate: Date;
  readonly modules: readonly { id: string; title: string; completed: boolean }[];
  readonly complete: boolean;
  readonly unlocked: boolean;
}

export interface AssignmentView {
  readonly assignmentId: string;
  readonly pathId: string;
  readonly pathName: string;
  readonly startDate: string;
  readonly stages: readonly AssignmentStageView[];
  readonly status: PathStatus;
}

export async function personAssignments(db: TenantDb, personId: string, today = new Date()): Promise<AssignmentView[]> {
  const rows = await db
    .select({ assignmentId: assignments.id, pathId: assignments.pathId, pathName: paths.name, startDate: assignments.startDate })
    .from(assignments)
    .innerJoin(paths, eq(paths.id, assignments.pathId))
    .where(eq(assignments.personId, personId));
  if (rows.length === 0) return [];

  const pathIds = [...new Set(rows.map((r) => r.pathId))];
  const stageRows = await db.select().from(pathStages).where(inArray(pathStages.pathId, pathIds));
  const stageIds = stageRows.map((s) => s.id);
  const moduleRows = stageIds.length
    ? await db
        .select({ stageId: stageModules.stageId, moduleId: modules.id, title: modules.title })
        .from(stageModules)
        .innerJoin(modules, eq(stageModules.moduleId, modules.id))
        .where(inArray(stageModules.stageId, stageIds))
        .orderBy(asc(stageModules.rank))
    : [];
  const moduleIds = [...new Set(moduleRows.map((r) => r.moduleId))];
  const progressRows = moduleIds.length ? await db.select().from(moduleProgress).where(and(eq(moduleProgress.personId, personId), inArray(moduleProgress.moduleId, moduleIds))) : [];
  const completedSet = new Set(progressRows.filter((p) => p.completedAt !== null).map((p) => p.moduleId));

  return rows.map((row): AssignmentView => {
    const myStages = stageRows.filter((s) => s.pathId === row.pathId);
    const orderedStageRows = STAGE_ORDER.map((kind) => myStages.find((s) => s.kind === kind)).filter((s): s is NonNullable<typeof s> => s !== undefined);
    let priorComplete = true;
    const stages: AssignmentStageView[] = orderedStageRows.map((s) => {
      const mods = moduleRows.filter((m) => m.stageId === s.id).map((m) => ({ id: m.moduleId, title: m.title, completed: completedSet.has(m.moduleId) }));
      const complete = mods.every((m) => m.completed);
      const unlocked = priorComplete;
      priorComplete = priorComplete && complete;
      return { stageId: s.id, kind: s.kind, dueDate: addDays(row.startDate, s.dueDays), modules: mods, complete, unlocked };
    });
    const anyModuleComplete = stages.some((s) => s.modules.some((m) => m.completed));
    const status = computePathStatus({ stages, anyModuleComplete, today });
    return { assignmentId: row.assignmentId, pathId: row.pathId, pathName: row.pathName, startDate: row.startDate, stages, status };
  });
}

export async function canCompleteModule(db: TenantDb, personId: string, moduleId: string): Promise<boolean> {
  const views = await personAssignments(db, personId);
  return views.some((v) => v.stages.some((s) => s.unlocked && s.modules.some((m) => m.id === moduleId)));
}

// "I have read this" (tests and certificates are a separate package, E9).
export async function completeModule(db: TenantDb, personId: string, moduleId: string, actor: string): Promise<boolean> {
  if (!(await canCompleteModule(db, personId, moduleId))) return false;
  const now = new Date();
  await db
    .insert(moduleProgress)
    .values({ personId, moduleId, completedAt: now, changedBy: actor })
    .onConflictDoUpdate({ target: [moduleProgress.personId, moduleProgress.moduleId], set: { completedAt: now, updatedAt: now, changedBy: actor } });
  await recordActivity(db, { actor, action: "paths.module_completed", entityType: "module", entityId: moduleId, details: { person_id: personId } });
  return true;
}

export interface MyLearningSummary {
  readonly pathsEnrolled: number;
  readonly modulesCompleted: number;
  readonly modulesTotal: number;
  readonly completionRate: number;
  readonly nextUp: { readonly moduleId: string; readonly title: string; readonly pathName: string } | null;
  readonly assignments: readonly AssignmentView[];
}

export async function myLearning(db: TenantDb, personId: string, today = new Date()): Promise<MyLearningSummary> {
  const views = await personAssignments(db, personId, today);
  const moduleDone = new Map<string, boolean>();
  for (const v of views) for (const s of v.stages) for (const m of s.modules) moduleDone.set(m.id, (moduleDone.get(m.id) ?? false) || m.completed);
  const modulesTotal = moduleDone.size;
  const modulesCompleted = [...moduleDone.values()].filter(Boolean).length;
  const completionRate = modulesTotal === 0 ? 0 : Math.round((modulesCompleted / modulesTotal) * 100);

  const sorted = [...views].sort((a, b) => {
    const aDue = a.stages.find((s) => !s.complete)?.dueDate;
    const bDue = b.stages.find((s) => !s.complete)?.dueDate;
    if (!aDue) return bDue ? 1 : 0;
    if (!bDue) return -1;
    return aDue.getTime() - bDue.getTime();
  });

  let nextUp: MyLearningSummary["nextUp"] = null;
  for (const v of sorted) {
    const stage = v.stages.find((s) => s.unlocked && !s.complete);
    const module = stage?.modules.find((m) => !m.completed);
    if (module) {
      nextUp = { moduleId: module.id, title: module.title, pathName: v.pathName };
      break;
    }
  }

  return { pathsEnrolled: views.length, modulesCompleted, modulesTotal, completionRate, nextUp, assignments: sorted };
}

export async function deletePath(db: TenantDb, pathId: string, actor: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Delete dependent rows in dependency order (no cascade on these FKs)
    const stages = await tx.select({ id: pathStages.id }).from(pathStages).where(eq(pathStages.pathId, pathId));
    const stageIds = stages.map((s) => s.id);
    if (stageIds.length > 0) await tx.delete(stageModules).where(inArray(stageModules.stageId, stageIds));
    await tx.delete(assignmentRules).where(eq(assignmentRules.pathId, pathId));
    await tx.delete(assignments).where(eq(assignments.pathId, pathId));
    await tx.delete(pathStages).where(eq(pathStages.pathId, pathId));
    await tx.delete(paths).where(eq(paths.id, pathId));
    await recordActivity(tx, { actor, action: "paths.deleted", entityType: "path", entityId: pathId, details: {} });
  });
}
