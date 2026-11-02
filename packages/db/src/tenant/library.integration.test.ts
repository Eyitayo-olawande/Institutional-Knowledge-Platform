import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, dropDatabase } from "../setup.ts";
import { recentActivity } from "./activity.ts";
import { commonArea, contentTypeByKey } from "./areas.ts";
import { connectTenant, type TenantDb } from "./client.ts";
import { attachFileToItem, createLibraryItem, fileWithItem, getLibraryItem, itemFiles, itemsDueForReview, listLibraryItems, publishDraft, saveDraft, searchLibrary } from "./library.ts";
import { migrateTenant } from "./migrate.ts";

const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const name = `itest_library_${process.pid}_${Date.now()}`;
const base = { ownerUserId: null, reviewDate: "2027-04-01" };

describe.skipIf(!serverUrl)("knowledge library", { timeout: 60_000 }, () => {
  let db: TenantDb;
  let close: () => Promise<void>;
  let id: string;
  let place: { areaId: string; contentTypeId: string };

  beforeAll(async () => {
    await createDatabase(serverUrl ?? "", name);
    await migrateTenant(serverUrl ?? "", name);
    ({ db, close } = connectTenant(serverUrl ?? "", name));
    place = { areaId: await commonArea(db), contentTypeId: (await contentTypeByKey(db, "common", "other")) ?? "" };
  });

  afterAll(async () => {
    await close?.();
    await dropDatabase(serverUrl ?? "", name);
  });

  it("creates an item as an unpublished draft that staff cannot see", async () => {
    id = await createLibraryItem(db, { title: "Claims SOP", body: "Step 1", ...base, ...place }, "user:a");
    expect(await listLibraryItems(db, { publishedOnly: true, areas: "all" })).toEqual([]);
    expect((await getLibraryItem(db, id))?.draft?.version).toBe(1);
  });

  it("publishes the draft as version 1", async () => {
    expect(await publishDraft(db, id, "user:a")).toBe(1);
    const found = await getLibraryItem(db, id);
    expect(found?.published?.body).toBe("Step 1");
    expect(found?.draft).toBeNull();
    expect((await listLibraryItems(db, { publishedOnly: true, areas: "all" })).map((i) => i.title)).toEqual(["Claims SOP"]);
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

  it("searches titles and published content, never staff hidden drafts", async () => {
    const draftId = await createLibraryItem(db, { title: "Secret draft about claims", body: "draft words", ...base, ...place }, "user:a");
    expect((await searchLibrary(db, "claims steps", { publishedOnly: true, areas: "all" })).map((i) => i.title)).toEqual(["Claims SOP"]);
    expect((await searchLibrary(db, "draft words", { publishedOnly: true, areas: "all" }))).toEqual([]);
    expect((await searchLibrary(db, "secret", { publishedOnly: false, areas: "all" })).map((i) => i.id)).toEqual([draftId]);
  });

  it("lists items due for review, flagging overdue ones", async () => {
    await createLibraryItem(db, { title: "Old item", body: "x", ownerUserId: null, reviewDate: "2026-01-01", ...place }, "user:a");
    await createLibraryItem(db, { title: "Far future", body: "x", ownerUserId: null, reviewDate: "2030-01-01", ...place }, "user:a");
    const due = await itemsDueForReview(db, "2027-03-15", "all", 30);
    expect(due.map((d) => [d.title, d.overdue])).toEqual([
      ["Old item", true],
      ["Claims SOP", false],
      ["Secret draft about claims", false],
    ]);
  });

  it("attaches files to an item and finds the item from a file", async () => {
    const fileId = await attachFileToItem(db, id, { storageKey: "k1", name: "form.pdf", contentType: "application/pdf", size: 10, sha256: "x" }, "user:a");
    expect((await itemFiles(db, id)).map((f) => f.name)).toEqual(["form.pdf"]);
    expect(await fileWithItem(db, fileId)).toMatchObject({ itemId: id, itemStatus: "published" });
    expect((await recentActivity(db, 1))[0]?.action).toBe("library.file_attached");
  });

  it("records a converted file's rendition, viewed instead of the original (ADR 0021)", async () => {
    const docxType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const readyId = await attachFileToItem(
      db,
      id,
      { storageKey: "k2", name: "handbook.docx", contentType: docxType, size: 20, sha256: "y", conversionStatus: "ready", renditionKey: "k2.pdf" },
      "user:a",
    );
    const ready = (await itemFiles(db, id)).find((f) => f.id === readyId);
    expect(ready).toMatchObject({ conversionStatus: "ready" });
    const readyFile = await fileWithItem(db, readyId);
    expect(readyFile?.file.renditionKey).toBe("k2.pdf");
    expect(readyFile?.file.renditionConvertedAt).toBeInstanceOf(Date);

    const failedId = await attachFileToItem(
      db,
      id,
      { storageKey: "k3", name: "broken.pptx", contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", size: 5, sha256: "z", conversionStatus: "failed" },
      "user:a",
    );
    const failed = (await itemFiles(db, id)).find((f) => f.id === failedId);
    expect(failed).toMatchObject({ conversionStatus: "failed" });
    const failedFile = await fileWithItem(db, failedId);
    expect(failedFile?.file.renditionKey).toBeNull();
  });
});
