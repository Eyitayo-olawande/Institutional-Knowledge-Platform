/**
 * Seeds a knowledge check for the Claims Handling Best Practices module.
 *
 * Run from packages/db on the production server:
 *   npx tsx src/tenant/seed_claims_knowledge_check.ts
 *
 * What this does:
 *  1. Creates a new assessmentOnly library item (the quiz item)
 *  2. Seeds 15 knowledge check questions from the Claims course spec
 *  3. Adds the quiz item to module bad7e89d-7564-4a1d-85ea-8f9768a0f51b
 *     immediately after the existing content item
 *
 * Safe to re-run: skips if the item title already exists.
 */
import { eq } from "drizzle-orm";
import { addOption, addQuestion, createAssessment } from "./assessments.ts";
import { connectTenant } from "./client.ts";
import { addItemToModule } from "./paths.ts";
import { publishDraft } from "./library.ts";
import { libraryItems, libraryItemVersions } from "./schema.ts";

const ACTOR = "system:seed_claims_kc";
const DB_URL = process.env.MANTLE_PG_SERVER_URL ?? "postgres://localhost:5432/postgres";
const DB_NAME = process.env.MANTLE_PG_TENANT_DB ?? "mantle_tenant_sunu";

const { db, close } = connectTenant(DB_URL, DB_NAME);

// IDs from production — do not change
const MODULE_ID = "bad7e89d-7564-4a1d-85ea-8f9768a0f51b";
const CONTENT_ITEM_ID = "c43e77fe-a972-4ee3-89cc-89e49f5a0f5d"; // Claims Handling Best Practices

const KC_TITLE = "Claims Handling Best Practices — Knowledge Check";
const PASSING_SCORE = 70;

const QUESTIONS = [
  { text: "What does FNOL stand for in claims handling?", options: [{ text: "Final Notice of Loss", correct: false }, { text: "First Notification of Loss", correct: true }, { text: "Full Notification of Liability", correct: false }, { text: "Financial Notice of Loss", correct: false }] },
  { text: "The first step after receiving a claim is to:", options: [{ text: "Set the reserve immediately", correct: false }, { text: "Contact the repairer", correct: false }, { text: "Verify that the policy was active and covers the type of loss", correct: true }, { text: "Issue payment to the customer", correct: false }] },
  { text: "An accurate reserve is important because:", options: [{ text: "It signals approval to the customer", correct: false }, { text: "Underreserving creates solvency risk and overreserving distorts financial reporting", correct: true }, { text: "It speeds up the investigation", correct: false }, { text: "Reserves are required only for large claims", correct: false }] },
  { text: "Which of the following is a fraud indicator?", options: [{ text: "A claim filed two years after policy inception", correct: false }, { text: "A repair estimate that matches market rates", correct: false }, { text: "A vague or shifting account of the incident", correct: true }, { text: "The customer having no prior claims history", correct: false }] },
  { text: "What is subrogation?", options: [{ text: "The process of cancelling a policy after a claim", correct: false }, { text: "The insurer seeking recovery from a third party at fault after paying a claim", correct: true }, { text: "A penalty applied to fraudulent claimants", correct: false }, { text: "The portion of a claim the customer pays themselves", correct: false }] },
  { text: "Documentation in claims handling requires:", options: [{ text: "Recording only the final decision", correct: false }, { text: "Logging every conversation, document and action with a date and time stamp", correct: true }, { text: "Keeping notes only for claims over a certain value", correct: false }, { text: "Using technical jargon so the record is precise", correct: false }] },
  { text: "When should you contact a customer after receiving their claim?", options: [{ text: "Within five working days", correct: false }, { text: "Only when you have a decision ready", correct: false }, { text: "Within 24 hours to acknowledge receipt and explain next steps", correct: true }, { text: "After the investigation is complete", correct: false }] },
  { text: "If a claim is denied, the claims handler should:", options: [{ text: "Send a brief rejection with no explanation", correct: false }, { text: "Explain the reason in plain language and reference the applicable policy section", correct: true }, { text: "Let the customer's broker explain the decision", correct: false }, { text: "Avoid putting the reason in writing", correct: false }] },
  { text: "Salvage in claims refers to:", options: [{ text: "The legal right to pursue the person responsible for the loss", correct: false }, { text: "The amount the customer contributes before the insurer pays", correct: false }, { text: "What remains of the damaged item, which the insurer may recover value from", correct: true }, { text: "A reserve held for future claims on the same policy", correct: false }] },
  { text: "A bad-faith allegation against an insurer typically arises from:", options: [{ text: "Paying claims too quickly", correct: false }, { text: "Decisions made on inadequate investigation and poor documentation", correct: true }, { text: "Setting reserves that are too high", correct: false }, { text: "Following policy wording too strictly", correct: false }] },
  { text: "When a customer disputes a claims decision, the correct first step is to:", options: [{ text: "Immediately refer the dispute to legal", correct: false }, { text: "Listen to the concern and review the file before responding in writing", correct: true }, { text: "Confirm the original decision without further review", correct: false }, { text: "Ask the customer to lodge a formal court complaint", correct: false }] },
  { text: "The investigation phase of a claim aims to:", options: [{ text: "Build a case to minimise payment", correct: false }, { text: "Find grounds to deny the claim", correct: false }, { text: "Gather an objective picture of what happened before making a decision", correct: true }, { text: "Approve the claim as quickly as possible", correct: false }] },
  { text: "Why should a claims handler avoid speculating in written documentation?", options: [{ text: "Speculation is not required by regulators", correct: false }, { text: "Speculation and personal opinion can be used against the company in a dispute", correct: true }, { text: "Customers prefer factual language in all communications", correct: false }, { text: "Speculation slows the claims process", correct: false }] },
  { text: "Coverage verification must be done before payment because:", options: [{ text: "It is required by the customer", correct: false }, { text: "Skipping it creates liability — the company may pay claims it is not obligated to pay", correct: true }, { text: "It speeds up reserve setting", correct: false }, { text: "Payment must always precede investigation", correct: false }] },
  { text: "Setting clear expectations with a claimant means:", options: [{ text: "Promising a decision within 24 hours regardless of complexity", correct: false }, { text: "Telling them what documents you need, the timeline, and when they will next hear from you", correct: true }, { text: "Explaining all policy exclusions upfront", correct: false }, { text: "Asking them to contact their broker for updates", correct: false }] },
];

