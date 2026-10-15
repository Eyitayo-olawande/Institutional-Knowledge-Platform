import type { ControlDb } from "./client.ts";
import { plans, tenants } from "./schema.ts";

// Fictional development data only (Development Roadmap v1, section 11).
// *.localhost domains open in a browser on the developer's own machine.
const SYSTEM = "system:dev_seed";

export const DEV_TENANTS = [
  { name: "Alpha Insurance (fictional)", domain: "alpha.localhost", databaseName: "mantle_tenant_alpha", tier: "dedicated" },
  { name: "Beta Assurance (fictional)", domain: "beta.localhost", databaseName: "mantle_tenant_beta", tier: "shared" },
] as const;

export async function seedControl(db: ControlDb): Promise<void> {
  const [plan] = await db
    .insert(plans)
    .values({ code: "dev", name: "Development plan", changedBy: SYSTEM })
    .onConflictDoUpdate({ target: plans.code, set: { name: "Development plan" } })
    .returning({ id: plans.id });
  for (const tenant of DEV_TENANTS) {
    await db
      .insert(tenants)
      .values({ ...tenant, hostingLocation: "local", status: "active", planId: plan?.id, changedBy: SYSTEM })
      .onConflictDoNothing({ target: tenants.domain });
  }
}
