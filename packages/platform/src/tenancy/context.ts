import { AsyncLocalStorage } from "node:async_hooks";
import type { TenantRecord } from "./resolve.ts";

// The tenant context: once a request is resolved to a tenant, everything
// that runs for it reads the tenant from here. Data access (packages/db)
// will take its connection from this context, so code cannot reach a
// database without a resolved tenant (CLAUDE.md; ADR 0005).

const storage = new AsyncLocalStorage<TenantRecord>();

export function runWithTenant<T>(tenant: TenantRecord, fn: () => T): T {
  const current = storage.getStore();
  if (current && current.id !== tenant.id) {
    throw new Error("A tenant context is already active for a different tenant.");
  }
  return storage.run(tenant, fn);
}

export function currentTenant(): TenantRecord {
  const tenant = storage.getStore();
  if (!tenant) throw new Error("No tenant context. Resolve the tenant before reading data.");
  return tenant;
}

export function hasTenant(): boolean {
  return storage.getStore() !== undefined;
}
