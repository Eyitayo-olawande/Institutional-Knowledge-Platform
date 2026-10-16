import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrationsDir } from "../migrations_dir.ts";
import { createDatabase, dropDatabase } from "../setup.ts";
import { recentActivity } from "./activity.ts";
import { connectTenant, type TenantDb } from "./client.ts";
import { migrateTenant } from "./migrate.ts";
import { applyStaffImport, listPeople } from "./people.ts";
import * as schema from "./schema.ts";
import { listStructure, mergeStructure, moveRoleLevel, renameStructure } from "./structure.ts";

const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const suffix = `${process.pid}_${Date.now()}`;
const opts = { markMissingAsLeavers: false, changedBy: "user:test" };
const row = (employeeId: string, department: string | null, extra: { unit?: string; location?: string; roleLevel?: string } = {}) => ({
  employeeId,
  fullName: `Person ${employeeId}`,
  workEmail: `${employeeId.toLowerCase()}@a.test`,
  department,
  managerEmployeeId: null,
  ...extra,
});

// The sample staff file in docs/samples, as rows.
const SAMPLE = [
  row("AL001", "Claims", { unit: "Motor claims", location: "Lagos", roleLevel: "Manager" }),
  row("AL002", "Claims", { unit: "Motor claims", location: "Lagos", roleLevel: "Officer" }),
  row("AL003", "Underwriting", { location: "Abuja", roleLevel: "Manager" }),
  row("AL004", "Underwriting", { location: "Abuja", roleLevel: "Officer" }),
];

describe.skipIf(!serverUrl)("structure records", { timeout: 60_000 }, () => {
  const name = `itest_structure_${suffix}`;
  let db: TenantDb;
  let close: () => Promise<void>;
  const names = async (kind: "department" | "unit" | "location" | "role_level") => (await listStructure(db, kind)).map((e) => e.name);

  beforeAll(async () => {
    await createDatabase(serverUrl ?? "", name);
    await migrateTenant(serverUrl ?? "", name);
    ({ db, close } = connectTenant(serverUrl ?? "", name));
  });

  afterAll(async () => {
    await close?.();
    await dropDatabase(serverUrl ?? "", name);
  });

  it("creates entries from the staff file and links every person", async () => {
    await applyStaffImport(db, SAMPLE, opts);
    expect(await names("department")).toEqual(["Claims", "Underwriting"]);
    expect(await names("unit")).toEqual(["Motor claims"]);
    expect(await names("location")).toEqual(["Abuja", "Lagos"]);
    expect(await names("role_level")).toEqual(["Manager", "Officer"]);
    const linked = await db.select().from(schema.people);
    expect(linked.every((p) => p.departmentId && p.locationId && p.roleLevelId)).toBe(true);
    expect((await listStructure(db, "department")).map((e) => e.people)).toEqual([2, 2]);
    expect((await recentActivity(db, 50)).filter((a) => a.action === "structure.created")).toHaveLength(7);
  });

  it("creates nothing new on a second import, matching names ignoring case and spaces", async () => {
    const summary = await applyStaffImport(db, [...SAMPLE.slice(0, 3), { ...SAMPLE[3]!, department: "  underwriting " }], opts);
    expect(summary).toMatchObject({ unchanged: 4, moved: 0 });
    expect(await names("department")).toEqual(["Claims", "Underwriting"]);
  });

  it("renames an entry everywhere it is shown, and the old name still matches", async () => {
    const claims = (await listStructure(db, "department")).find((e) => e.name === "Claims")!;
    expect(await renameStructure(db, "department", claims.id, "Claims and Recoveries", "user:test")).toBe("renamed");
    expect((await listPeople(db)).find((p) => p.employeeId === "AL001")?.department).toBe("Claims and Recoveries");
    await applyStaffImport(db, [row("AL005", "claims")], opts);
    expect(await names("department")).toEqual(["Claims and Recoveries", "Underwriting"]);
    expect((await recentActivity(db, 5)).some((a) => a.action === "structure.renamed")).toBe(true);
  });

  it("refuses a rename to a name another entry has", async () => {
    const claims = (await listStructure(db, "department")).find((e) => e.name.startsWith("Claims"))!;
    expect(await renameStructure(db, "department", claims.id, "UNDERWRITING", "user:test")).toBe("name_taken");
  });

  it("merges two departments, moving people, history, units and names", async () => {
    await applyStaffImport(db, [row("AL006", "Claims Dept", { unit: "motor CLAIMS" }), row("AL007", "Claims Dept", { unit: "Marine" })], opts);
    // A move between the two, so there is history to carry over.
    await applyStaffImport(db, [row("AL004", "Claims Dept", { location: "Abuja", roleLevel: "Officer" })], opts);
    const list = await listStructure(db, "department");
    const keep = list.find((e) => e.name === "Claims and Recoveries")!;
    const remove = list.find((e) => e.name === "Claims Dept")!;

    expect(await mergeStructure(db, "department", remove.id, keep.id, "user:test")).toBe("merged");

    expect(await names("department")).toEqual(["Claims and Recoveries", "Underwriting"]);
    expect((await listStructure(db, "department")).find((e) => e.id === keep.id)?.people).toBe(6);
    // The duplicate unit folded into the kept one; the new unit moved across.
    const unitList = await listStructure(db, "unit");
    expect(unitList.map((u) => [u.name, u.departmentName, u.people])).toEqual([
      ["Marine", "Claims and Recoveries", 1],
      ["Motor claims", "Claims and Recoveries", 3],
    ]);
    const events = await db.select().from(schema.employmentEvents);
    expect(events.some((e) => e.fromDepartmentId === remove.id || e.toDepartmentId === remove.id)).toBe(false);
    expect(events.filter((e) => e.type === "move" && e.toDepartmentId === keep.id)).toHaveLength(1);
    // The merged name still lands on the kept department.
    await applyStaffImport(db, [row("AL008", "CLAIMS DEPT")], opts);
    expect(await names("department")).toEqual(["Claims and Recoveries", "Underwriting"]);
    const log = await recentActivity(db, 10);
    expect(log.find((a) => a.action === "structure.merged")).toMatchObject({ entityType: "department", entityId: keep.id });
  });

  it("only merges units within one department", async () => {
    await applyStaffImport(db, [row("AL009", "Underwriting", { unit: "Fire" })], opts);
    const unitList = await listStructure(db, "unit");
    const fire = unitList.find((u) => u.name === "Fire")!;
    const marine = unitList.find((u) => u.name === "Marine")!;
    expect(await mergeStructure(db, "unit", fire.id, marine.id, "user:test")).toBe("different_department");
    expect(await mergeStructure(db, "unit", fire.id, fire.id, "user:test")).toBe("same");
  });

  it("reorders role levels", async () => {
    const officer = (await listStructure(db, "role_level")).find((e) => e.name === "Officer")!;
    expect(await moveRoleLevel(db, officer.id, "up", "user:test")).toBe(true);
    expect(await names("role_level")).toEqual(["Officer", "Manager"]);
    expect(await moveRoleLevel(db, officer.id, "up", "user:test")).toBe(false);
  });
});

