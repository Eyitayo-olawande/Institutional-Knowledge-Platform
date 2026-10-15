import "server-only";
import { loadConfig } from "@mantle/db";
import { connectTenant, type TenantDb } from "@mantle/db/tenant";
import type { TenantRecord } from "@mantle/platform/tenancy";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authFor, requestHost } from "./auth.ts";
import { resolveRequestTenant } from "./tenant.ts";

export function hasRole(roles: string | undefined | null, role: string): boolean {
  return (roles ?? "").split(",").map((r) => r.trim()).includes(role);
}

// One pool per tenant database per server process.
const pools = globalThis as unknown as { mantleTenantPools?: Map<string, TenantDb> };

export function tenantDb(tenant: TenantRecord): TenantDb {
  pools.mantleTenantPools ??= new Map();
  let db = pools.mantleTenantPools.get(tenant.databaseName);
  if (!db) {
    db = connectTenant(loadConfig().serverUrl, tenant.databaseName).db;
    pools.mantleTenantPools.set(tenant.databaseName, db);
  }
  return db;
}

// Resolves the tenant and the signed in person, and checks a role on the
// server (Product Architecture v1, section 7). Redirects otherwise.
export async function requireRole(role: string) {
  const resolution = await resolveRequestTenant();
  if (!resolution.ok) redirect("/");
  const { host, protocol } = await requestHost();
  const session = await authFor(resolution.tenant, host, protocol).api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  if (!hasRole((session.user as { roles?: string }).roles, role)) redirect("/");
  return { tenant: resolution.tenant, user: session.user, db: tenantDb(resolution.tenant) };
}