// ── 1. Check if already seeded ─────────────────────────────────────────────
const existing = await db
  .select({ id: libraryItems.id })
  .from(libraryItems)
  .where(eq(libraryItems.title, KC_TITLE));

if (existing.length > 0) {
  console.log(`Already seeded: ${existing[0]!.id}`);
  await close();
  process.exit(0);
}

// ── 2. Get content item's area and contentTypeId for the new KC item ────────
const [contentItem] = await db
  .select({ areaId: libraryItems.areaId, contentTypeId: libraryItems.contentTypeId })
  .from(libraryItems)
  .where(eq(libraryItems.id, CONTENT_ITEM_ID));

if (!contentItem) throw new Error(`Content item ${CONTENT_ITEM_ID} not found in DB`);

// ── 3. Insert knowledge check library item with assessmentOnly = true ───────
const [kcRow] = await db
  .insert(libraryItems)
  .values({
    title: KC_TITLE,
    areaId: contentItem.areaId,
    contentTypeId: contentItem.contentTypeId,
    assessmentOnly: true,
    changedBy: ACTOR,
  })
  .returning({ id: libraryItems.id });

if (!kcRow) throw new Error("Failed to insert knowledge check item");
const kcItemId = kcRow.id;
console.log(`Created KC item: ${kcItemId}`);

// ── 4. Create a draft version (body not needed for assessmentOnly items) ────
await db.insert(libraryItemVersions).values({
  itemId: kcItemId,
  version: 1,
  body: "Claims Handling Best Practices — Knowledge Check",
  changedBy: ACTOR,
});

// ── 5. Publish the item ─────────────────────────────────────────────────────
await publishDraft(db, kcItemId, ACTOR);
console.log(`Published KC item: ${kcItemId}`);

// ── 6. Create assessment and seed questions ─────────────────────────────────
const assessmentId = await createAssessment(db, kcItemId, PASSING_SCORE, ACTOR);
console.log(`Created assessment: ${assessmentId}`);

for (let qi = 0; qi < QUESTIONS.length; qi++) {
  const q = QUESTIONS[qi]!;
  const questionId = await addQuestion(db, assessmentId, q.text, qi + 1, ACTOR);
  for (let oi = 0; oi < q.options.length; oi++) {
    const o = q.options[oi]!;
    await addOption(db, questionId, o.text, o.correct, oi + 1, ACTOR);
  }
}
console.log(`Seeded ${QUESTIONS.length} questions`);

// ── 7. Add KC item to the module ────────────────────────────────────────────
await addItemToModule(db, MODULE_ID, kcItemId, ACTOR);
console.log(`Added KC item to module ${MODULE_ID}`);

await close();
console.log("Done. Claims knowledge check is live.");