describe.skipIf(!serverUrl)("structure migration", { timeout: 60_000 }, () => {
  const name = `itest_structure_mig_${suffix}`;
  let folder = "";

  afterAll(async () => {
    delete process.env.MANTLE_MIGRATIONS_DIR;
    if (folder) await rm(folder, { recursive: true, force: true });
    await dropDatabase(serverUrl ?? "", name);
  });

  it("copies existing department text into records and links people and history", async () => {
    // Migrate to just before this package, add people the old way, then
    // apply the rest.
    folder = await mkdtemp(join(tmpdir(), "mantle-mig-"));
    await cp(migrationsDir("tenant"), join(folder, "tenant"), { recursive: true });
    const journalPath = join(folder, "tenant", "meta", "_journal.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8")) as { entries: { tag: string }[] };
    journal.entries = journal.entries.filter((e) => e.tag < "0007");
    await writeFile(journalPath, JSON.stringify(journal));
    process.env.MANTLE_MIGRATIONS_DIR = folder;
    await createDatabase(serverUrl ?? "", name);
    await migrateTenant(serverUrl ?? "", name);
    delete process.env.MANTLE_MIGRATIONS_DIR;

    const { db, close } = connectTenant(serverUrl ?? "", name);
    try {
      // Plain SQL: the schema in code already has this package's columns.
      await db.execute(sql`
        insert into people (employee_id, full_name, work_email, department, changed_by) values
          ('A', 'A', 'a@a.test', 'Claims', 'test'), ('B', 'B', 'b@a.test', ' claims  ', 'test'),
          ('C', 'C', 'c@a.test', 'Sales', 'test'), ('D', 'D', 'd@a.test', null, 'test')`);
      await db.execute(sql`
        insert into employment_events (person_id, type, from_department, to_department, changed_by)
        select id, 'move', 'Old Dept', 'Claims', 'test' from people where employee_id = 'A'`);

      await migrateTenant(serverUrl ?? "", name);

      expect((await listStructure(db, "department")).map((e) => [e.name, e.people])).toEqual([
        ["Claims", 2],
        ["Old Dept", 0],
        ["Sales", 1],
      ]);
      const [d] = await db.select().from(schema.people).where(eq(schema.people.employeeId, "D"));
      expect(d?.departmentId).toBeNull();
      const [event] = await db.select().from(schema.employmentEvents);
      expect(event?.fromDepartmentId && event.toDepartmentId).toBeTruthy();
      // Later imports match the copied names.
      await applyStaffImport(db, [{ employeeId: "B", fullName: "B", workEmail: "b@a.test", department: "CLAIMS", managerEmployeeId: null }], opts);
      expect((await listStructure(db, "department")).map((e) => e.name)).toEqual(["Claims", "Old Dept", "Sales"]);
    } finally {
      await close();
    }
  });
});
