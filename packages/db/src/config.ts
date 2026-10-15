// Database settings for development and tests. Production connection
// details come from the managed secret store, never from code or files
// in this repository (Product Architecture v1, section 9).

export interface DatabaseConfig {
  // Server connection used to create and drop databases; points at the
  // server's maintenance database ("postgres").
  readonly serverUrl: string;
  readonly controlDatabase: string;
  // Fictional development tenants (Development Roadmap v1, section 11).
  readonly devTenantDatabases: readonly string[];
}

export const DEFAULT_SERVER_URL = "postgres://localhost:5432/postgres";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  return {
    serverUrl: env.MANTLE_PG_SERVER_URL || DEFAULT_SERVER_URL,
    controlDatabase: env.MANTLE_PG_CONTROL_DB || "mantle_control",
    devTenantDatabases: (env.MANTLE_PG_DEV_TENANT_DBS || "mantle_tenant_alpha,mantle_tenant_beta")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  };
}

// Swaps the database name in a connection URL.
export function databaseUrl(serverUrl: string, database: string): string {
  const url = new URL(serverUrl);
  url.pathname = `/${database}`;
  return url.toString();
}
