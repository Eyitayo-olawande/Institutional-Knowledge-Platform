import { asc, eq } from "drizzle-orm";
import pg from "pg";
import { migrateTenant } from "../tenant/migrate.ts";
import type { ControlDb } from "./client.ts";
import { tenants } from "./schema.ts";

export interface NewTenant {
  readonly name: string;
  // Already normalised by tenant resolution rules (lower case, no port).
  readonly domain: string;
  readonly tier: "shared" | "dedicated";
  readonly hostingLocation: string;
  // Design Streams staff or system identifier.
  readonly changedBy: string;
}

export type ProvisionResult =
  | { readonly ok: true; readonly id: string; readonly databaseName: string }
  | { readonly ok: false; readonly reason: "domain_taken" | "database_taken" };

// Each tenant's own database name, derived from its domain.
export function databaseNameFor(domain: string): string {
  const slug = domain.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50);
  return `mantle_t_${slug}`;
}

// Creates the tenant's own database, then records the tenant in the control
// database. If migrating or recording fails, the new database is dropped
// again so no orphan is left behind.
export async function provisionTenant(
  control: ControlDb,
  serverUrl: string,
  tenant: NewTenant,
): Promise<ProvisionResult> {
  const databaseName = databaseNameFor(tenant.domain);
  const [existing] = await control.select({ id: tenants.id }).from(tenants).where(eq(tenants.domain, tenant.domain));
  if (existing) return { ok: false, reason: "domain_taken" };

  const admin = new pg.Client({ connectionString: serverUrl });
  await admin.connect();
  try {
    const found = await admin.query("select 1 from pg_database where datname = $1", [databaseName]);
    if (found.rowCount) return { ok: false, reason: "database_taken" };
    await admin.query(`create database ${databaseName}`);
    try {
      await migrateTenant(serverUrl, databaseName);
      const [row] = await control
        .insert(tenants)
        .values({ ...tenant, databaseName, status: "onboarding" })
        .returning({ id: tenants.id });
      if (!row) throw new Error("Tenant record was not created.");
      return { ok: true, id: row.id, databaseName };
    } catch (error) {
      await admin.query(`drop database if exists ${databaseName}`);
      throw error;
    }
  } finally {
    await admin.end();
  }
}

export async function listTenants(control: ControlDb) {
  return control
    .select({
      id: tenants.id,
      name: tenants.name,
      domain: tenants.domain,
      tier: tenants.tier,
      status: tenants.status,
      hostingLocation: tenants.hostingLocation,
      databaseName: tenants.databaseName,
    })
    .from(tenants)
    .orderBy(asc(tenants.name));
}

// Every tenant database name in the control database.
export async function tenantDatabaseNames(control: ControlDb): Promise<string[]> {
  const rows = await control.select({ databaseName: tenants.databaseName }).from(tenants);
  return rows.map((row) => row.databaseName);
}
