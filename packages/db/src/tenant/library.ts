import { and, asc, desc, eq, isNull, lte, max, type SQL } from "drizzle-orm";
import { recordActivity } from "./activity.ts";
import { areaIdsOrAll, checkPlacement, type VisibleAreas } from "./areas.ts";
import type { TenantDb } from "./client.ts";
import { contentTypes, files, libraryItemFiles, libraryItems, libraryItemVersions } from "./schema.ts";

export interface NewItem {
  readonly title: string;
  readonly body: string;
  readonly ownerUserId: string | null;
  readonly reviewDate: string | null;
  // Every item sits in one learning area with a content type that suits it.
  readonly areaId: string;
  readonly contentTypeId: string;
  // Optional YouTube/Vimeo embed URL shown above body text in the viewer.
  readonly videoUrl?: string | null;
}

export class PlacementError extends Error {
  constructor() {
    super("The content type does not belong to that learning area.");
  }
}

// Creates an item with its first draft version.
export async function createLibraryItem(db: TenantDb, item: NewItem, actor: string): Promise<string> {
  return db.transaction(async (tx) => {
    if (!(await checkPlacement(tx, item.areaId, item.contentTypeId))) throw new PlacementError();
    const [row] = await tx
      .insert(libraryItems)
      .values({
        title: item.title,
        ownerUserId: item.ownerUserId,
        reviewDate: item.reviewDate,
        areaId: item.areaId,
        contentTypeId: item.contentTypeId,
        videoUrl: item.videoUrl ?? null,
        changedBy: actor,
      })
      .returning({ id: libraryItems.id });
    if (!row) throw new Error("Item was not created.");
    await tx.insert(libraryItemVersions).values({ itemId: row.id, version: 1, body: item.body, changedBy: actor });
    await recordActivity(tx, {
      actor,
      action: "library.item_created",
      entityType: "library_item",
      entityId: row.id,
      details: { area_id: item.areaId, content_type_id: item.contentTypeId },
    });
    return row.id;
  });
}

// Moves an item to another area or type. Saving also confirms an item the
// migration placed in Common Staff Learning.
export async function placeItem(db: TenantDb, itemId: string, placement: { areaId: string; contentTypeId: string }, actor: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(libraryItems).where(eq(libraryItems.id, itemId));
    if (!before) return false;
    if (!(await checkPlacement(tx, placement.areaId, placement.contentTypeId))) throw new PlacementError();
    await tx
      .update(libraryItems)
      .set({ ...placement, needsAreaReview: false, updatedAt: new Date(), changedBy: actor })
      .where(eq(libraryItems.id, itemId));
    await recordActivity(tx, {
      actor,
      action: "library.item_placed",
      entityType: "library_item",
      entityId: itemId,
      details: {
        from: { area_id: before.areaId, content_type_id: before.contentTypeId },
        to: { area_id: placement.areaId, content_type_id: placement.contentTypeId },
      },
    });
    return true;
  });
}

// Saves the draft: edits the open draft version, or starts a new one after
// the last published version. Title, owner and review date update in place.
export async function saveDraft(
  db: TenantDb,
  itemId: string,
  change: { title: string; body: string; changeNote: string | null; ownerUserId: string | null; reviewDate: string | null; videoUrl?: string | null },
  actor: string,
): Promise<number> {
  return db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .update(libraryItems)
      .set({ title: change.title, ownerUserId: change.ownerUserId, reviewDate: change.reviewDate, ...(change.videoUrl !== undefined ? { videoUrl: change.videoUrl } : {}), updatedAt: now, changedBy: actor })
      .where(eq(libraryItems.id, itemId));
    const [draft] = await tx
      .select({ id: libraryItemVersions.id, version: libraryItemVersions.version })
      .from(libraryItemVersions)
      .where(and(eq(libraryItemVersions.itemId, itemId), isNull(libraryItemVersions.publishedAt)));
    let version: number;
    if (draft) {
      await tx
        .update(libraryItemVersions)
        .set({ body: change.body, changeNote: change.changeNote, updatedAt: now, changedBy: actor })
        .where(eq(libraryItemVersions.id, draft.id));
      version = draft.version;
    } else {
      const [last] = await tx.select({ v: max(libraryItemVersions.version) }).from(libraryItemVersions).where(eq(libraryItemVersions.itemId, itemId));
      version = (last?.v ?? 0) + 1;
      await tx.insert(libraryItemVersions).values({ itemId, version, body: change.body, changeNote: change.changeNote, changedBy: actor });
    }
    await recordActivity(tx, { actor, action: "library.draft_saved", entityType: "library_item", entityId: itemId, details: { version } });
    return version;
  });
}

