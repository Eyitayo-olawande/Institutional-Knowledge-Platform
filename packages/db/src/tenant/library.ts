import { and, asc, desc, eq, isNull, lte, max } from "drizzle-orm";
import { recordActivity } from "./activity.ts";
import type { TenantDb } from "./client.ts";
import { libraryItems, libraryItemVersions } from "./schema.ts";

export interface NewItem {
  readonly title: string;
  readonly body: string;
  readonly ownerUserId: string | null;
  readonly reviewDate: string | null;
}

// Creates an item with its first draft version.
export async function createLibraryItem(db: TenantDb, item: NewItem, actor: string): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(libraryItems)
      .values({ title: item.title, ownerUserId: item.ownerUserId, reviewDate: item.reviewDate, changedBy: actor })
      .returning({ id: libraryItems.id });
    if (!row) throw new Error("Item was not created.");
    await tx.insert(libraryItemVersions).values({ itemId: row.id, version: 1, body: item.body, changedBy: actor });
    await recordActivity(tx, { actor, action: "library.item_created", entityType: "library_item", entityId: row.id });
    return row.id;
  });
}

// Saves the draft: edits the open draft version, or starts a new one after
// the last published version. Title, owner and review date update in place.
export async function saveDraft(
  db: TenantDb,
  itemId: string,
  change: { title: string; body: string; changeNote: string | null; ownerUserId: string | null; reviewDate: string | null },
  actor: string,
): Promise<number> {
  return db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .update(libraryItems)
      .set({ title: change.title, ownerUserId: change.ownerUserId, reviewDate: change.reviewDate, updatedAt: now, changedBy: actor })
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

export async function listLibraryItems(db: TenantDb, options: { publishedOnly: boolean }) {
  const rows = await db.select().from(libraryItems).orderBy(libraryItems.title);
  return options.publishedOnly ? rows.filter((r) => r.publishedVersion !== null && r.status === "published") : rows;
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
export async function searchLibrary(db: TenantDb, query: string, options: { publishedOnly: boolean }) {
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
export async function itemsDueForReview(db: TenantDb, today: string, days = 30) {
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + days);
  const until = limit.toISOString().slice(0, 10);
  const rows = await db.select().from(libraryItems).where(lte(libraryItems.reviewDate, until)).orderBy(asc(libraryItems.reviewDate));
  return rows.filter((r) => r.status !== "retired").map((r) => ({ ...r, overdue: (r.reviewDate ?? "") < today }));
}
