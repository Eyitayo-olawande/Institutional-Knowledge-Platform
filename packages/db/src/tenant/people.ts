import { eq } from "drizzle-orm";
import type { TenantDb } from "./client.ts";
import * as tenantSchema from "./schema.ts";
import { recordActivity } from "./activity.ts";
import { randomUUID } from "node:crypto";

// A checked staff file row (see @mantle/platform/people for the file rules).
export interface StaffRow {
  readonly employeeId: string;
  readonly fullName: string;
  readonly workEmail: string;
  readonly department: string | null;
  readonly managerEmployeeId: string | null;
}

const { people, employmentEvents, users } = tenantSchema;

export interface ImportOptions {
  // People in the organisation but missing from the file become leavers.
  // Off by default so a partial file cannot end anyone by mistake.
  readonly markMissingAsLeavers: boolean;
  readonly changedBy: string;
}

export interface ImportSummary {
  readonly joined: number;
  readonly moved: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly left: number;
}

// Applies a checked staff file in one transaction. Joiners get a sign in
// account so they can sign in with an emailed code; movers and leavers are
// recorded as employment events for later work packages to act on.
export async function applyStaffImport(db: TenantDb, rows: readonly StaffRow[], options: ImportOptions): Promise<ImportSummary> {
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(people);
    const byId = new Map(existing.map((p) => [p.employeeId, p]));
    const inFile = new Set(rows.map((r) => r.employeeId));
    const counts = { joined: 0, moved: 0, updated: 0, unchanged: 0, left: 0 };
    const now = new Date();
    const changedBy = options.changedBy;

    for (const row of rows) {
      const current = byId.get(row.employeeId);
      if (!current || current.status === "left") {
        const userId = await ensureUser(tx, row, now);
        const values = {
          employeeId: row.employeeId,
          fullName: row.fullName,
          workEmail: row.workEmail,
          department: row.department,
          managerEmployeeId: row.managerEmployeeId,
          status: "active" as const,
          userId,
          joinedAt: now,
          leftAt: null,
          updatedAt: now,
          changedBy,
        };
        const [person] = current
          ? await tx.update(people).set(values).where(eqId(current.id)).returning({ id: people.id })
          : await tx.insert(people).values(values).returning({ id: people.id });
        if (person) {
          await tx.insert(employmentEvents).values({ personId: person.id, type: "join", toDepartment: row.department, changedBy });
          await recordActivity(tx, { actor: changedBy, action: "people.joined", entityType: "person", entityId: person.id, details: { department: row.department } });
        }
        counts.joined++;
        continue;
      }
      const moved = (current.department ?? null) !== row.department;
      const changed =
        moved ||
        current.fullName !== row.fullName ||
        current.workEmail !== row.workEmail ||
        (current.managerEmployeeId ?? null) !== row.managerEmployeeId;
      if (!changed) {
        counts.unchanged++;
        continue;
      }
      await tx
        .update(people)
        .set({ fullName: row.fullName, workEmail: row.workEmail, department: row.department, managerEmployeeId: row.managerEmployeeId, updatedAt: now, changedBy })
        .where(eqId(current.id));
      if (moved) {
        await tx.insert(employmentEvents).values({ personId: current.id, type: "move", fromDepartment: current.department, toDepartment: row.department, changedBy });
        counts.moved++;
      } else {
        counts.updated++;
      }
      await recordActivity(tx, {
        actor: changedBy,
        action: moved ? "people.moved" : "people.updated",
        entityType: "person",
        entityId: current.id,
        details: { fields: changedFields(current, row), ...(moved ? { from: current.department, to: row.department } : {}) },
      });
    }

    if (options.markMissingAsLeavers) {
      for (const person of existing) {
        if (person.status !== "active" || inFile.has(person.employeeId)) continue;
        await tx.update(people).set({ status: "left", leftAt: now, updatedAt: now, changedBy }).where(eqId(person.id));
        await tx.insert(employmentEvents).values({ personId: person.id, type: "leave", fromDepartment: person.department, changedBy });
        await recordActivity(tx, { actor: changedBy, action: "people.left", entityType: "person", entityId: person.id });
        if (person.userId) await tx.delete(tenantSchema.sessions).where(eqSessionUser(person.userId));
        counts.left++;
      }
    }
    return counts;
  });
}

