import { and, asc, count, eq, max, sql } from "drizzle-orm";
import { recordActivity } from "./activity.ts";
import type { TenantDb } from "./client.ts";
import { departments, employmentEvents, locations, people, roleLevels, structureNames, units } from "./schema.ts";

// Organisation structure records (work package E4, structure records).

export type StructureKind = "department" | "unit" | "location" | "role_level";
export const STRUCTURE_KINDS: readonly StructureKind[] = ["department", "unit", "location", "role_level"];

export function isStructureKind(value: string): value is StructureKind {
  return (STRUCTURE_KINDS as readonly string[]).includes(value);
}

// A name as shown: trimmed, with runs of spaces made single.
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

// The form names are matched on: "  Claims   DEPT " and "claims dept" match.
// The migration that copied the old department text uses the same rule.
export function nameKey(name: string): string {
  return cleanName(name).toLowerCase();
}

type Tx = Parameters<Parameters<TenantDb["transaction"]>[0]>[0];
type Db = TenantDb | Tx;

const TABLES = { department: departments, unit: units, location: locations, role_level: roleLevels } as const;
const PERSON_COLUMN = {
  department: people.departmentId,
  unit: people.unitId,
  location: people.locationId,
  role_level: people.roleLevelId,
} as const;
const PERSON_FIELD = { department: "departmentId", unit: "unitId", location: "locationId", role_level: "roleLevelId" } as const;

async function findByName(db: Db, kind: StructureKind, name: string, scope = ""): Promise<string | null> {
  const [row] = await db
    .select({ id: structureNames.entryId })
    .from(structureNames)
    .where(and(eq(structureNames.kind, kind), eq(structureNames.scope, scope), eq(structureNames.nameKey, nameKey(name))));
  return row?.id ?? null;
}

async function addName(db: Db, kind: StructureKind, name: string, entryId: string, changedBy: string, scope = ""): Promise<void> {
  await db.insert(structureNames).values({ kind, scope, nameKey: nameKey(name), entryId, changedBy }).onConflictDoNothing();
}

