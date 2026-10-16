import { connectTenant, DEFAULT_CONTENT_TYPES, listAreas, listLibraryItems, type TenantDb } from "@mantle/db/tenant";
import { migrateTenant } from "@mantle/db/tenant/migrate";
import { createDatabase, dropDatabase } from "@mantle/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_ITEMS, seedDemoLibrary } from "./library_content.ts";

describe("demo library content", () => {
  it("is clearly fictional, with unique titles and real text", () => {
    const titles = DEMO_ITEMS.map((i) => i.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const item of DEMO_ITEMS) {
      expect(item.title.endsWith("(fictional)")).toBe(true);
      expect(item.body.length).toBeGreaterThan(40);
    }
  });

  it("uses a known content type for its kind of area", () => {
    for (const item of DEMO_ITEMS) {
      expect(DEFAULT_CONTENT_TYPES[item.department ? "department" : "common"].map((t) => t.key)).toContain(item.type);
    }
  });

  it("covers the screens reviewers need: an overdue review and an unpublished draft", () => {
    expect(DEMO_ITEMS.some((i) => i.reviewInDays !== null && i.reviewInDays < 0)).toBe(true);
    expect(DEMO_ITEMS.some((i) => !i.publish)).toBe(true);
  });
});

// Skipped without MANTLE_PG_SERVER_URL, like the other database tests.
const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const name = `itest_demo_${process.pid}_${Date.now()}`;

describe.skipIf(!serverUrl)("seedDemoLibrary", { timeout: 60_000 }, () => {
  let conn: { db: TenantDb; close: () => Promise<void> };

  beforeAll(async () => {
    await createDatabase(serverUrl ?? "", name);
    await migrateTenant(serverUrl ?? "", name);
    conn = connectTenant(serverUrl ?? "", name);
  });

  afterAll(async () => {
    await conn.close();
    await dropDatabase(serverUrl ?? "", name);
  });

  it("adds every item once and is safe to run again", async () => {
    const first = await seedDemoLibrary(conn.db, new Date("2026-10-16T00:00:00Z"));
    expect(first.added).toBe(DEMO_ITEMS.length);
    const second = await seedDemoLibrary(conn.db);
    expect(second).toEqual({ added: 0, skipped: DEMO_ITEMS.length });
    const published = await listLibraryItems(conn.db, { publishedOnly: true, areas: "all" });
    expect(published.length).toBe(DEMO_ITEMS.filter((i) => i.publish).length);
    // Claims items sit in the Claims area, created for the seed.
    const claims = (await listAreas(conn.db)).find((a) => a.departmentName === "Claims");
    const inClaims = await listLibraryItems(conn.db, { publishedOnly: false, areas: "all", ...(claims ? { areaId: claims.id } : {}) });
    expect(inClaims.map((i) => i.title).sort()).toEqual(DEMO_ITEMS.filter((i) => i.department === "Claims").map((i) => i.title).sort());
  });
});
