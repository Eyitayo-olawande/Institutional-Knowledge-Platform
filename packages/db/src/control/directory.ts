import { eq } from "drizzle-orm";
import type { ControlDb } from "./client.ts";
import { tenants } from "./schema.ts";

// Control database lookup behind tenant resolution. Matches the
// TenantDirectory interface in @mantle/platform/tenancy. Only routing
// fields are returned; the control database holds no personal data.
export function controlTenantDirectory(db: ControlDb) {
  return {
    async findByDomain(domain: string) {
      const [row] = await db
        .select({ id: tenants.id, name: tenants.name, domain: tenants.domain, tier: tenants.tier, status: tenants.status })
        .from(tenants)
        .where(eq(tenants.domain, domain))
        .limit(1);
      return row;
    },
  };
}
