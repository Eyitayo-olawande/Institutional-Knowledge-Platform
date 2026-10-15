import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { TenantDb } from "./client.ts";
import { deliveryRecords, notices, users } from "./schema.ts";

export async function recipients(db: TenantDb, userIds: readonly string[]) {
  if (userIds.length === 0) return [];
  return db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, [...userIds]));
}

export async function addNotice(db: TenantDb, notice: { userId: string; event: string; subject: string; body: string }) {
  await db.insert(notices).values(notice);
}

export async function recordDelivery(
  db: TenantDb,
  record: { userId: string; event: string; channel: "email" | "in_app"; status: "sent" | "failed"; error?: string | null },
) {
  await db.insert(deliveryRecords).values({ ...record, error: record.error ?? null });
}

export async function noticesFor(db: TenantDb, userId: string, limit = 50) {
  return db.select().from(notices).where(eq(notices.userId, userId)).orderBy(desc(notices.createdAt)).limit(limit);
}

export async function unreadCount(db: TenantDb, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notices)
    .where(and(eq(notices.userId, userId), isNull(notices.readAt)));
  return row?.n ?? 0;
}

export async function markAllRead(db: TenantDb, userId: string) {
  await db.update(notices).set({ readAt: new Date() }).where(and(eq(notices.userId, userId), isNull(notices.readAt)));
}

export async function deliveriesFor(db: TenantDb, event: string) {
  return db.select().from(deliveryRecords).where(eq(deliveryRecords.event, event)).orderBy(desc(deliveryRecords.at));
}
