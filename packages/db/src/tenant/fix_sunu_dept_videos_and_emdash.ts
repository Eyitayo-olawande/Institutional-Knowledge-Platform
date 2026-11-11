/**
 * One-off: fix department course library items already in the DB.
 *   1. Replace em dashes (—) in body text with the same substitution
 *      used in the seed file (double-em-dash parentheticals → parens,
 *      single → comma).
 *   2. Update video URLs to working YouTube links.
 *
 * Run from packages/db (Mac Terminal):
 *   npx tsx src/tenant/fix_sunu_dept_videos_and_emdash.ts
 */
import { eq, inArray } from "drizzle-orm";
import { connectTenant } from "./client.ts";
import { libraryItems, libraryItemVersions } from "./schema.ts";

const ACTOR = "system:fix_sunu_dept_videos";
const DB_URL = process.env.MANTLE_PG_SERVER_URL ?? "postgres://localhost:5432/postgres";
const DB_NAME = "mantle_tenant_alpha";

const { db, close } = connectTenant(DB_URL, DB_NAME);

// Working YouTube URLs sourced from web search
const VIDEO_UPDATES: Record<string, string> = {
  "Claims Handling Best Practices":
    "https://www.youtube.com/watch?v=lhB1wHsPQYQ",
  "AML/CFT & Regulatory Compliance Fundamentals":
    "https://www.youtube.com/watch?v=CK31RZ3Yrz4",
  "Customer Service Excellence in Financial Services":
    "https://www.youtube.com/watch?v=ZKfjBkFQjsk",
  "Financial Management & Budgeting Basics":
    "https://www.youtube.com/watch?v=jkCL0iLcMto",
  "HR Fundamentals: People, Policy & Performance":
    "https://www.youtube.com/watch?v=A2HFusWQIeE",
  "Cybersecurity Awareness & Digital Safety":
    "https://www.youtube.com/watch?v=2aOFBcgo9UQ",
  "Internal Controls & Risk Management":
    "https://www.youtube.com/watch?v=YnfT71SNlxY",
  "Legal Compliance & Contract Essentials":
    "https://www.youtube.com/watch?v=UaFEE_p2-YI",
  "Insurance Underwriting Principles":
    "https://www.youtube.com/watch?v=Do89TmG330I",
};

function fixEmDash(text: string): string {
  // Double em-dash parentheticals: " — X — " → " (X) "
  let out = text.replace(/ — ([^—\n]+?) — /g, (_m, inner: string) => ` (${inner.trim()}) `);
  // Remaining single em dashes → comma
  out = out.replace(/ — /g, ", ");
  return out;
}

const titles = Object.keys(VIDEO_UPDATES);

// 1. Update video URLs on library_items
const rows = await db
  .select({ id: libraryItems.id, title: libraryItems.title })
  .from(libraryItems)
  .where(inArray(libraryItems.title, titles));

for (const row of rows) {
  const url = VIDEO_UPDATES[row.title];
  if (!url) continue;
  await db
    .update(libraryItems)
    .set({ videoUrl: url, changedBy: ACTOR, updatedAt: new Date() })
    .where(eq(libraryItems.id, row.id));
  console.log(`Video updated: ${row.title}`);
}

// 2. Fix em dashes in published + draft version body text
const itemIds = rows.map((r) => r.id);
if (itemIds.length > 0) {
  const versions = await db
    .select({ id: libraryItemVersions.id, body: libraryItemVersions.body })
    .from(libraryItemVersions)
    .where(inArray(libraryItemVersions.itemId, itemIds));

  for (const v of versions) {
    const fixed = fixEmDash(v.body);
    if (fixed !== v.body) {
      await db
        .update(libraryItemVersions)
        .set({ body: fixed, changedBy: ACTOR, updatedAt: new Date() })
        .where(eq(libraryItemVersions.id, v.id));
      console.log(`Body fixed (version ${v.id})`);
    }
  }
}

await close();
console.log("Done.");
