import { and, asc, desc, eq, inArray, isNull, lte, max, ne, type SQL } from "drizzle-orm";
import { recordActivity } from "./activity.ts";
import { areaIdsOrAll, checkPlacement, type VisibleAreas } from "./areas.ts";
import type { TenantDb } from "./client.ts";
import { addNotice } from "./notices.ts";
import { assignments, changeAlertAcknowledgements, changeClassification, contentChangeAlerts, contentTypes, files, itemViews, libraryItemAccessRules, libraryItemFiles, libraryItems, libraryItemVersions, moduleItems, pathStages, people, stageModules } from "./schema.ts";

export type ItemVisibility = "area" | "role_level" | "restricted";

export type ChangeClassification = typeof changeClassification.enumValues[number];

type Tx = Parameters<Parameters<TenantDb["transaction"]>[0]>[0];

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
// changeAlert is required on re-publishes (when the item already has a
// publishedVersion); first-time publishes leave it undefined.
export async function publishDraft(
  db: TenantDb,
  itemId: string,
  actor: string,
  changeAlert?: { classification: ChangeClassification; description: string },
): Promise<number | null> {
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ publishedVersion: libraryItems.publishedVersion }).from(libraryItems).where(eq(libraryItems.id, itemId));
    const previousVersion = current?.publishedVersion ?? null;

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
    if (changeAlert && previousVersion !== null) {
      await createChangeAlerts(tx, itemId, previousVersion, draft.version, changeAlert, actor);
    }
    await recordActivity(tx, { actor, action: "library.published", entityType: "library_item", entityId: itemId, details: { version: draft.version } });
    return draft.version;
  });
}

// Creates an alert and queues acknowledgement rows for all affected staff.
// Called inside the publishDraft transaction.
async function createChangeAlerts(
  tx: Tx,
  itemId: string,
  previousVersion: number,
  newVersion: number,
  changeAlert: { classification: ChangeClassification; description: string },
  actor: string,
): Promise<void> {
  const [alertRow] = await tx
    .insert(contentChangeAlerts)
    .values({
      itemId,
      previousVersion,
      newVersion,
      classification: changeAlert.classification,
      changeDescription: changeAlert.description,
      createdBy: actor,
      changedBy: actor,
    })
    .onConflictDoNothing()
    .returning({ id: contentChangeAlerts.id });

  // If the alert already exists (retry), skip sending notices again.
  if (!alertRow) return;

  // Find all active people who: have an active assignment for a path that
  // has a stage with a module containing this item, AND have already viewed
  // this item in that module (item_views row exists).
  const moduleIds = await tx
    .selectDistinct({ moduleId: moduleItems.moduleId })
    .from(moduleItems)
    .where(eq(moduleItems.itemId, itemId));

  if (moduleIds.length === 0) return;

  const mIds = moduleIds.map((r) => r.moduleId);

  // People who have viewed this item and have an assignment that includes one
  // of those modules, joined to get their userId for notices.
  const affected = await tx
    .selectDistinct({
      personId: itemViews.personId,
      userId: people.userId,
    })
    .from(itemViews)
    .innerJoin(people, eq(people.id, itemViews.personId))
    .innerJoin(stageModules, eq(stageModules.moduleId, itemViews.moduleId))
    .innerJoin(pathStages, eq(pathStages.id, stageModules.stageId))
    .innerJoin(assignments, eq(assignments.pathId, pathStages.pathId))
    .where(
      and(
        eq(itemViews.itemId, itemId),
        inArray(itemViews.moduleId, mIds),
        eq(assignments.personId, itemViews.personId),
      ),
    );

  if (affected.length === 0) return;

  const now = new Date();

  await tx
    .insert(changeAlertAcknowledgements)
    .values(
      affected.map((r) => ({
        alertId: alertRow.id,
        personId: r.personId,
        notifiedAt: now,
        changedBy: actor,
      })),
    )
    .onConflictDoNothing();

  for (const { userId } of affected) {
    if (!userId) continue;
    await addNotice(tx, {
      userId,
      event: `change_alert.${alertRow.id}`,
      subject: "A learning item you have read has been updated",
      body: `Classification: ${changeAlert.classification}. ${changeAlert.description ? changeAlert.description : "Please re-read the item and confirm you have reviewed the update."}`,
      link: `/library/${itemId}`,
    });
  }
}