// Publishes the open draft. Earlier published versions stay as history.
export async function publishDraft(db: TenantDb, itemId: string, actor: string): Promise<number | null> {
  return db.transaction(async (tx) => {
    const [draft] = await tx
      .select({ id: libraryItemVersions.id, version: libraryItemVersions.version })
      .from(libraryItemVersions)
      .where(and(eq(libraryItemVersions.itemId, itemId), isNull(libraryItemVersions.publishedAt)));
    if (!draft) return null;
    const now = new Date();
    await tx.update(libraryItemVersions).set({ publishedAt: now, publishedBy: actor, updatedAt: now }).where(eq(libraryItemVersions.id, draft.id));
    await tx
      .update(libraryItems)
      .set({ status: "published", publishedVersion: draft.version, updatedAt: now, changedBy: actor })
      .where(eq(libraryItems.id, itemId));
    // Change alerts (E10) will react to this entry for items staff must confirm.
    await recordActivity(tx, { actor, action: "library.published", entityType: "library_item", entityId: itemId, details: { version: draft.version } });
    return draft.version;
  });
}

export interface ListOptions {
  readonly publishedOnly: boolean;
  // The areas the viewer may see (see visibleAreas). Required, so no list
  // can forget the area rule.
  readonly areas: VisibleAreas;
  readonly areaId?: string;
  readonly contentTypeId?: string;
}

export async function listLibraryItems(db: TenantDb, options: ListOptions) {
  const where: (SQL | undefined)[] = [areaIdsOrAll(options.areas)];
  if (options.areaId) where.push(eq(libraryItems.areaId, options.areaId));
  if (options.contentTypeId) where.push(eq(libraryItems.contentTypeId, options.contentTypeId));
  const rows = await db
    .select({ item: libraryItems, typeLabel: contentTypes.label })
    .from(libraryItems)
    .innerJoin(contentTypes, eq(libraryItems.contentTypeId, contentTypes.id))
    .where(and(...where))
    .orderBy(libraryItems.title);
  const items = rows.map((r) => ({ ...r.item, typeLabel: r.typeLabel }));
  return options.publishedOnly ? items.filter((r) => r.publishedVersion !== null && r.status === "published") : items;
}

export async function getLibraryItem(db: TenantDb, itemId: string) {
  const [item] = await db.select().from(libraryItems).where(eq(libraryItems.id, itemId));
  if (!item) return null;
  const versions = await db.select().from(libraryItemVersions).where(eq(libraryItemVersions.itemId, itemId)).orderBy(desc(libraryItemVersions.version));
  return {
    item,
    versions,
    published: versions.find((v) => v.version === item.publishedVersion) ?? null,
    draft: versions.find((v) => v.publishedAt === null) ?? null,
  };
}

// Searches titles and published content. Staff only ever search published
// versions; editors also find drafts by title.
export async function searchLibrary(db: TenantDb, query: string, options: ListOptions) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  if (words.length === 0) return listLibraryItems(db, options);
  const items = await listLibraryItems(db, options);
  const published = await db
    .select({ itemId: libraryItemVersions.itemId, version: libraryItemVersions.version, body: libraryItemVersions.body })
    .from(libraryItemVersions);
  const bodyOf = new Map<string, string>();
  for (const item of items) {
    const v = published.find((p) => p.itemId === item.id && p.version === item.publishedVersion);
    if (v) bodyOf.set(item.id, v.body.toLowerCase());
  }
  return items.filter((item) => {
    const haystack = `${item.title.toLowerCase()} ${bodyOf.get(item.id) ?? ""}`;
    return words.every((w) => haystack.includes(w));
  });
}

