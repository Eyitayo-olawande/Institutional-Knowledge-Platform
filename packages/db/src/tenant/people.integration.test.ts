import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, dropDatabase } from "../setup.ts";
import { connectTenant, type TenantDb } from "./client.ts";
import { migrateTenant } from "./migrate.ts";
import { addAdministrator, applyStaffImport, listPeople, personDepartmentByUserId } from "./people.ts";
import * as schema from "./schema.ts";

const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const name = `itest_people_${process.pid}_${Date.now()}`;
const row = (employeeId: string, fullName: string, department: string | null) => ({
  employeeId,
  fullName,
  workEmail: `${employeeId.toLowerCase()}@a.test`,
  department,
  managerEmployeeId: null,
});
const opts = { markMissingAsLeavers: false, changedBy: "test" };

describe.skipIf(!serverUrl)("staff import", { timeout: 60_000 }, () => {
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

  it("adds joiners with a sign in account each", async () => {
    const summary = await applyStaffImport(db, [row("E1", "Ada", "Claims"), row("E2", "Bola", "Sales")], opts);
    expect(summary).toEqual({ joined: 2, moved: 0, updated: 0, unchanged: 0, left: 0 });
    expect((await db.select().from(schema.users)).map((u) => u.email).sort()).toEqual(["e1@a.test", "e2@a.test"]);
  });

  it("records a move when the department changes and nothing for unchanged people", async () => {
    const summary = await applyStaffImport(db, [row("E1", "Ada", "Underwriting"), row("E2", "Bola", "Sales")], opts);
    expect(summary).toMatchObject({ joined: 0, moved: 1, unchanged: 1 });
    const events = await db.select().from(schema.employmentEvents);
    expect(events.filter((e) => e.type === "move")).toMatchObject([{ fromDepartment: "Claims", toDepartment: "Underwriting" }]);
  });

  it("leaves people missing from the file alone unless asked", async () => {
    expect(await applyStaffImport(db, [row("E1", "Ada", "Underwriting")], opts)).toMatchObject({ left: 0, unchanged: 1 });
    expect((await listPeople(db)).every((p) => p.status === "active")).toBe(true);
  });

  it("marks people missing from the file as leavers when asked", async () => {
    const summary = await applyStaffImport(db, [row("E1", "Ada", "Underwriting")], { ...opts, markMissingAsLeavers: true });
    expect(summary.left).toBe(1);
    expect((await listPeople(db)).find((p) => p.employeeId === "E2")?.status).toBe("left");
  });

  it("brings a leaver back as a joiner", async () => {
    const summary = await applyStaffImport(db, [row("E1", "Ada", "Underwriting"), row("E2", "Bola", "Sales")], opts);
    expect(summary).toMatchObject({ joined: 1, unchanged: 1 });
    expect((await listPeople(db)).find((p) => p.employeeId === "E2")?.status).toBe("active");
  });

  it("looks up a person's department from their sign in account, for the app shell", async () => {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, "e1@a.test"));
    expect(await personDepartmentByUserId(db, user!.id)).toBe("Underwriting");
  });

  it("gives no department for a sign in account with no staff record", async () => {
    expect(await personDepartmentByUserId(db, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});

describe.skipIf(!serverUrl)("first administrator", { timeout: 60_000 }, () => {
  const dbName = `itest_admin_${process.pid}_${Date.now()}`;
  let db: TenantDb;
  let close: () => Promise<void>;

  beforeAll(async () => {
    await createDatabase(serverUrl ?? "", dbName);
    await migrateTenant(serverUrl ?? "", dbName);
    ({ db, close } = connectTenant(serverUrl ?? "", dbName));
  });

  afterAll(async () => {
    await close?.();
    await dropDatabase(serverUrl ?? "", dbName);
  });

  it("adds a new administrator, then promotes rather than duplicates", async () => {
    expect(await addAdministrator(db, { name: "Kemi", email: " Kemi@Org.test " })).toBe("added");
    expect(await addAdministrator(db, { name: "Kemi", email: "kemi@org.test" })).toBe("promoted");
    const all = await db.select().from(schema.users);
    expect(all).toHaveLength(1);
    expect(all[0]?.roles).toBe("learner,learning_administrator");
  });
});
