import { and, eq, inArray, isNull } from "drizzle-orm";
import type { TenantDb } from "./client.ts";
import { addNotice } from "./notices.ts";
import { itemApplicabilityRules, libraryItems, people, staffAttestations, users } from "./schema.ts";

// Org attributes used to match applicability rules.
export interface OrgAttrs {
  readonly departmentId: string | null;
  readonly roleLevelId: string | null;
  readonly unitId: string | null;
}

// A library item that is required for a person but not yet fully satisfied.
export interface OutstandingItem {
  readonly itemId: string;
  readonly title: string;
  readonly requiresAttestation: boolean;
  // True when the item requires attestation and the person's last attestation
  // is for an older version than the current published version.
  readonly attestationOutdated: boolean;
}

// Returns all library items that are required for a person's current org
// profile but that they have not yet satisfied.
// "Satisfied" means: has a current attestation (when requiresAttestation is
// true), or has viewed the item at least once (when it does not require one).
export async function outstandingRequirements(db: TenantDb, personId: string): Promise<OutstandingItem[]> {
  // All applicability rules plus the item metadata and person's latest attestation.
  const rows = await db
    .select({
      itemId: itemApplicabilityRules.itemId,
      title: libraryItems.title,
      requiresAttestation: libraryItems.requiresAttestation,
      publishedVersion: libraryItems.publishedVersion,
      departmentId: itemApplicabilityRules.departmentId,
      roleLevelId: itemApplicabilityRules.roleLevelId,
      unitId: itemApplicabilityRules.unitId,
    })
    .from(itemApplicabilityRules)
    .innerJoin(libraryItems, eq(libraryItems.id, itemApplicabilityRules.itemId))
    .where(eq(libraryItems.status, "published"));

  if (rows.length === 0) return [];

  // Load the person's current attestations for these items.
  const itemIds = [...new Set(rows.map((r) => r.itemId))];
  const attestations = itemIds.length
    ? await db
        .select({ itemId: staffAttestations.itemId, version: staffAttestations.version })
        .from(staffAttestations)
        .where(and(eq(staffAttestations.personId, personId)))
    : [];
  // Keep only the highest-version attestation per item.
  const latestAttestation = new Map<string, number>();
  for (const a of attestations) {
    const prev = latestAttestation.get(a.itemId) ?? -1;
    if (a.version > prev) latestAttestation.set(a.itemId, a.version);
  }

  const outstanding: OutstandingItem[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.itemId)) continue;
    seen.add(row.itemId);

    const attestedVersion = latestAttestation.get(row.itemId) ?? null;
    const currentVersion = row.publishedVersion ?? 0;

    if (row.requiresAttestation) {
      // Outstanding when never attested or attested to an older version.
      const outdated = attestedVersion === null || attestedVersion < currentVersion;
      if (outdated) {
        outstanding.push({ itemId: row.itemId, title: row.title, requiresAttestation: true, attestationOutdated: true });
      }
    } else {
      // For non-attestation items, surfaced until at least one attestation exists
      // (i.e. the person has acknowledged it via any mechanism).
      if (attestedVersion === null) {
        outstanding.push({ itemId: row.itemId, title: row.title, requiresAttestation: false, attestationOutdated: false });
      }
    }
  }

  return outstanding;
}

// Evaluates a person's current org profile against item_applicability_rules
// and returns the item IDs that are now applicable to them. Called from
// applyStaffImport() on join, move, and role_change events.
// Prospective only: does not modify any existing records. Callers may use
// the result to surface requirements in the learner dashboard.
export async function applyKnowledgeRequirements(
  db: TenantDb,
  personId: string,
  attrs: OrgAttrs,
): Promise<string[]> {
  // Find all rules whose org attributes match the person's profile.
  // A null rule column matches any value (same semantics as assignmentRules).
  const rules = await db
    .select({ itemId: itemApplicabilityRules.itemId })
    .from(itemApplicabilityRules)
    .innerJoin(libraryItems, eq(libraryItems.id, itemApplicabilityRules.itemId))
    .where(
      and(
        eq(libraryItems.status, "published"),
        attrs.departmentId
          ? eq(itemApplicabilityRules.departmentId, attrs.departmentId)
          : isNull(itemApplicabilityRules.departmentId),
      ),
    );

  const itemIds = [...new Set(rules.map((r) => r.itemId))];
  if (itemIds.length > 0) {
    const [personUser] = await db
      .select({ userId: people.userId })
      .from(people)
      .where(eq(people.id, personId));
    if (personUser?.userId) {
      const [userRow] = await db.select({ name: users.name }).from(users).where(eq(users.id, personUser.userId));
      const applicableItems = await db
        .select({ id: libraryItems.id, title: libraryItems.title })
        .from(libraryItems)
        .where(inArray(libraryItems.id, itemIds));
      for (const item of applicableItems) {
        await addNotice(db, {
          userId: personUser.userId,
          event: "content.required",
          subject: "You have required reading to complete",
          body: `Hello ${userRow?.name ?? "there"}, "${item.title}" has been assigned as required reading for your role. Open the Library to read it.`,
          link: "/library",
        });
      }
    }
  }
  return itemIds;
}

