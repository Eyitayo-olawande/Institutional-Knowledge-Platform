import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { databaseUrl } from "../config.ts";
import * as schema from "./schema.ts";

export type TenantDb = NodePgDatabase<typeof schema>;

const SAFE_NAME = /^[a-z][a-z0-9_]{0,62}$/;

// Opens a connection pool to one tenant's own database. Callers obtain the
// database name from the resolved tenant, never from user input.
export function connectTenant(serverUrl: string, databaseName: string): { db: TenantDb; close: () => Promise<void> } {
  if (!SAFE_NAME.test(databaseName)) throw new Error(`Unsafe database name: ${databaseName}`);
  const pool = new pg.Pool({ connectionString: databaseUrl(serverUrl, databaseName), max: 5 });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}
