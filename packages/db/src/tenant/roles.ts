import { eq, isNull, sql } from "drizzle-orm";
import { recordActivity } from "./activity.ts";
import type { TenantDb } from "./client.ts";
import { tenantRoles, users } from "./schema.ts";

export interface TenantRole {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly actions: string[];
  readonly isSystem: boolean;
  readonly archived: boolean;
}

export type RoleCreateResult = "created" | "name_taken";
export type RoleUpdateResult = "updated" | "missing";
export type RoleArchiveResult = "archived" | "has_people" | "missing" | "is_system";

function parse(row: typeof tenantRoles.$inferSelect): TenantRole {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    actions: row.actions ? row.actions.split(",").filter(Boolean) : [],
    isSystem: row.isSystem,
    archived: !!row.archivedAt,
  };
}

export async function listTenantRoles(db: TenantDb, includeArchived = false): Promise<TenantRole[]> {
  const rows = await db.select().from(tenantRoles).orderBy(tenantRoles.isSystem, tenantRoles.label);
  return rows.filter((r) => includeArchived || !r.archivedAt).map(parse);
}

export async function getTenantRole(db: TenantDb, id: string): Promise<TenantRole | null> {
  const rows = await db.select().from(tenantRoles).where(eq(tenantRoles.id, id));
  return rows[0] ? parse(rows[0]) : null;
}

// Returns the grants map for the tenant: {roleName -> actionsArray}.
// Called once per request by requirePermission; callers thread it into can().
export async function loadGrants(db: TenantDb): Promise<Record<string, string[]>> {
  const rows = await db.select({ name: tenantRoles.name, actions: tenantRoles.actions }).from(tenantRoles).where(isNull(tenantRoles.archivedAt));
  const grants: Record<string, string[]> = {};
  for (const row of rows) {
    grants[row.name] = row.actions ? row.actions.split(",").filter(Boolean) : [];
  }
  return grants;
}

export async function createTenantRole(
  db: TenantDb,
  name: string,
  label: string,
  actions: string[],
  actor: string,
): Promise<{ result: RoleCreateResult; id?: string }> {
  const existing = await db.select({ id: tenantRoles.id }).from(tenantRoles).where(eq(tenantRoles.name, name));
  if (existing.length > 0) return { result: "name_taken" };
  const rows = await db.insert(tenantRoles).values({ name, label, actions: actions.join(","), isSystem: false }).returning({ id: tenantRoles.id });
  const id = rows[0]!.id;
  await recordActivity(db, { actor, action: "role.created", entityType: "role", details: { label, name } });
  return { result: "created", id };
}

export async function updateTenantRole(
  db: TenantDb,
  id: string,
  label: string,
  actions: string[],
  actor: string,
): Promise<RoleUpdateResult> {
  const rows = await db.select({ label: tenantRoles.label }).from(tenantRoles).where(eq(tenantRoles.id, id));
  if (rows.length === 0) return "missing";
  await db.update(tenantRoles).set({ label, actions: actions.join(",") }).where(eq(tenantRoles.id, id));
  await recordActivity(db, { actor, action: "role.updated", entityType: "role", entityId: id, details: { label } });
  return "updated";
}

export async function archiveTenantRole(db: TenantDb, id: string, actor: string): Promise<RoleArchiveResult> {
  const rows = await db.select().from(tenantRoles).where(eq(tenantRoles.id, id));
  if (rows.length === 0) return "missing";
  const role = rows[0]!;
  if (role.isSystem) return "is_system";
  if (role.archivedAt) return "missing";
  // Block archiving if any user holds this role to prevent silent privilege loss.
  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`',' || ${users.roles} || ',' LIKE '%,' || ${role.name} || ',%'`);
  if ((countRow?.n ?? 0) > 0) return "has_people";
  await db.update(tenantRoles).set({ archivedAt: new Date() }).where(eq(tenantRoles.id, id));
  await recordActivity(db, { actor, action: "role.archived", entityType: "role", entityId: id });
  return "archived";
}

export async function unarchiveTenantRole(db: TenantDb, id: string, actor: string): Promise<RoleUpdateResult> {
  const rows = await db.select({ label: tenantRoles.label }).from(tenantRoles).where(eq(tenantRoles.id, id));
  if (rows.length === 0) return "missing";
  await db.update(tenantRoles).set({ archivedAt: null }).where(eq(tenantRoles.id, id));
  await recordActivity(db, { actor, action: "role.unarchived", entityType: "role", entityId: id });
  return "updated";
}
