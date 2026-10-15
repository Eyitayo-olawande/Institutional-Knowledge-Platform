import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, dropDatabase } from "../setup.ts";
import { recentActivity } from "./activity.ts";
import { connectTenant, type TenantDb } from "./client.ts";
import { createLibraryItem, getLibraryItem, listLibraryItems, publishDraft, saveDraft } from "./library.ts";
import { migrateTenant } from "./migrate.ts";

const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const name = `itest_library_${process.pid}_${Date.now()}`;
const base = { ownerUserId: null, reviewDate: "2027-04-01" };

describe.skipIf(!serverUrl)("knowledge library", { timeout: 60_000 }, () => {
  let db: TenantDb;
  let close: () => Promise<void>;
  let id: string;

  beforeAll(async () => {
    await createDatabase(serverUrl ?? "", name);
    await migrateTenant(serverUrl ?? "", name);
    ({ db, close } = connectTenant(serverUrl ?? "", name));
  });

  afterAll(async () => {
    await close?.();
    await dropDatabase(serverUrl ?? "", name);
  });

  it("creates an item as an unpublished draft that staff cannot see", async () => {
    id = await createLibraryItem(db, { title: "Claims SOP", body: "Step 1", ...base }, "user:a");
    expect(await listLibraryItems(db, { publishedOnly: true })).toEqual([]);
    expect((await getLibraryItem(db, id))?.draft?.version).toBe(1);
  });

  it("publishes the draft as version 1", async () => {
    expect(await publishDraft(db, id, "user:a")).toBe(1);
    const found = await getLibraryItem(db, id);
    expect(found?.published?.body).toBe("Step 1");
    expect(found?.draft).toBeNull();
    expect((await listLibraryItems(db, { publishedOnly: true })).map((i) => i.title)).toEqual(["Claims SOP"]);
  });

  it("keeps staff on the published version while a new draft is edited", async () => {
    expect(await saveDraft(db, id, { title: "Claims SOP", body: "Step 1 and 2", changeNote: "Added step 2", ...base }, "user:a")).toBe(2);
    expect(await saveDraft(db, id, { title: "Claims SOP", body: "Steps 1, 2, 3", changeNote: "Added step 3", ...base }, "user:a")).toBe(2);
    const found = await getLibraryItem(db, id);
    expect(found?.published?.version).toBe(1);
    expect(found?.draft?.body).toBe("Steps 1, 2, 3");
  });

  it("publishes version 2 and keeps version 1 as history", async () => {
    expect(await publishDraft(db, id, "user:a")).toBe(2);
    const found = await getLibraryItem(db, id);
    expect(found?.published?.version).toBe(2);
    expect(found?.versions.map((v) => v.version)).toEqual([2, 1]);
    expect(await publishDraft(db, id, "user:a")).toBeNull();
  });

  it("records each step in the activity log", async () => {
    const actions = (await recentActivity(db)).map((a) => a.action);
    expect(actions.filter((a) => a === "library.published")).toHaveLength(2);
    expect(actions).toContain("library.item_created");
  });
});
