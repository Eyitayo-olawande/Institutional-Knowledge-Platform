import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import type { ControlDb } from "./client.ts";

// Kept apart from the client so apps that only query the control database
// do not bundle the migration files. Used by scripts and tests.
const MIGRATIONS = fileURLToPath(new URL("../../migrations/control", import.meta.url));

// Applies every pending control database migration. Safe to run again.
export async function migrateControl(db: ControlDb): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS });
}