export interface ListOptions {
  readonly publishedOnly: boolean;
  // The areas the viewer may see (see visibleAreas). Required, so no list
  // can forget the area rule.
  readonly areas: VisibleAreas;
  readonly areaId?: string;
  readonly contentTypeId?: string;
  // When set for a non-editor, item-level visibility rules are applied.
  // Editors (areas === 'all') always see everything regardless.
  readonly person?: { id: string; roleLevelId: string | null };
}

export async function listLibraryItems(db: TenantDb, options: ListOptions) {
  const where: (SQL | undefined)[] = [areaIdsOrAll(options.areas), ne(libraryItems.status, "retired"), eq(libraryItems.assessmentOnly, false)];
  if (options.areaId) where.push(eq(libraryItems.areaId, options.areaId));
  if (options.contentTypeId) where.push(eq(libraryItems.contentTypeId, options.contentTypeId));
  const rows = await db
    .select({ item: libraryItems, typeLabel: contentTypes.label })
    .from(libraryItems)
    .innerJoin(contentTypes, eq(libraryItems.contentTypeId, contentTypes.id))
    .where(and(...where))
    .orderBy(libraryItems.title);
  let items = rows.map((r) => ({ ...r.item, typeLabel: r.typeLabel }));
  if (options.publishedOnly) {
    items = items.filter((r) => r.publishedVersion !== null && r.status === "published");
  }
  // Apply item-level visibility only for non-editors with a person context.
  if (options.areas !== "all" && options.person) {
    const person = options.person;
    const narrowed = items.filter((r) => r.visibility !== "area");
    if (narrowed.length > 0) {
      const narrowedIds = narrowed.map((r) => r.id);
      const rules = await db
        .select()
        .from(libraryItemAccessRules)
        .where(inArray(libraryItemAccessRules.itemId, narrowedIds));
      const rulesByItem = new Map<string, typeof rules>();
      for (const r of rules) {
        const existing = rulesByItem.get(r.itemId) ?? [];
        existing.push(r);
        rulesByItem.set(r.itemId, existing);
      }
      items = items.filter((item) => {
        if (item.visibility === "area") return true;
        const itemRules = rulesByItem.get(item.id) ?? [];
        if (item.visibility === "role_level") {
          return person.roleLevelId !== null &&
            itemRules.some((r) => r.kind === "role_level" && r.refId === person.roleLevelId);
        }
        // restricted
        return itemRules.some((r) => r.kind === "person" && r.refId === person.id);
      });
    }
  }
  return items;
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

// Marks an item as retired so it no longer appears in the library or search.
// The item and all its versions are kept for the activity log and audit trail.
export async function retireItem(db: TenantDb, itemId: string, actor: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(libraryItems)
      .set({ status: "retired", updatedAt: new Date(), changedBy: actor })
      .where(eq(libraryItems.id, itemId));
    await recordActivity(tx, { actor, action: "library.retired", entityType: "library_item", entityId: itemId, details: {} });
  });
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

// ------------------------------------------------- change alert queries ----

export type OutstandingAlert = {
  acknowledgementId: string;
  classification: ChangeClassification;
  description: string;
};