function changedFields(
  current: { fullName: string; workEmail: string; department: string | null; managerEmployeeId: string | null },
  row: StaffRow,
): string[] {
  const fields: string[] = [];
  if (current.fullName !== row.fullName) fields.push("full_name");
  if (current.workEmail !== row.workEmail) fields.push("work_email");
  if ((current.department ?? null) !== row.department) fields.push("department");
  if ((current.managerEmployeeId ?? null) !== row.managerEmployeeId) fields.push("manager_employee_id");
  return fields;
}

type Tx = Parameters<Parameters<TenantDb["transaction"]>[0]>[0];

async function ensureUser(tx: Tx, row: StaffRow, now: Date): Promise<string> {
  const [found] = await tx.select({ id: users.id }).from(users).where(eqEmail(row.workEmail));
  if (found) return found.id;
  const id = randomUUID();
  await tx.insert(users).values({ id, name: row.fullName, email: row.workEmail, emailVerified: true, createdAt: now, updatedAt: now });
  return id;
}

const eqId = (id: string) => eq(people.id, id);
const eqEmail = (email: string) => eq(users.email, email);
const eqSessionUser = (userId: string) => eq(tenantSchema.sessions.userId, userId);

export async function listPeople(db: TenantDb) {
  return db
    .select({
      id: people.id,
      employeeId: people.employeeId,
      fullName: people.fullName,
      workEmail: people.workEmail,
      department: people.department,
      status: people.status,
    })
    .from(people)
    .orderBy(people.fullName);
}

// Sets a person's sign in roles (development seeding and, later, the roles
// screens in E3).
export async function setUserRoles(db: TenantDb, userId: string, roles: string): Promise<void> {
  await db.update(users).set({ roles, updatedAt: new Date() }).where(eq(users.id, userId));
}

// Adds a learning administrator who signs in with an emailed code, or
// gives an existing sign in account that role. Used when Design Streams
// sets up an organisation (assisted onboarding).
export async function addAdministrator(
  db: TenantDb,
  person: { name: string; email: string },
  actor = "console:development",
): Promise<"added" | "promoted"> {
  const email = person.email.trim().toLowerCase();
  const [found] = await db.select({ id: users.id, roles: users.roles }).from(users).where(eq(users.email, email));
  if (found) {
    const roles = new Set(found.roles.split(",").map((r) => r.trim()).filter(Boolean));
    roles.add("learning_administrator");
    await setUserRoles(db, found.id, [...roles].join(","));
    await recordActivity(db, { actor, action: "roles.granted", entityType: "user", entityId: found.id, details: { role: "learning_administrator" } });
    return "promoted";
  }
  const now = new Date();
  const id = randomUUID();
  await db.insert(users).values({
    id,
    name: person.name.trim(),
    email,
    emailVerified: true,
    roles: "learner,learning_administrator",
    createdAt: now,
    updatedAt: now,
  });
  await recordActivity(db, { actor, action: "roles.granted", entityType: "user", entityId: id, details: { role: "learning_administrator", new_account: true } });
  return "added";
}

export async function listUsers(db: TenantDb) {
  return db.select({ id: users.id, name: users.name, email: users.email, roles: users.roles }).from(users).orderBy(users.name);
}

// Changes someone's roles and records it, in one transaction.
export async function changeUserRoles(db: TenantDb, userId: string, roles: string, actor: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [before] = await tx.select({ roles: users.roles }).from(users).where(eq(users.id, userId));
    if (!before) throw new Error("No such user.");
    if (before.roles === roles) return;
    await tx.update(users).set({ roles, updatedAt: new Date() }).where(eq(users.id, userId));
    await recordActivity(tx, { actor, action: "roles.changed", entityType: "user", entityId: userId, details: { from: before.roles, to: roles } });
  });
}
