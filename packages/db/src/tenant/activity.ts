import { desc } from "drizzle-orm";
import type { TenantDb } from "./client.ts";
import { activityLog } from "./schema.ts";

export interface ActivityEntry {
  readonly actor: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId?: string | null;
  readonly details?: Record<string, unknown> | null;
}

// Anything with insert: the tenant database or an open transaction, so the
// log entry commits or rolls back together with the change it records.
type Writer = Pick<TenantDb, "insert">;

export async function recordActivity(db: Writer, entries: ActivityEntry | readonly ActivityEntry[]): Promise<void> {
  const list = Array.isArray(entries) ? entries : [entries];
  if (list.length === 0) return;
  await db.insert(activityLog).values(
    list.map((e) => ({ actor: e.actor, action: e.action, entityType: e.entityType, entityId: e.entityId ?? null, details: e.details ?? null })),
  );
}

export async function recentActivity(db: TenantDb, limit = 50) {
  return db.select().from(activityLog).orderBy(desc(activityLog.at)).limit(limit);
}
