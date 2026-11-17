import { and, asc, eq } from "drizzle-orm";
import { recordActivity } from "./activity.ts";
import type { TenantDb } from "./client.ts";
import { libraryItems, people, staffAttestations } from "./schema.ts";

export async function getAttestation(db: TenantDb, personId: string, itemId: string, version: number) {
  const [row] = await db
    .select()
    .from(staffAttestations)
    .where(
      and(
        eq(staffAttestations.personId, personId),
        eq(staffAttestations.itemId, itemId),
        eq(staffAttestations.version, version),
      ),
    );
  return row ?? null;
}

export async function createAttestation(
  db: TenantDb,
  personId: string,
  itemId: string,
  version: number,
  actor: string,
): Promise<boolean> {
  const [row] = await db
    .insert(staffAttestations)
    .values({ personId, itemId, version, changedBy: actor })
    .onConflictDoNothing()
    .returning({ id: staffAttestations.id });
  if (row) {
    await recordActivity(db, {
      actor,
      action: "library.attested",
      entityType: "library_item",
      entityId: itemId,
      details: { person_id: personId, version },
    });
  }
  return !!row;
}

// Overview for the admin report: all published items requiring attestation,
// with the published version number. Callers fetch per-person detail separately.
export async function listAttestationItems(db: TenantDb) {
  return db
    .select({
      id: libraryItems.id,
      title: libraryItems.title,
      publishedVersion: libraryItems.publishedVersion,
    })
    .from(libraryItems)
    .where(
      and(eq(libraryItems.requiresAttestation, true), eq(libraryItems.status, "published")),
    )
    .orderBy(asc(libraryItems.title));
}

// Per-item drill-down: all active staff with their attestation status for
// the item's current published version.
export async function listItemAttestationDetail(db: TenantDb, itemId: string) {
  const [item] = await db
    .select({ publishedVersion: libraryItems.publishedVersion })
    .from(libraryItems)
    .where(eq(libraryItems.id, itemId));
  if (!item?.publishedVersion) return [];
  const version = item.publishedVersion;

  const rows = await db
    .select({
      personId: people.id,
      fullName: people.fullName,
      employeeId: people.employeeId,
      attestedAt: staffAttestations.attestedAt,
    })
    .from(people)
    .leftJoin(
      staffAttestations,
      and(
        eq(staffAttestations.personId, people.id),
        eq(staffAttestations.itemId, itemId),
        eq(staffAttestations.version, version),
      ),
    )
    .where(eq(people.status, "active"))
    .orderBy(asc(people.fullName));

  return rows.map((p) => ({
    personId: p.personId,
    fullName: p.fullName,
    employeeId: p.employeeId,
    attested: p.attestedAt !== null,
    attestedAt: p.attestedAt ?? null,
  }));
}
