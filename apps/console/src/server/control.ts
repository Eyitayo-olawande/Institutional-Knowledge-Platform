import "server-only";
import { databaseUrl, loadConfig } from "@mantle/db";
import { connectControl } from "@mantle/db/control";
import { connectTenant, type TenantDb } from "@mantle/db/tenant";

// One control database pool per server process, kept across hot reloads.
const globalForControl = globalThis as unknown as { mantleConsoleControl?: ReturnType<typeof connectControl> };

export function control() {
  if (!globalForControl.mantleConsoleControl) {
    const config = loadConfig();
    globalForControl.mantleConsoleControl = connectControl(databaseUrl(config.serverUrl, config.controlDatabase));
  }
  return globalForControl.mantleConsoleControl.db;
}

export function serverUrl(): string {
  return loadConfig().serverUrl;
}

// Design Streams sign in arrives with the identity epic (E3). Until then
// the console only opens in development.
export function consoleOpen(): boolean {
  return process.env.NODE_ENV !== "production";
}

// One pool per tenant database, for assisted onboarding tasks such as
// naming the first administrator.
const tenantPools = globalThis as unknown as { mantleConsoleTenants?: Map<string, TenantDb> };

export function tenantDbByName(databaseName: string): TenantDb {
  tenantPools.mantleConsoleTenants ??= new Map();
  let db = tenantPools.mantleConsoleTenants.get(databaseName);
  if (!db) {
    db = connectTenant(loadConfig().serverUrl, databaseName).db;
    tenantPools.mantleConsoleTenants.set(databaseName, db);
  }
  return db;
}
