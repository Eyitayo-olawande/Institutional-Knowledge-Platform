import { migrate } from "drizzle-orm/node-postgres/migrator";
import { migrationsDir } from "../migrations_dir.ts";
import { connectTenant } from "./client.ts";

// Applies every pending tenant migration to one tenant database.
export async function migrateTenant(serverUrl: string, databaseName: string): Promise<void> {
  const { db, close } = connectTenant(serverUrl, databaseName);
  try {
    await migrate(db, { migrationsFolder: migrationsDir("tenant") });
  } finally {
    await close();
  }
}
