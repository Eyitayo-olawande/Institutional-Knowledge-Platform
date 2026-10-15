import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import pg from "pg";
import * as schema from "./schema.ts";

export type ControlDb = NodePgDatabase<typeof schema>;

const MIGRATIONS = fileURLToPath(new URL("../../migrations/control", import.meta.url));

export function connectControl(url: string): { db: ControlDb; close: () => Promise<void> } {
  const pool = new pg.Pool({ connectionString: url });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

// Applies every pending control database migration. Safe to run again.
export async function migrateControl(db: ControlDb): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS });
}
