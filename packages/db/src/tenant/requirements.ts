import { and, eq, isNull } from "drizzle-orm";
import type { TenantDb } from "./client.ts";
import { itemApplicabilityRules, libraryItems, staffAttestations } from "./schema.ts";

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

  return [...new Set(rules.map((r) => r.itemId))];
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
export async function removeItemApplicabilityRule(db: TenantDb, ruleId: string, _actor: string): Promise<void> {
  await db.delete(itemApplicabilityRules).where(eq(itemApplicabilityRules.id, ruleId));
}
