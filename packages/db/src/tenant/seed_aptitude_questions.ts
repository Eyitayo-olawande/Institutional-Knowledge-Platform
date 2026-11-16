/**
 * Expands the SUNU General Aptitude Test 2026 question bank so that the
 * per-candidate random selection is clearly visible:
 *   - general_aptitude:  5 existing + 7 new = 12 in pool, 4 shown per candidate
 *   - company_knowledge: 5 existing + 7 new = 12 in pool, 6 shown per candidate
 *
 * Run once from packages/db:
 *   npx tsx src/tenant/seed_aptitude_questions.ts
 */
import { eq } from "drizzle-orm";
import { connectTenant } from "./client.ts";
import { upsertQuestion } from "./aptitude.ts";
import { aptitudeSections } from "./schema.ts";

const ACTOR = "system:aptitude_question_seed";
const DB_URL = process.env.MANTLE_PG_SERVER_URL ?? "postgres://localhost:5432/postgres";
const DB_NAME = "mantle_tenant_alpha";

const TEST_ID = "20bdd48d-1dbe-41c4-a219-5e5280e59964";

const { db, close } = connectTenant(DB_URL, DB_NAME);

// Resolve section IDs
const sections = await db
  .select({ id: aptitudeSections.id, sectionKey: aptitudeSections.sectionKey })
  .from(aptitudeSections)
  .where(eq(aptitudeSections.testId, TEST_ID));

const gaSection = sections.find((s) => s.sectionKey === "general_aptitude");
const ckSection = sections.find((s) => s.sectionKey === "company_knowledge");
if (!gaSection || !ckSection) throw new Error("Sections not found for test " + TEST_ID);

// ── General Aptitude: 7 new questions (sort orders 6–12) ──────────────────