// Finds or creates the entries named in staff file rows, for one import.
// Lookups are cached so a file of thousands of rows costs one query per
// distinct name.
export function structureResolver(tx: Tx, changedBy: string) {
  const cache = new Map<string, string>();

  async function resolve(kind: StructureKind, raw: string | null, scope = ""): Promise<string | null> {
    const name = raw ? cleanName(raw) : "";
    if (!name) return null;
    const cacheKey = `${kind}|${scope}|${nameKey(name)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    let id = await findByName(tx, kind, name, scope);
    if (!id) {
      id = await create(kind, name, scope);
      await addName(tx, kind, name, id, changedBy, scope);
      await recordActivity(tx, { actor: changedBy, action: "structure.created", entityType: kind, entityId: id, details: { name } });
    }
    cache.set(cacheKey, id);
    return id;
  }

  async function create(kind: StructureKind, name: string, scope: string): Promise<string> {
    const audit = { name, changedBy };
    const rows =
      kind === "department"
        ? await tx.insert(departments).values(audit).returning({ id: departments.id })
        : kind === "unit"
          ? await tx.insert(units).values({ ...audit, departmentId: scope }).returning({ id: units.id })
          : kind === "location"
            ? await tx.insert(locations).values(audit).returning({ id: locations.id })
            : await tx
                .insert(roleLevels)
                .values({ ...audit, rank: ((await tx.select({ top: max(roleLevels.rank) }).from(roleLevels))[0]?.top ?? 0) + 1 })
                .returning({ id: roleLevels.id });
    const id = rows[0]?.id;
    if (!id) throw new Error(`The ${kind} was not created.`);
    return id;
  }

  return {
    async forRow(row: { department: string | null; unit?: string | null; location?: string | null; roleLevel?: string | null }) {
      const departmentId = await resolve("department", row.department);
      // A unit belongs to a department, so a unit without one is not linked.
      const unitId = departmentId ? await resolve("unit", row.unit ?? null, departmentId) : null;
      return {
        departmentId,
        unitId,
        locationId: await resolve("location", row.location ?? null),
        roleLevelId: await resolve("role_level", row.roleLevel ?? null),
      };
    },
  };
}

export interface StructureEntry {
  readonly id: string;
  readonly name: string;
  readonly people: number;
  // Units only: the department the unit belongs to.
  readonly departmentId?: string;
  readonly departmentName?: string;
  // Role levels only.
  readonly rank?: number;
}

// One kind of entry with the number of active people linked to each.
export async function listStructure(db: TenantDb, kind: StructureKind): Promise<StructureEntry[]> {
  const column = PERSON_COLUMN[kind];
  const counts = new Map(
    (
      await db
        .select({ id: column, n: count() })
        .from(people)
        .where(and(eq(people.status, "active"), sql`${column} is not null`))
        .groupBy(column)
    ).map((r) => [r.id, r.n]),
  );
  const n = (id: string) => counts.get(id) ?? 0;
  if (kind === "unit") {
    const rows = await db
      .select({ id: units.id, name: units.name, departmentId: units.departmentId, departmentName: departments.name })
      .from(units)
      .innerJoin(departments, eq(units.departmentId, departments.id))
      .orderBy(asc(departments.name), asc(units.name));
    return rows.map((r) => ({ ...r, people: n(r.id) }));
  }
  if (kind === "role_level") {
    const rows = await db.select({ id: roleLevels.id, name: roleLevels.name, rank: roleLevels.rank }).from(roleLevels).orderBy(asc(roleLevels.rank));
    return rows.map((r) => ({ ...r, people: n(r.id) }));
  }
  const table = TABLES[kind];
  const rows = await db.select({ id: table.id, name: table.name }).from(table).orderBy(asc(table.name));
  return rows.map((r) => ({ ...r, people: n(r.id) }));
}

async function entry(tx: Db, kind: StructureKind, id: string): Promise<{ id: string; name: string; departmentId?: string } | null> {
  if (kind === "unit") {
    const [row] = await tx.select({ id: units.id, name: units.name, departmentId: units.departmentId }).from(units).where(eq(units.id, id));
    return row ?? null;
  }
  const table = TABLES[kind];
  const [row] = await tx.select({ id: table.id, name: table.name }).from(table).where(eq(table.id, id));
  return row ?? null;
}

export type RenameResult = "renamed" | "unchanged" | "name_taken" | "missing";

// Renames an entry. The old name still matches it on later imports. A name
// already used by another entry is refused: merge them instead.
export async function renameStructure(db: TenantDb, kind: StructureKind, id: string, newName: string, actor: string): Promise<RenameResult> {
  const name = cleanName(newName);
  if (!name) return "unchanged";
  return db.transaction(async (tx) => {
    const found = await entry(tx, kind, id);
    if (!found) return "missing";
    if (found.name === name) return "unchanged";
    const scope = found.departmentId ?? "";
    const owner = await findByName(tx, kind, name, scope);
    if (owner && owner !== id) return "name_taken";
    const table = TABLES[kind];
    await tx.update(table).set({ name, updatedAt: new Date(), changedBy: actor }).where(eq(table.id, id));
    await addName(tx, kind, name, id, actor, scope);
    await recordActivity(tx, { actor, action: "structure.renamed", entityType: kind, entityId: id, details: { from: found.name, to: name } });
    return "renamed";
  });
}

export type MergeResult = "merged" | "same" | "missing" | "different_department";

// Merges one entry into another that means the same thing. People, history
// and every name the removed entry answered to move to the kept entry.
export async function mergeStructure(db: TenantDb, kind: StructureKind, removeId: string, keepId: string, actor: string): Promise<MergeResult> {
  if (removeId === keepId) return "same";
  return db.transaction(async (tx) => {
    const removed = await entry(tx, kind, removeId);
    const kept = await entry(tx, kind, keepId);
    if (!removed || !kept) return "missing";
    if (kind === "unit" && removed.departmentId !== kept.departmentId) return "different_department";
    const moved = await moveEntry(tx, kind, removeId, keepId, actor);
    await recordActivity(tx, {
      actor,
      action: "structure.merged",
      entityType: kind,
      entityId: keepId,
      details: { from: { id: removeId, name: removed.name }, into: { id: keepId, name: kept.name }, people: moved },
    });
    return "merged";
  });
}

// Moves everything from one entry to another and removes the first.
// Returns the number of people moved.
async function moveEntry(tx: Tx, kind: StructureKind, fromId: string, toId: string, actor: string): Promise<number> {
  const now = new Date();
  const column = PERSON_COLUMN[kind];
  const movedPeople = await tx
    .update(people)
    .set({ [PERSON_FIELD[kind]]: toId, updatedAt: now, changedBy: actor })
    .where(eq(column, fromId))
    .returning({ id: people.id });

  if (kind === "department") {
    await tx.update(employmentEvents).set({ fromDepartmentId: toId }).where(eq(employmentEvents.fromDepartmentId, fromId));
    await tx.update(employmentEvents).set({ toDepartmentId: toId }).where(eq(employmentEvents.toDepartmentId, fromId));
    // Units come along; a unit whose name the kept department already uses
    // is merged into that unit.
    for (const unit of await tx.select().from(units).where(eq(units.departmentId, fromId))) {
      const twin = await findByName(tx, "unit", unit.name, toId);
      if (twin) {
        await moveEntry(tx, "unit", unit.id, twin, actor);
      } else {
        await tx.update(units).set({ departmentId: toId, updatedAt: now, changedBy: actor }).where(eq(units.id, unit.id));
        await moveNames(tx, "unit", unit.id, unit.id, actor, toId);
      }
    }
  }

  const scope = kind === "unit" ? ((await entry(tx, "unit", toId))?.departmentId ?? "") : "";
  await moveNames(tx, kind, fromId, toId, actor, scope);
  const table = TABLES[kind];
  await tx.delete(table).where(eq(table.id, fromId));
  return movedPeople.length;
}

// Points an entry's names at another entry (and scope), dropping any the
// target already answers to.
async function moveNames(tx: Tx, kind: StructureKind, fromId: string, toId: string, actor: string, toScope: string): Promise<void> {
  const names = await tx
    .select({ nameKey: structureNames.nameKey })
    .from(structureNames)
    .where(and(eq(structureNames.kind, kind), eq(structureNames.entryId, fromId)));
  await tx.delete(structureNames).where(and(eq(structureNames.kind, kind), eq(structureNames.entryId, fromId)));
  if (names.length === 0) return;
  await tx
    .insert(structureNames)
    .values(names.map((n) => ({ kind, scope: toScope, nameKey: n.nameKey, entryId: toId, changedBy: actor })))
    .onConflictDoNothing();
}

// Moves a role level one place in the order: up towards rank 1 (the most
// junior), down towards the most senior. The page lists levels by rank.
export async function moveRoleLevel(db: TenantDb, id: string, direction: "up" | "down", actor: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const levels = await tx.select().from(roleLevels).orderBy(asc(roleLevels.rank));
    const i = levels.findIndex((l) => l.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    const a = levels[i];
    const b = levels[j];
    if (!a || !b) return false;
    const now = new Date();
    await tx.update(roleLevels).set({ rank: b.rank, updatedAt: now, changedBy: actor }).where(eq(roleLevels.id, a.id));
    await tx.update(roleLevels).set({ rank: a.rank, updatedAt: now, changedBy: actor }).where(eq(roleLevels.id, b.id));
    await recordActivity(tx, { actor, action: "structure.reordered", entityType: "role_level", entityId: id, details: { name: a.name, from: a.rank, to: b.rank } });
    return true;
  });
}
