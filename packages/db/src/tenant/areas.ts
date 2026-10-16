import { and, asc, eq, inArray } from "drizzle-orm";
import { recordActivity } from "./activity.ts";
import type { TenantDb } from "./client.ts";
import { areaAccessGrants, contentTypes, departments, learningAreas, libraryItems, people } from "./schema.ts";

// Learning areas and content types (work package E5, learning areas).

export type AreaKind = "common" | "department";

// Default content types (Blueprint v3.1, section 3). The industry template
// (E7) will set these per tenant; migration 0008 loads this same list, and
// a test keeps the two in step.
export const DEFAULT_CONTENT_TYPES: Readonly<Record<AreaKind, readonly { key: string; label: string }[]>> = {
  common: [
    { key: "leadership", label: "Leadership and management" },
    { key: "workplace_skills", label: "Organisational and workplace skills" },
    { key: "communication", label: "Communication and business etiquette" },
    { key: "culture", label: "Company history, culture and core values" },
    { key: "customer_service", label: "Customer service" },
    { key: "performance", label: "Performance management" },
    { key: "compliance", label: "Regulatory and compliance, including AML/CFT" },
    { key: "security", label: "Information and cybersecurity awareness" },
    { key: "mandatory", label: "Health, safety and other mandatory training" },
    { key: "other", label: "Other organisation wide materials" },
  ],
  department: [
    { key: "procedures", label: "Policies and procedures" },
    { key: "manuals", label: "Manuals and guides" },
    { key: "reference", label: "Technical and reference materials" },
    { key: "training", label: "Training materials" },
    { key: "other", label: "Other department resources" },
  ],
};

type Tx = Parameters<Parameters<TenantDb["transaction"]>[0]>[0];
type Db = TenantDb | Tx;

export interface LearningArea {
  readonly id: string;
  readonly kind: AreaKind;
  readonly departmentId: string | null;
  // The department's name for a department area; null for Common.
  readonly departmentName: string | null;
}

// Common first, then departments by name.
export async function listAreas(db: Db): Promise<LearningArea[]> {
  const rows = await db
    .select({ id: learningAreas.id, kind: learningAreas.kind, departmentId: learningAreas.departmentId, departmentName: departments.name })
    .from(learningAreas)
    .leftJoin(departments, eq(learningAreas.departmentId, departments.id));
  return rows.sort((a, b) => (a.kind === b.kind ? (a.departmentName ?? "").localeCompare(b.departmentName ?? "") : a.kind === "common" ? -1 : 1));
}

export async function listContentTypes(db: Db) {
  return db
    .select({ id: contentTypes.id, areaKind: contentTypes.areaKind, key: contentTypes.key, label: contentTypes.label })
    .from(contentTypes)
    .orderBy(asc(contentTypes.areaKind), asc(contentTypes.rank));
}

// Gives a new department its Department Learning area.
export async function ensureDepartmentArea(db: Db, departmentId: string, actor: string): Promise<void> {
  const created = await db
    .insert(learningAreas)
    .values({ kind: "department", departmentId, changedBy: actor })
    .onConflictDoNothing()
    .returning({ id: learningAreas.id });
  const area = created[0];
  if (area) await recordActivity(db, { actor, action: "areas.created", entityType: "learning_area", entityId: area.id, details: { department_id: departmentId } });
}

// When two departments are merged, the removed department's items and
// grants move to the kept department's area.
export async function mergeDepartmentAreas(tx: Tx, fromDepartmentId: string, toDepartmentId: string, actor: string): Promise<void> {
  const [from] = await tx.select().from(learningAreas).where(eq(learningAreas.departmentId, fromDepartmentId));
  if (!from) return;
  await ensureDepartmentArea(tx, toDepartmentId, actor);
  const [to] = await tx.select().from(learningAreas).where(eq(learningAreas.departmentId, toDepartmentId));
  if (!to) throw new Error("The kept department has no learning area.");
  const now = new Date();
  await tx.update(libraryItems).set({ areaId: to.id, updatedAt: now, changedBy: actor }).where(eq(libraryItems.areaId, from.id));
  for (const grant of await tx.select().from(areaAccessGrants).where(eq(areaAccessGrants.areaId, from.id))) {
    await tx.insert(areaAccessGrants).values({ areaId: to.id, personId: grant.personId, changedBy: actor }).onConflictDoNothing();
  }
  await tx.delete(areaAccessGrants).where(eq(areaAccessGrants.areaId, from.id));
  await tx.delete(learningAreas).where(eq(learningAreas.id, from.id));
}

