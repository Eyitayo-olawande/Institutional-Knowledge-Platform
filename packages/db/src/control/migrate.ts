import { migrate } from "drizzle-orm/node-postgres/migrator";
import { migrationsDir } from "../migrations_dir.ts";
import type { ControlDb } from "./client.ts";

// Applies every pending control database migration. Safe to run again.
export async function migrateControl(db: ControlDb): Promise<void> {
  await migrate(db, { migrationsFolder: migrationsDir("control") });
}
