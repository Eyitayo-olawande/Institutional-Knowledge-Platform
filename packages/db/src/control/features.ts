import { and, eq } from "drizzle-orm";
import type { ControlDb } from "./client.ts";
import { featureSwitches } from "./schema.ts";

// Every switchable feature and its default. Unfinished features default to
// off (CLAUDE.md); a tenant row overrides the default for that tenant.
export const FEATURES = {
  people_import: { defaultOn: true },
  knowledge_library: { defaultOn: false },
} as const;

export type Feature = keyof typeof FEATURES;

export function isFeature(value: string): value is Feature {
  return Object.hasOwn(FEATURES, value);
}

export async function featureStates(control: ControlDb, tenantId: string): Promise<Record<Feature, boolean>> {
  const rows = await control.select().from(featureSwitches).where(eq(featureSwitches.tenantId, tenantId));
  const states = Object.fromEntries(Object.entries(FEATURES).map(([k, v]) => [k, v.defaultOn])) as Record<Feature, boolean>;
  for (const row of rows) if (isFeature(row.feature)) states[row.feature] = row.enabled;
  return states;
}

export async function isFeatureOn(control: ControlDb, tenantId: string, feature: Feature): Promise<boolean> {
  return (await featureStates(control, tenantId))[feature];
}

export async function setFeature(
  control: ControlDb,
  tenantId: string,
  feature: Feature,
  enabled: boolean,
  changedBy: string,
): Promise<void> {
  const now = new Date();
  await control
    .insert(featureSwitches)
    .values({ tenantId, feature, enabled, changedBy, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: [featureSwitches.tenantId, featureSwitches.feature], set: { enabled, changedBy, updatedAt: now } });
}

export async function clearFeature(control: ControlDb, tenantId: string, feature: Feature): Promise<void> {
  await control.delete(featureSwitches).where(and(eq(featureSwitches.tenantId, tenantId), eq(featureSwitches.feature, feature)));
}
