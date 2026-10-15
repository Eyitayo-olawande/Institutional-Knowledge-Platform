import { eq } from "drizzle-orm";
import { recordActivity } from "./activity.ts";
import type { TenantDb } from "./client.ts";
import { wordingLabels } from "./schema.ts";

// Structural terms and their defaults. The industry template (E7) will set
// these at onboarding; the organisation can then change them.
export const WORDING_DEFAULTS = {
  department: { singular: "Department", plural: "Departments" },
  unit: { singular: "Unit", plural: "Units" },
  location: { singular: "Location", plural: "Locations" },
  role_level: { singular: "Role level", plural: "Role levels" },
} as const;

export type WordingKey = keyof typeof WORDING_DEFAULTS;
export type Wording = Record<WordingKey, { singular: string; plural: string }>;

export function isWordingKey(value: string): value is WordingKey {
  return Object.hasOwn(WORDING_DEFAULTS, value);
}

export async function wording(db: TenantDb): Promise<Wording> {
  const result = structuredClone(WORDING_DEFAULTS) as Wording;
  for (const row of await db.select().from(wordingLabels)) {
    if (isWordingKey(row.key)) result[row.key] = { singular: row.singular, plural: row.plural };
  }
  return result;
}

export async function setWording(
  db: TenantDb,
  key: WordingKey,
  label: { singular: string; plural: string },
  changedBy: string,
): Promise<void> {
  const singular = label.singular.trim();
  const plural = label.plural.trim();
  if (!singular || !plural) throw new Error("Both forms of the label are required.");
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(wordingLabels).where(eq(wordingLabels.key, key));
    const now = new Date();
    await tx
      .insert(wordingLabels)
      .values({ key, singular, plural, changedBy, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: wordingLabels.key, set: { singular, plural, changedBy, updatedAt: now } });
    await recordActivity(tx, {
      actor: changedBy,
      action: "wording.changed",
      entityType: "wording_label",
      entityId: key,
      details: { from: before ? { singular: before.singular, plural: before.plural } : WORDING_DEFAULTS[key], to: { singular, plural } },
    });
  });
}
