import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

export type ControlDb = NodePgDatabase<typeof schema>;

export function connectControl(url: string): { db: ControlDb; close: () => Promise<void> } {
  const pool = new pg.Pool({ connectionString: url });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}