// The areas someone may see: "all" for those who manage every area,
// otherwise Common, their own department's area and any granted to them.
// Checked on the server for every library read.
export type VisibleAreas = "all" | readonly string[];

export async function visibleAreas(db: TenantDb, viewer: { userId: string; allAreas: boolean }): Promise<VisibleAreas> {
  if (viewer.allAreas) return "all";
  const areas = await db.select({ id: learningAreas.id, kind: learningAreas.kind, departmentId: learningAreas.departmentId }).from(learningAreas);
  const ids = new Set(areas.filter((a) => a.kind === "common").map((a) => a.id));
  const [person] = await db
    .select({ id: people.id, departmentId: people.departmentId })
    .from(people)
    .where(and(eq(people.userId, viewer.userId), eq(people.status, "active")));
  if (person) {
    for (const a of areas) if (person.departmentId && a.departmentId === person.departmentId) ids.add(a.id);
    for (const g of await db.select({ areaId: areaAccessGrants.areaId }).from(areaAccessGrants).where(eq(areaAccessGrants.personId, person.id))) {
      ids.add(g.areaId);
    }
  }
  return [...ids];
}

export function canSeeArea(visible: VisibleAreas, areaId: string): boolean {
  return visible === "all" || visible.includes(areaId);
}

export interface AreaGrant {
  readonly areaId: string;
  readonly personId: string;
  readonly fullName: string;
  readonly workEmail: string;
}

export async function listAreaGrants(db: TenantDb): Promise<AreaGrant[]> {
  return db
    .select({ areaId: areaAccessGrants.areaId, personId: people.id, fullName: people.fullName, workEmail: people.workEmail })
    .from(areaAccessGrants)
    .innerJoin(people, eq(areaAccessGrants.personId, people.id))
    .orderBy(asc(people.fullName));
}

export async function grantAreaAccess(db: TenantDb, areaId: string, personId: string, actor: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [area] = await tx.select().from(learningAreas).where(eq(learningAreas.id, areaId));
    if (!area || area.kind !== "department") return false;
    const added = await tx.insert(areaAccessGrants).values({ areaId, personId, changedBy: actor }).onConflictDoNothing().returning({ id: areaAccessGrants.id });
    if (added.length > 0) await recordActivity(tx, { actor, action: "areas.access_granted", entityType: "learning_area", entityId: areaId, details: { person_id: personId } });
    return true;
  });
}

export async function revokeAreaAccess(db: TenantDb, areaId: string, personId: string, actor: string): Promise<void> {
  await db.transaction(async (tx) => {
    const removed = await tx
      .delete(areaAccessGrants)
      .where(and(eq(areaAccessGrants.areaId, areaId), eq(areaAccessGrants.personId, personId)))
      .returning({ id: areaAccessGrants.id });
    if (removed.length > 0) await recordActivity(tx, { actor, action: "areas.access_revoked", entityType: "learning_area", entityId: areaId, details: { person_id: personId } });
  });
}

// Checks a content type suits an area (Common types for Common, department
// types for department areas). False when either is unknown.
export async function checkPlacement(db: Db, areaId: string, contentTypeId: string): Promise<boolean> {
  const [area] = await db.select({ kind: learningAreas.kind }).from(learningAreas).where(eq(learningAreas.id, areaId));
  const [type] = await db.select({ kind: contentTypes.areaKind }).from(contentTypes).where(eq(contentTypes.id, contentTypeId));
  return Boolean(area && type && area.kind === type.kind);
}

export async function commonArea(db: Db): Promise<string> {
  const [row] = await db.select({ id: learningAreas.id }).from(learningAreas).where(eq(learningAreas.kind, "common"));
  if (!row) throw new Error("Common Staff Learning is missing.");
  return row.id;
}

export async function contentTypeByKey(db: Db, kind: AreaKind, key: string): Promise<string | null> {
  const [row] = await db
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(and(eq(contentTypes.areaKind, kind), eq(contentTypes.key, key)));
  return row?.id ?? null;
}

export async function departmentArea(db: Db, departmentId: string): Promise<string | null> {
  const [row] = await db.select({ id: learningAreas.id }).from(learningAreas).where(eq(learningAreas.departmentId, departmentId));
  return row?.id ?? null;
}

export function areaIdsOrAll(visible: VisibleAreas) {
  return visible === "all" ? undefined : inArray(libraryItems.areaId, visible.length ? [...visible] : ["00000000-0000-0000-0000-000000000000"]);
}