const generalAptitudeNew = [
  {
    sortOrder: 6,
    questionText: "What is the next number in the sequence: 1, 4, 9, 16, 25, ___?",
    marks: 10,
    options: [
      { optionText: "30", isCorrect: false, sortOrder: 1 },
      { optionText: "36", isCorrect: true,  sortOrder: 2 },
      { optionText: "32", isCorrect: false, sortOrder: 3 },
      { optionText: "49", isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 7,
    questionText: "A man walks 3 km north, then 4 km east. How far is he from his starting point?",
    marks: 10,
    options: [
      { optionText: "7 km",  isCorrect: false, sortOrder: 1 },
      { optionText: "5 km",  isCorrect: true,  sortOrder: 2 },
      { optionText: "6 km",  isCorrect: false, sortOrder: 3 },
      { optionText: "3.5 km", isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 8,
    questionText: "If 12 is 25% of a number, what is that number?",
    marks: 10,
    options: [
      { optionText: "36", isCorrect: false, sortOrder: 1 },
      { optionText: "48", isCorrect: true,  sortOrder: 2 },
      { optionText: "60", isCorrect: false, sortOrder: 3 },
      { optionText: "3",  isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 9,
    questionText: "Find the odd one out: Needle, Pin, Knife, Scissors, Cotton.",
    marks: 10,
    options: [
      { optionText: "Needle",   isCorrect: false, sortOrder: 1 },
      { optionText: "Scissors", isCorrect: false, sortOrder: 2 },
      { optionText: "Cotton",   isCorrect: true,  sortOrder: 3 },
      { optionText: "Knife",    isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 10,
    questionText: "A train departs at 09:30 and arrives at 14:15. How long is the journey?",
    marks: 10,
    options: [
      { optionText: "4 hours 15 minutes", isCorrect: false, sortOrder: 1 },
      { optionText: "4 hours 45 minutes", isCorrect: true,  sortOrder: 2 },
      { optionText: "5 hours",            isCorrect: false, sortOrder: 3 },
      { optionText: "5 hours 15 minutes", isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 11,
    questionText: "Which of these fractions is the largest: 3/4, 7/10, 4/5, 2/3?",
    marks: 10,
    options: [
      { optionText: "3/4",  isCorrect: false, sortOrder: 1 },
      { optionText: "7/10", isCorrect: false, sortOrder: 2 },
      { optionText: "4/5",  isCorrect: true,  sortOrder: 3 },
      { optionText: "2/3",  isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 12,
    questionText: "A shop offers a 20% discount on an item priced at ₦5,000. How much do you pay?",
    marks: 10,
    options: [
      { optionText: "₦4,500", isCorrect: false, sortOrder: 1 },
      { optionText: "₦4,000", isCorrect: true,  sortOrder: 2 },
      { optionText: "₦3,500", isCorrect: false, sortOrder: 3 },
      { optionText: "₦1,000", isCorrect: false, sortOrder: 4 },
    ],
  },
];

// ── Company Knowledge: 7 new questions (sort orders 6–12) ─────────────────

const companyKnowledgeNew = [
  {
    sortOrder: 6,
    questionText: "What does the abbreviation NAICOM stand for?",
    marks: 10,
    options: [
      { optionText: "National Agency for Insurance Companies in Nigeria",        isCorrect: false, sortOrder: 1 },
      { optionText: "National Insurance Commission",                            isCorrect: true,  sortOrder: 2 },
      { optionText: "Nigerian Association of Insurance Companies and Markets",   isCorrect: false, sortOrder: 3 },
      { optionText: "National Insurance Committee of Nigeria",                  isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 7,
    questionText: "SUNU Assurances Nigeria Plc shares are traded on which stock exchange?",
    marks: 10,
    options: [
      { optionText: "London Stock Exchange",        isCorrect: false, sortOrder: 1 },
      { optionText: "Ghana Stock Exchange",         isCorrect: false, sortOrder: 2 },
      { optionText: "Nigerian Exchange Group (NGX)", isCorrect: true,  sortOrder: 3 },
      { optionText: "Johannesburg Stock Exchange",  isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 8,
    questionText: "In which city is the SUNU Group's headquarters located?",
    marks: 10,
    options: [
      { optionText: "Lagos",   isCorrect: false, sortOrder: 1 },
      { optionText: "Accra",   isCorrect: false, sortOrder: 2 },
      { optionText: "Dakar",   isCorrect: true,  sortOrder: 3 },
      { optionText: "Abidjan", isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 9,
    questionText: "What type of insurance does SUNU Assurances Nigeria Plc primarily provide?",
    marks: 10,
    options: [
      { optionText: "Life and health insurance only",                    isCorrect: false, sortOrder: 1 },
      { optionText: "General (non-life) insurance products",             isCorrect: true,  sortOrder: 2 },
      { optionText: "Mortgage and property finance",                     isCorrect: false, sortOrder: 3 },
      { optionText: "Pension fund management exclusively",               isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 10,
    questionText: "Before 2018, under its previous name, the company was supervised by which regulator?",
    marks: 10,
    options: [
      { optionText: "Central Bank of Nigeria (CBN)",                      isCorrect: false, sortOrder: 1 },
      { optionText: "Securities and Exchange Commission (SEC)",            isCorrect: false, sortOrder: 2 },
      { optionText: "National Insurance Commission (NAICOM)",             isCorrect: true,  sortOrder: 3 },
      { optionText: "Nigerian Deposit Insurance Corporation (NDIC)",       isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 11,
    questionText: "SUNU Group operates in 14 African countries. Which continent is therefore its primary market?",
    marks: 10,
    options: [
      { optionText: "Europe",         isCorrect: false, sortOrder: 1 },
      { optionText: "Africa",         isCorrect: true,  sortOrder: 2 },
      { optionText: "Asia",           isCorrect: false, sortOrder: 3 },
      { optionText: "South America",  isCorrect: false, sortOrder: 4 },
    ],
  },
  {
    sortOrder: 12,
    questionText: "Which of the following best describes why SUNU Assurances Nigeria Plc rebranded in 2018?",
    marks: 10,
    options: [
      { optionText: "The company was sold to a European insurance group",           isCorrect: false, sortOrder: 1 },
      { optionText: "The company became part of the pan-African SUNU Group",        isCorrect: true,  sortOrder: 2 },
      { optionText: "NAICOM mandated all insurers to adopt international names",    isCorrect: false, sortOrder: 3 },
      { optionText: "The company merged with a Nigerian competitor",                isCorrect: false, sortOrder: 4 },
    ],
  },
];

// ── Insert ─────────────────────────────────────────────────────────────────

console.log("Adding general aptitude questions...");
for (const q of generalAptitudeNew) {
  await upsertQuestion(db, TEST_ID, gaSection.id, q, ACTOR);
  console.log(`  Added: ${q.questionText.slice(0, 60)}...`);
}

console.log("Adding company knowledge questions...");
for (const q of companyKnowledgeNew) {
  await upsertQuestion(db, TEST_ID, ckSection.id, q, ACTOR);
  console.log(`  Added: ${q.questionText.slice(0, 60)}...`);
}

await close();
console.log("Done. Each section now has 12 questions in the pool.");
