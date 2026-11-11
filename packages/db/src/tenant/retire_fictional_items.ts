/**
 * One-off: retire all seed items labelled "(fictional)" from the alpha tenant.
 * Retired items are excluded from the library list and search; they are kept
 * in the DB for the activity log and audit trail.
 *
 * Run from packages/db (Mac Terminal):
 *   npx tsx src/tenant/retire_fictional_items.ts
 */
import { eq } from "drizzle-orm";
import { connectTenant } from "./client.ts";
import { libraryItems } from "./schema.ts";
import { recordActivity } from "./activity.ts";

const ACTOR = "system:retire_fictional_items";
const { db, close } = connectTenant(
  process.env.MANTLE_PG_SERVER_URL ?? "postgres://localhost:5432/postgres",
  "mantle_tenant_alpha",
);

const rows = await db
  .select({ id: libraryItems.id, title: libraryItems.title, status: libraryItems.status })
  .from(libraryItems);

const toRetire = rows.filter(
  (r) => r.title.includes("(fictional)") && r.status !== "retired",
);

if (toRetire.length === 0) {
  console.log("Nothing to retire.");
} else {
  for (const item of toRetire) {
    await db.transaction(async (tx) => {
      await tx
        .update(libraryItems)
        .set({ status: "retired", updatedAt: new Date(), changedBy: ACTOR })
        .where(eq(libraryItems.id, item.id));
      await recordActivity(tx, {
        actor: ACTOR,
        action: "library.retired",
        entityType: "library_item",
        entityId: item.id,
        details: {},
      });
    });
    console.log(`Retired: ${item.title}`);
  }
}

await close();
console.log("Done.");
