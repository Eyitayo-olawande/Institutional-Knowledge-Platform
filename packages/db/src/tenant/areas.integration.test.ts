import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrationsDir } from "../migrations_dir.ts";
import { createDatabase, dropDatabase } from "../setup.ts";
import { recentActivity } from "./activity.ts";
import { canSeeArea, commonArea, contentTypeByKey, departmentArea, grantAreaAccess, listAreas, revokeAreaAccess, visibleAreas } from "./areas.ts";
import { connectTenant, type TenantDb } from "./client.ts";
import { createLibraryItem, fileWithItem, attachFileToItem, getLibraryItem, itemsDueForReview, listLibraryItems, PlacementError, placeItem, publishDraft, searchLibrary } from "./library.ts";
import { migrateTenant } from "./migrate.ts";
import { applyStaffImport } from "./people.ts";
import * as schema from "./schema.ts";
import { listStructure, mergeStructure } from "./structure.ts";

const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const suffix = `${process.pid}_${Date.now()}`;
const opts = { markMissingAsLeavers: false, changedBy: "user:test" };
const row = (employeeId: string, department: string | null) => ({
  employeeId,
  fullName: `Person ${employeeId}`,
  workEmail: `${employeeId.toLowerCase()}@a.test`,
  department,
  managerEmployeeId: null,
});

describe.skipIf(!serverUrl)("learning areas", { timeout: 60_000 }, () => {
  const name = `itest_areas_${suffix}`;
  let db: TenantDb;
  let close: () => Promise<void>;
  const ids: Record<string, string> = {};
  const userOf = async (employeeId: string) =>
    (await db.select({ userId: schema.people.userId }).from(schema.people).where(eq(schema.people.employeeId, employeeId)))[0]?.userId ?? "";
  const personOf = async (employeeId: string) =>
    (await db.select({ id: schema.people.id }).from(schema.people).where(eq(schema.people.employeeId, employeeId)))[0]?.id ?? "";
  const viewer = async (employeeId: string) => visibleAreas(db, { userId: await userOf(employeeId), allAreas: false });
  const titles = (items: { title: string }[]) => items.map((i) => i.title).sort();

  beforeAll(async () => {
    await createDatabase(serverUrl ?? "", name);
    await migrateTenant(serverUrl ?? "", name);
    ({ db, close } = connectTenant(serverUrl ?? "", name));
  });

  afterAll(async () => {
    await close?.();
    await dropDatabase(serverUrl ?? "", name);
  });

  it("gives a new tenant Common Staff Learning and one area per department", async () => {
    expect((await listAreas(db)).map((a) => [a.kind, a.departmentName])).toEqual([["common", null]]);
    await applyStaffImport(db, [row("C1", "Claims"), row("U1", "Underwriting"), row("N1", null)], opts);
    expect((await listAreas(db)).map((a) => [a.kind, a.departmentName])).toEqual([
      ["common", null],
      ["department", "Claims"],
      ["department", "Underwriting"],
    ]);
  });

  it("refuses an item without a suitable area and content type", async () => {
    const common = await commonArea(db);
    const departmentType = (await contentTypeByKey(db, "department", "procedures")) ?? "";
    await expect(
      createLibraryItem(db, { title: "x", body: "x", ownerUserId: null, reviewDate: null, areaId: common, contentTypeId: departmentType }, "user:test"),
    ).rejects.toBeInstanceOf(PlacementError);
    await expect(db.execute(sql`insert into library_items (title, changed_by) values ('no area', 'test')`)).rejects.toThrow();
  });

  it("shows Claims staff Common and Claims items only, in lists, search, review lists, direct links and files", async () => {
    const common = await commonArea(db);
    const claims = (await departmentArea(db, (await listStructure(db, "department")).find((d) => d.name === "Claims")!.id))!;
    const underwriting = (await departmentArea(db, (await listStructure(db, "department")).find((d) => d.name === "Underwriting")!.id))!;
    const commonType = (await contentTypeByKey(db, "common", "compliance"))!;
    const deptType = (await contentTypeByKey(db, "department", "procedures"))!;
    const add = async (title: string, areaId: string, contentTypeId: string) => {
      const id = await createLibraryItem(db, { title, body: `${title} procedure text`, ownerUserId: null, reviewDate: "2026-01-01", areaId, contentTypeId }, "user:test");
      await publishDraft(db, id, "user:test");
      ids[title] = id;
    };
    await add("AML basics", common, commonType);
    await add("Claims intake", claims, deptType);
    await add("Underwriting limits", underwriting, deptType);

    const seen = await viewer("C1");
    expect(titles(await listLibraryItems(db, { publishedOnly: true, areas: seen }))).toEqual(["AML basics", "Claims intake"]);
    expect(titles(await searchLibrary(db, "procedure", { publishedOnly: true, areas: seen }))).toEqual(["AML basics", "Claims intake"]);
    expect(titles(await itemsDueForReview(db, "2026-01-01", seen))).toEqual(["AML basics", "Claims intake"]);
    const hidden = await getLibraryItem(db, ids["Underwriting limits"]!);
    expect(canSeeArea(seen, hidden!.item.areaId)).toBe(false);
    const fileId = await attachFileToItem(db, ids["Underwriting limits"]!, { storageKey: "k-uw", name: "limits.pdf", contentType: "application/pdf", size: 1, sha256: "x" }, "user:test");
    expect(canSeeArea(seen, (await fileWithItem(db, fileId))!.itemAreaId)).toBe(false);

    // Someone with no department sees Common only; an administrator sees all.
    expect(titles(await listLibraryItems(db, { publishedOnly: true, areas: await viewer("N1") }))).toEqual(["AML basics"]);
    expect(await visibleAreas(db, { userId: await userOf("N1"), allAreas: true })).toBe("all");
  });

  it("filters by area and content type", async () => {
    const claims = (await listAreas(db)).find((a) => a.departmentName === "Claims")!;
    expect(titles(await listLibraryItems(db, { publishedOnly: true, areas: "all", areaId: claims.id }))).toEqual(["Claims intake"]);
    const compliance = (await contentTypeByKey(db, "common", "compliance"))!;
    expect(titles(await listLibraryItems(db, { publishedOnly: true, areas: "all", contentTypeId: compliance }))).toEqual(["AML basics"]);
  });

  it("shows a granted area's items, until the grant is removed", async () => {
    const underwriting = (await listAreas(db)).find((a) => a.departmentName === "Underwriting")!;
    const claimsPerson = await personOf("C1");
    expect(await grantAreaAccess(db, underwriting.id, claimsPerson, "user:admin")).toBe(true);
    expect(titles(await listLibraryItems(db, { publishedOnly: true, areas: await viewer("C1") }))).toContain("Underwriting limits");
    await revokeAreaAccess(db, underwriting.id, claimsPerson, "user:admin");
    expect(titles(await listLibraryItems(db, { publishedOnly: true, areas: await viewer("C1") }))).not.toContain("Underwriting limits");
    const actions = (await recentActivity(db, 5)).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["areas.access_granted", "areas.access_revoked"]));
    // Common needs no grant.
    expect(await grantAreaAccess(db, await commonArea(db), claimsPerson, "user:admin")).toBe(false);
  });

  it("moves an item to another area as a logged edit", async () => {
    const underwriting = (await listAreas(db)).find((a) => a.departmentName === "Underwriting")!;
    const type = (await contentTypeByKey(db, "department", "manuals"))!;
    expect(await placeItem(db, ids["Claims intake"]!, { areaId: underwriting.id, contentTypeId: type }, "user:test")).toBe(true);
    expect(titles(await listLibraryItems(db, { publishedOnly: true, areas: await viewer("C1") }))).toEqual(["AML basics"]);
    expect((await recentActivity(db, 1))[0]).toMatchObject({ action: "library.item_placed", entityId: ids["Claims intake"] });
    await expect(placeItem(db, ids["Claims intake"]!, { areaId: await commonArea(db), contentTypeId: type }, "user:test")).rejects.toBeInstanceOf(PlacementError);
  });

  it("carries items and grants over when two departments merge", async () => {
    await applyStaffImport(db, [row("D1", "Claims Dept")], opts);
    const list = await listAreas(db);
    const dept = list.find((a) => a.departmentName === "Claims Dept")!;
    const type = (await contentTypeByKey(db, "department", "training"))!;
    const item = await createLibraryItem(db, { title: "Dept training", body: "x", ownerUserId: null, reviewDate: null, areaId: dept.id, contentTypeId: type }, "user:test");
    await grantAreaAccess(db, dept.id, await personOf("U1"), "user:admin");
    const departments = await listStructure(db, "department");
    await mergeStructure(db, "department", departments.find((d) => d.name === "Claims Dept")!.id, departments.find((d) => d.name === "Claims")!.id, "user:test");
    const claims = (await listAreas(db)).find((a) => a.departmentName === "Claims")!;
    expect((await listAreas(db)).some((a) => a.departmentName === "Claims Dept")).toBe(false);
    expect((await getLibraryItem(db, item))?.item.areaId).toBe(claims.id);
    expect(canSeeArea(await viewer("U1"), claims.id)).toBe(true);
    expect(canSeeArea(await viewer("D1"), claims.id)).toBe(true);
  });
});