// Items whose review date has passed or falls within the next `days` days,
// soonest first. Owners use this to keep content current.
export async function itemsDueForReview(db: TenantDb, today: string, areas: VisibleAreas, days = 30) {
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + days);
  const until = limit.toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(libraryItems)
    .where(and(lte(libraryItems.reviewDate, until), areaIdsOrAll(areas)))
    .orderBy(asc(libraryItems.reviewDate));
  return rows.filter((r) => r.status !== "retired").map((r) => ({ ...r, overdue: (r.reviewDate ?? "") < today }));
}

// Records an uploaded file against an item, with an activity log entry.
export async function attachFileToItem(
  db: TenantDb,
  itemId: string,
  file: {
    storageKey: string;
    name: string;
    contentType: string;
    size: number;
    sha256: string;
    // Set by the caller once conversion to a viewable PDF has been tried
    // (ADR 0021); left undefined for a type that is viewed from the
    // original and needs no conversion.
    conversionStatus?: "ready" | "failed";
    renditionKey?: string;
  },
  actor: string,
): Promise<string> {
  return db.transaction(async (tx) => {
    const renditionConvertedAt = file.conversionStatus === "ready" ? new Date() : undefined;
    const [row] = await tx.insert(files).values({ ...file, renditionConvertedAt, changedBy: actor }).returning({ id: files.id });
    if (!row) throw new Error("File was not recorded.");
    await tx.insert(libraryItemFiles).values({ itemId, fileId: row.id, changedBy: actor });
    await recordActivity(tx, { actor, action: "library.file_attached", entityType: "library_item", entityId: itemId, details: { file_id: row.id, size: file.size } });
    return row.id;
  });
}

export async function itemFiles(db: TenantDb, itemId: string) {
  return db
    .select({
      id: files.id,
      name: files.name,
      size: files.size,
      contentType: files.contentType,
      conversionStatus: files.conversionStatus,
    })
    .from(libraryItemFiles)
    .innerJoin(files, eq(libraryItemFiles.fileId, files.id))
    .where(eq(libraryItemFiles.itemId, itemId))
    .orderBy(files.name);
}

// Removes a file from an item. Returns the storage keys so the caller can
// delete the blobs from the file store after the DB transaction commits.
export async function detachFileFromItem(
  db: TenantDb,
  itemId: string,
  fileId: string,
  actor: string,
): Promise<{ storageKey: string; renditionKey: string | null }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ storageKey: files.storageKey, renditionKey: files.renditionKey })
      .from(files)
      .innerJoin(libraryItemFiles, eq(libraryItemFiles.fileId, files.id))
      .where(and(eq(files.id, fileId), eq(libraryItemFiles.itemId, itemId)));
    if (!row) throw new Error("File not found on this item.");
    await tx.delete(libraryItemFiles).where(and(eq(libraryItemFiles.itemId, itemId), eq(libraryItemFiles.fileId, fileId)));
    await tx.delete(files).where(eq(files.id, fileId));
    await recordActivity(tx, { actor, action: "library.file_removed", entityType: "library_item", entityId: itemId, details: { file_id: fileId } });
    return { storageKey: row.storageKey, renditionKey: row.renditionKey };
  });
}

// A file with the item it belongs to, so callers can check who may open it.
export async function fileWithItem(db: TenantDb, fileId: string) {
  const [row] = await db
    .select({ file: files, itemId: libraryItemFiles.itemId, itemStatus: libraryItems.status, itemAreaId: libraryItems.areaId })
    .from(files)
    .innerJoin(libraryItemFiles, eq(libraryItemFiles.fileId, files.id))
    .innerJoin(libraryItems, eq(libraryItems.id, libraryItemFiles.itemId))
    .where(eq(files.id, fileId));
  return row ?? null;
}
