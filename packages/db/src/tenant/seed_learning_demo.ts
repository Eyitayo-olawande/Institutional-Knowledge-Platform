/**
 * Development seed: assigns a learning path to ada@alpha.test so the
 * My Learning page has real data to show. Run once with:
 *   cd packages/db && npx tsx src/tenant/seed_learning_demo.ts
 */
import { eq } from "drizzle-orm";
import { connectTenant } from "./client.ts";
import {
  addItemToModule,
  addModuleToStage,
  createModule,
  createPath,
  getPathBuilder,
} from "./paths.ts";
import { assignments, libraryItems, moduleProgress, people, users } from "./schema.ts";
import { randomUUID } from "node:crypto";

const ACTOR = "system:dev_seed";
const DB_URL = process.env.MANTLE_PG_SERVER_URL ?? "postgres://localhost:5432/postgres";
const DB_NAME = "mantle_tenant_alpha";

const { db, close } = connectTenant(DB_URL, DB_NAME);

// ---- find ada's person record ----
const [adaUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, "ada@alpha.test"));
if (!adaUser) throw new Error("ada@alpha.test not found in users table");

let [adaPerson] = await db.select({ id: people.id }).from(people).where(eq(people.userId, adaUser.id));
if (!adaPerson) {
  // Create a person record for ada so she can be a learner too
  const [inserted] = await db.insert(people).values({
    id: randomUUID(),
    employeeId: "ADA001",
    fullName: "Ada Alpha (fictional)",
    workEmail: "ada@alpha.test",
    userId: adaUser.id,
    status: "active",
    changedBy: ACTOR,
  }).returning({ id: people.id });
  adaPerson = inserted!;
  console.log("Created person record for ada:", adaPerson.id);
}

console.log("ada person id:", adaPerson.id);

// ---- check for existing assignment ----
const existing = await db.select({ id: assignments.id }).from(assignments).where(eq(assignments.personId, adaPerson.id));
if (existing.length > 0) {
  console.log("Ada already has", existing.length, "assignment(s). Skipping path creation.");
  await close();
  process.exit(0);
}

// ---- published library items we can link to ----
// Pick the first few existing items; they were created by the main dev seed.
const allItems = await db.select({ id: libraryItems.id, title: libraryItems.title }).from(libraryItems).limit(20);
function pickItem(keyword: string) {
  return allItems.find((i) => i.title.toLowerCase().includes(keyword.toLowerCase()))?.id ?? null;
}

const itemCommon1  = pickItem("code of conduct");
const itemCommon2  = pickItem("aml");
const itemDept1    = pickItem("motor claim registration");
const itemDept2    = pickItem("documents needed");
const itemRole1    = pickItem("salvage");
const itemRole2    = pickItem("claims intake") ?? pickItem("customer service");

// ---- create the path ----
const pathId = await createPath(
  db,
  { name: "SUNU Essential Learning Programme (Fictional)", departmentId: null },
  ACTOR,
);
console.log("Created path:", pathId);

const builder = await getPathBuilder(db, pathId);
if (!builder) throw new Error("Path builder not found");

const stageByKind = Object.fromEntries(builder.stages.map((s) => [s.kind, s]));

// ---- common stage: 2 modules ----
const commonStage = stageByKind["common"]!;
const commonMod1Id = await createModule(db, "Code of Conduct & Ethics (Fictional)", ACTOR);
const commonMod2Id = await createModule(db, "AML/CFT Essentials for All Staff (Fictional)", ACTOR);
await addModuleToStage(db, commonStage.stageId, commonMod1Id, ACTOR);
await addModuleToStage(db, commonStage.stageId, commonMod2Id, ACTOR);
if (itemCommon1) await addItemToModule(db, commonMod1Id, itemCommon1, ACTOR);
if (itemCommon2) await addItemToModule(db, commonMod2Id, itemCommon2, ACTOR);

// ---- department stage: 2 modules ----
const deptStage = stageByKind["department"]!;
const deptMod1Id = await createModule(db, "Claims Registration Procedure (Fictional)", ACTOR);
const deptMod2Id = await createModule(db, "Claims Documentation Requirements (Fictional)", ACTOR);
await addModuleToStage(db, deptStage.stageId, deptMod1Id, ACTOR);
await addModuleToStage(db, deptStage.stageId, deptMod2Id, ACTOR);
if (itemDept1) await addItemToModule(db, deptMod1Id, itemDept1, ACTOR);
if (itemDept2) await addItemToModule(db, deptMod2Id, itemDept2, ACTOR);

// ---- role stage: 2 modules ----
const roleStage = stageByKind["role"]!;
const roleMod1Id = await createModule(db, "Salvage & Recoveries (Fictional)", ACTOR);
const roleMod2Id = await createModule(db, "Customer Service Standards for Claims (Fictional)", ACTOR);
await addModuleToStage(db, roleStage.stageId, roleMod1Id, ACTOR);
await addModuleToStage(db, roleStage.stageId, roleMod2Id, ACTOR);
if (itemRole1) await addItemToModule(db, roleMod1Id, itemRole1, ACTOR);
if (itemRole2) await addItemToModule(db, roleMod2Id, itemRole2, ACTOR);

// ---- assign path to ada ----
const startDate = new Date().toISOString().slice(0, 10);
await db.insert(assignments).values({
  personId: adaPerson.id,
  pathId,
  startDate,
  changedBy: ACTOR,
});
console.log("Assigned path to ada. Start date:", startDate);

// ---- mark first common module as completed so journey shows progress ----
await db.insert(moduleProgress).values({
  personId: adaPerson.id,
  moduleId: commonMod1Id,
  completedAt: new Date(),
  changedBy: ACTOR,
}).onConflictDoNothing();
console.log("Marked first module as completed.");

await close();
console.log("Done.");
