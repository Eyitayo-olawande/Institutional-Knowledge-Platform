import "server-only";
import { loadConfig } from "@mantle/db";
import { connectTenant, visibleAreas, type TenantDb, type VisibleAreas } from "@mantle/db/tenant";
import { isFeatureOn, type Feature } from "@mantle/db/control";
import { can, type Action } from "@mantle/platform/identity";
import type { TenantRecord } from "@mantle/platform/tenancy";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authFor, requestHost } from "./auth.ts";
import { controlDb, resolveRequestTenant } from "./tenant.ts";

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

// Resolves the tenant and the signed in person, without a permission check.
export async function requireSignedIn() {
  const resolution = await resolveRequestTenant();
  if (!resolution.ok) redirect("/");
  const { host, protocol } = await requestHost();
  const session = await authFor(resolution.tenant, host, protocol).api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const roles = (session.user as { roles?: string }).roles ?? "";
  return { tenant: resolution.tenant, user: session.user, roles, db: tenantDb(resolution.tenant) };
}

// Resolves the tenant and the signed in person, and checks a permission on
// the server (Product Architecture v1, section 7). Redirects otherwise.
export async function requirePermission(action: Action) {
  const resolution = await resolveRequestTenant();
  if (!resolution.ok) redirect("/");
  const { host, protocol } = await requestHost();
  const session = await authFor(resolution.tenant, host, protocol).api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const roles = (session.user as { roles?: string }).roles ?? "";
  if (!can(roles, action)) redirect("/");
  return { tenant: resolution.tenant, user: session.user, roles, db: tenantDb(resolution.tenant) };
}

// Unfinished or switched off features are hidden per tenant (CLAUDE.md).
export async function featureOn(tenant: TenantRecord, feature: Feature): Promise<boolean> {
  return isFeatureOn(controlDb(), tenant.id, feature);
}

export async function requireFeature(tenant: TenantRecord, feature: Feature): Promise<void> {
  if (!(await featureOn(tenant, feature))) redirect("/");
}

// The learning areas the signed in person may see, for every library read.
export async function viewerAreas(ctx: { db: TenantDb; roles: string; user: { id: string } }): Promise<VisibleAreas> {
  return visibleAreas(ctx.db, { userId: ctx.user.id, allAreas: can(ctx.roles, "library.all_areas") });
}