// Returns the first unacknowledged change alert for a specific item/person pair.
// Used to render the acknowledgement banner in the library item viewer.
export async function getOutstandingChangeAlertForItem(
  db: TenantDb,
  personId: string,
  itemId: string,
): Promise<OutstandingAlert | null> {
  const [row] = await db
    .select({
      acknowledgementId: changeAlertAcknowledgements.id,
      classification: contentChangeAlerts.classification,
      description: contentChangeAlerts.changeDescription,
    })
    .from(changeAlertAcknowledgements)
    .innerJoin(contentChangeAlerts, eq(changeAlertAcknowledgements.alertId, contentChangeAlerts.id))
    .where(
      and(
        eq(changeAlertAcknowledgements.personId, personId),
        eq(contentChangeAlerts.itemId, itemId),
        isNull(changeAlertAcknowledgements.acknowledgedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

// Returns true if the person has any unacknowledged change alerts for items
// within the given module. Used as Gate 1.5 in canCompleteModule.
export async function hasOutstandingChangeAlerts(
  db: TenantDb,
  personId: string,
  moduleId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: changeAlertAcknowledgements.id })
    .from(changeAlertAcknowledgements)
    .innerJoin(contentChangeAlerts, eq(changeAlertAcknowledgements.alertId, contentChangeAlerts.id))
    .innerJoin(moduleItems, eq(contentChangeAlerts.itemId, moduleItems.itemId))
    .where(
      and(
        eq(changeAlertAcknowledgements.personId, personId),
        eq(moduleItems.moduleId, moduleId),
        isNull(changeAlertAcknowledgements.acknowledgedAt),
      ),
    )
    .limit(1);
  return !!row;
}

// Marks an acknowledgement as done. Only succeeds when the row belongs to
// personId and is not already acknowledged (prevents double-submit and
// cross-person spoofing).
export async function acknowledgeAlert(
  db: TenantDb,
  acknowledgementId: string,
  personId: string,
): Promise<void> {
  const now = new Date();
  const [row] = await db
    .select({ newVersion: contentChangeAlerts.newVersion })
    .from(changeAlertAcknowledgements)
    .innerJoin(contentChangeAlerts, eq(changeAlertAcknowledgements.alertId, contentChangeAlerts.id))
    .where(
      and(
        eq(changeAlertAcknowledgements.id, acknowledgementId),
        eq(changeAlertAcknowledgements.personId, personId),
        isNull(changeAlertAcknowledgements.acknowledgedAt),
      ),
    )
    .limit(1);
  if (!row) return;
  await db
    .update(changeAlertAcknowledgements)
    .set({ acknowledgedAt: now, acknowledgedVersion: row.newVersion, updatedAt: now })
    .where(eq(changeAlertAcknowledgements.id, acknowledgementId));
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

// ------------------------------------------- item-level access rules ----

// Returns the access rules for a single item.
export async function getItemAccessRules(db: TenantDb, itemId: string) {
  return db
    .select()
    .from(libraryItemAccessRules)
    .where(eq(libraryItemAccessRules.itemId, itemId));
}

// Replaces the access rules and visibility setting for an item atomically.
// refIds are role_level IDs when visibility = 'role_level', person IDs when
// visibility = 'restricted'. When visibility = 'area' the rules are cleared.
export async function setItemAccessRules(
  db: TenantDb,
  itemId: string,
  visibility: ItemVisibility,
  refIds: string[],
  actor: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(libraryItems)
      .set({ visibility, updatedAt: new Date(), changedBy: actor })
      .where(eq(libraryItems.id, itemId));
    await tx.delete(libraryItemAccessRules).where(eq(libraryItemAccessRules.itemId, itemId));
    if (visibility !== "area" && refIds.length > 0) {
      const kind = visibility === "role_level" ? "role_level" : "person";
      await tx.insert(libraryItemAccessRules).values(
        refIds.map((refId) => ({ itemId, kind, refId, changedBy: actor })),
      ).onConflictDoNothing();
    }
    await recordActivity(tx, {
      actor,
      action: "library.access_rules_set",
      entityType: "library_item",
      entityId: itemId,
      details: { visibility, ref_count: refIds.length },
    });
  });
}

// Sets the requiresAttestation flag on an item.
export async function setRequiresAttestation(
  db: TenantDb,
  itemId: string,
  requiresAttestation: boolean,
  actor: string,
): Promise<void> {
  await db
    .update(libraryItems)
    .set({ requiresAttestation, updatedAt: new Date(), changedBy: actor })
    .where(eq(libraryItems.id, itemId));
  await recordActivity(db, {
    actor,
    action: "library.attestation_flag_set",
    entityType: "library_item",
    entityId: itemId,
    details: { requires_attestation: requiresAttestation },
  });
}

// Checks whether a person can see an item, respecting item-level visibility.
// Editors always pass; this is for learner-context item-page access.
export async function canPersonSeeItem(
  db: TenantDb,
  itemId: string,
  person: { id: string; roleLevelId: string | null },
): Promise<boolean> {
  const [item] = await db
    .select({ visibility: libraryItems.visibility })
    .from(libraryItems)
    .where(eq(libraryItems.id, itemId));
  if (!item) return false;
  if (item.visibility === "area") return true;
  const rules = await db
    .select()
    .from(libraryItemAccessRules)
    .where(eq(libraryItemAccessRules.itemId, itemId));
  if (item.visibility === "role_level") {
    return person.roleLevelId !== null &&
      rules.some((r) => r.kind === "role_level" && r.refId === person.roleLevelId);
  }
  return rules.some((r) => r.kind === "person" && r.refId === person.id);
}
