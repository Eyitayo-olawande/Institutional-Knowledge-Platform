import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, dropDatabase } from "../setup.ts";
import { recentActivity, recordActivity } from "./activity.ts";
import { connectTenant, type TenantDb } from "./client.ts";
import { migrateTenant } from "./migrate.ts";
import { addAdministrator, applyStaffImport, changeUserRoles, listUsers } from "./people.ts";

const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const name = `itest_activity_${process.pid}_${Date.now()}`;

describe.skipIf(!serverUrl)("activity log", { timeout: 60_000 }, () => {
  let db: TenantDb;
  let close: () => Promise<void>;

  beforeAll(async () => {
    await createDatabase(serverUrl ?? "", name);
    await migrateTenant(serverUrl ?? "", name);
    ({ db, close } = connectTenant(serverUrl ?? "", name));
  });

  afterAll(async () => {
    await close?.();
    await dropDatabase(serverUrl ?? "", name);
  });

  it("records joins, moves, leaves and new departments from a staff import", async () => {
    const row = (id: string, dept: string) => ({ employeeId: id, fullName: id, workEmail: `${id}@a.test`, department: dept, managerEmployeeId: null });
    const opts = { markMissingAsLeavers: true, changedBy: "user:admin" };
    await applyStaffImport(db, [row("e1", "Claims"), row("e2", "Sales")], opts);
    await applyStaffImport(db, [row("e1", "Underwriting")], opts);
    const actions = (await recentActivity(db)).map((a) => a.action).sort();
    expect(actions).toEqual(["people.joined", "people.joined", "people.left", "people.moved", "structure.created", "structure.created", "structure.created"]);
  });

  it("records granting the administrator role", async () => {
    await addAdministrator(db, { name: "Kemi", email: "kemi@a.test" }, "console:test");
    expect((await recentActivity(db, 1))[0]).toMatchObject({ actor: "console:test", action: "roles.granted" });
  });

  it("records role changes with before and after", async () => {
    const kemi = (await listUsers(db)).find((u) => u.email === "kemi@a.test");
    await changeUserRoles(db, kemi!.id, "learner,line_manager", "user:admin");
    expect((await recentActivity(db, 1))[0]).toMatchObject({
      action: "roles.changed",
      details: { from: "learner,learning_administrator", to: "learner,line_manager" },
    });
  });

  it("refuses to change or delete entries", async () => {
    await recordActivity(db, { actor: "system:test", action: "test.done", entityType: "test" });
    await expect(db.execute(sql`update activity_log set action = 'changed'`)).rejects.toThrow();
    await expect(db.execute(sql`delete from activity_log`)).rejects.toThrow();
  });
});