describe.skipIf(!serverUrl)("learning areas migration", { timeout: 60_000 }, () => {
  const name = `itest_areas_mig_${suffix}`;
  let folder = "";

  afterAll(async () => {
    delete process.env.MANTLE_MIGRATIONS_DIR;
    if (folder) await rm(folder, { recursive: true, force: true });
    await dropDatabase(serverUrl ?? "", name);
  });

  it("puts existing items in Common Staff Learning, flagged for review, and gives departments their areas", async () => {
    folder = await mkdtemp(join(tmpdir(), "mantle-mig-"));
    await cp(migrationsDir("tenant"), join(folder, "tenant"), { recursive: true });
    const journalPath = join(folder, "tenant", "meta", "_journal.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8")) as { entries: { tag: string }[] };
    journal.entries = journal.entries.filter((e) => e.tag < "0008");
    await writeFile(journalPath, JSON.stringify(journal));
    process.env.MANTLE_MIGRATIONS_DIR = folder;
    await createDatabase(serverUrl ?? "", name);
    await migrateTenant(serverUrl ?? "", name);
    delete process.env.MANTLE_MIGRATIONS_DIR;

    const { db, close } = connectTenant(serverUrl ?? "", name);
    try {
      // Plain SQL: the schema in code already has this package's columns.
      await db.execute(sql`insert into library_items (title, changed_by) values ('Old SOP', 'test'), ('Old guide', 'test')`);
      await db.execute(sql`insert into departments (name, changed_by) values ('Claims', 'test')`);

      await migrateTenant(serverUrl ?? "", name);

      const common = await commonArea(db);
      const other = await contentTypeByKey(db, "common", "other");
      const items = await db.select().from(schema.libraryItems);
      expect(items.map((i) => [i.title, i.areaId === common, i.contentTypeId === other, i.needsAreaReview]).sort()).toEqual([
        ["Old SOP", true, true, true],
        ["Old guide", true, true, true],
      ]);
      expect((await listAreas(db)).map((a) => a.departmentName)).toEqual([null, "Claims"]);
    } finally {
      await close();
    }
  });
});