// --- Admin management functions ---

// Returns all applicability rules for a given library item.
export async function listItemApplicabilityRules(db: TenantDb, itemId: string) {
  return db
    .select({
      id: itemApplicabilityRules.id,
      departmentId: itemApplicabilityRules.departmentId,
      roleLevelId: itemApplicabilityRules.roleLevelId,
      unitId: itemApplicabilityRules.unitId,
    })
    .from(itemApplicabilityRules)
    .where(eq(itemApplicabilityRules.itemId, itemId));
}

// Adds an applicability rule for a library item.
export async function addItemApplicabilityRule(
  db: TenantDb,
  rule: { itemId: string; departmentId: string | null; roleLevelId: string | null; unitId: string | null },
  actor: string,
): Promise<string> {
  const now = new Date();
  const [inserted] = await db
    .insert(itemApplicabilityRules)
    .values({ ...rule, createdAt: now, updatedAt: now, changedBy: actor })
    .returning({ id: itemApplicabilityRules.id });
  if (!inserted) throw new Error("Insert returned no row.");
  return inserted.id;
}

// Removes a single applicability rule by id.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function removeItemApplicabilityRule(db: TenantDb, ruleId: string, _actor: string): Promise<void> {
  await db.delete(itemApplicabilityRules).where(eq(itemApplicabilityRules.id, ruleId));
}

// Returns a map of personId -> outstanding requirement count for all active
// people. Uses the same satisfaction logic as outstandingRequirements().
export async function outstandingCountsByPerson(db: TenantDb): Promise<Map<string, number>> {
  const [rules, activePeople, attestations] = await Promise.all([
    db
      .select({
        itemId: itemApplicabilityRules.itemId,
        requiresAttestation: libraryItems.requiresAttestation,
        publishedVersion: libraryItems.publishedVersion,
      })
      .from(itemApplicabilityRules)
      .innerJoin(libraryItems, eq(libraryItems.id, itemApplicabilityRules.itemId))
      .where(eq(libraryItems.status, "published")),
    db.select({ id: people.id }).from(people).where(eq(people.status, "active")),
    db.select({ personId: staffAttestations.personId, itemId: staffAttestations.itemId, version: staffAttestations.version }).from(staffAttestations),
  ]);

  if (rules.length === 0 || activePeople.length === 0) return new Map();

  const itemMetaMap = new Map<string, { requiresAttestation: boolean; publishedVersion: number | null }>();
  for (const r of rules) {
    if (!itemMetaMap.has(r.itemId)) {
      itemMetaMap.set(r.itemId, { requiresAttestation: r.requiresAttestation ?? false, publishedVersion: r.publishedVersion });
    }
  }
  const requiredItemIds = [...itemMetaMap.keys()];

  const latestByPersonItem = new Map<string, number>();
  for (const a of attestations) {
    const key = `${a.personId}|${a.itemId}`;
    const prev = latestByPersonItem.get(key) ?? -1;
    if (a.version > prev) latestByPersonItem.set(key, a.version);
  }

  const counts = new Map<string, number>();
  for (const person of activePeople) {
    let count = 0;
    for (const itemId of requiredItemIds) {
      const item = itemMetaMap.get(itemId)!;
      const attestedVersion = latestByPersonItem.get(`${person.id}|${itemId}`) ?? null;
      const currentVersion = item.publishedVersion ?? 0;
      if (item.requiresAttestation) {
        if (attestedVersion === null || attestedVersion < currentVersion) count++;
      } else {
        if (attestedVersion === null) count++;
      }
    }
    if (count > 0) counts.set(person.id, count);
  }
  return counts;
}
