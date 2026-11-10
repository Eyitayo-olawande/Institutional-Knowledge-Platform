/**
 * Seeds one YouTube-backed course + 15-question knowledge check for each
 * department area that currently has zero items.  Mirrors the pattern used in
 * seed_sunu_elearning.ts (Leadership Foundations / Communication & Etiquette).
 *
 * Departments covered:
 *   Claims, Compliance, Customer Service, Finance, Human Resources,
 *   Information Technology, Internal Control, Legal, Underwriting
 *
 * Run from packages/db (Mac Terminal):
 *   npx tsx src/tenant/seed_sunu_department_courses.ts
 */
import { eq } from "drizzle-orm";
import { addOption, addQuestion, createAssessment } from "./assessments.ts";
import { departmentArea, contentTypeByKey } from "./areas.ts";
import { connectTenant } from "./client.ts";
import { createLibraryItem, publishDraft } from "./library.ts";
import { addItemToModule, addModuleToStage, createModule, createPath, getPathBuilder } from "./paths.ts";
import { departments, libraryItems } from "./schema.ts";

const ACTOR = "system:sunu_department_courses_seed";
const DB_URL = process.env.MANTLE_PG_SERVER_URL ?? "postgres://localhost:5432/postgres";
const DB_NAME = "mantle_tenant_alpha";

const { db, close } = connectTenant(DB_URL, DB_NAME);

// ── types ──────────────────────────────────────────────────────────────────

type Option = { text: string; correct: boolean };
type Question = { text: string; options: Option[] };
interface CourseSpec {
  deptName: string;
  title: string;
  videoUrl: string;
  body: string;
  questions: Question[];
}

// ── helper: seed one course ────────────────────────────────────────────────

async function seedCourse(spec: CourseSpec): Promise<void> {
  console.log(`\n── ${spec.deptName} ─────────────────────────────────────`);

  // Find department
  const [dept] = await db.select({ id: departments.id }).from(departments).where(eq(departments.name, spec.deptName));
  if (!dept) { console.warn(`  Department "${spec.deptName}" not found — skipping.`); return; }

  // Get area and content type
  const areaId = await departmentArea(db, dept.id);
  if (!areaId) { console.warn(`  No area for department "${spec.deptName}" — skipping.`); return; }
  const contentTypeId = await contentTypeByKey(db, "department", "training");
  if (!contentTypeId) throw new Error("Content type 'department/training' not found");

  // Create or find library item
  const existing = await db.select({ id: libraryItems.id }).from(libraryItems).where(eq(libraryItems.title, spec.title));
  if (existing.length > 0) {
    console.log(`  Already seeded — skipping.`);
    return;
  }

  const itemId = await createLibraryItem(db, { title: spec.title, body: spec.body, ownerUserId: null, reviewDate: null, areaId, contentTypeId, videoUrl: spec.videoUrl }, ACTOR);
  await publishDraft(db, itemId, ACTOR);
  console.log(`  Created item: ${itemId}`);

  // Assessment
  const assessmentId = await createAssessment(db, itemId, 70, ACTOR);
  for (let qi = 0; qi < spec.questions.length; qi++) {
    const q = spec.questions[qi]!;
    const questionId = await addQuestion(db, assessmentId, q.text, qi + 1, ACTOR);
    for (let oi = 0; oi < q.options.length; oi++) {
      const o = q.options[oi]!;
      await addOption(db, questionId, o.text, o.correct, oi + 1, ACTOR);
    }
  }
  console.log(`  Seeded ${spec.questions.length} questions.`);

  // Module
  const moduleId = await createModule(db, spec.title, ACTOR);
  await addItemToModule(db, moduleId, itemId, ACTOR);
  console.log(`  Created module: ${moduleId}`);

  // Path: one per department, with item in the department stage
  const pathId = await createPath(db, { name: `${spec.deptName} Learning Path`, departmentId: dept.id }, ACTOR);
  const builder = await getPathBuilder(db, pathId);
  if (!builder) throw new Error(`Path builder not found for path ${pathId}`);
  const deptStage = builder.stages.find((s) => s.kind === "department");
  if (!deptStage) throw new Error("Department stage not found");
  await addModuleToStage(db, deptStage.stageId, moduleId, ACTOR);
  console.log(`  Created path: ${pathId}`);
}

// ══════════════════════════════════════════════════════════════════════════
// COURSE CONTENT
// ══════════════════════════════════════════════════════════════════════════

// ── 1. CLAIMS ─────────────────────────────────────────────────────────────

const CLAIMS: CourseSpec = {
  deptName: "Claims",
  title: "Claims Handling Best Practices",
  videoUrl: "https://www.youtube.com/watch?v=WZYmGVqAkME",
  body: `CLAIMS HANDLING BEST PRACTICES
A practical guide to managing insurance claims with accuracy, speed and customer empathy.

MODULE 1 — THE CLAIMS PROCESS
A claim is a request by a policyholder for compensation after a covered loss. Handling it well protects the customer and the company alike.

First notification of loss (FNOL): The process begins when a customer reports an incident. Record every detail accurately — date, time, location, parties involved and the nature of the loss. Incomplete FNOL leads to delays and disputes.

Coverage verification: Before any payment, confirm that the policy was active on the date of loss, that the type of loss falls within the policy terms, and that no exclusion applies. Skipping this step creates liability.

Investigation: Gather evidence — photographs, police reports, witness statements, repair estimates. The goal is an objective picture of what happened, not to approve or deny before the facts are known.

Reserve setting: Once the scope of the loss is clear, set an accurate reserve — the amount the company expects to pay. Underreserving creates solvency risk; overreserving distorts financial reporting.

MODULE 2 — DOCUMENTATION AND DECISION-MAKING
Every decision in a claim must be documented. If it was not written down, it did not happen.

Documentation standards: Record every conversation, every document received, and every action taken with a date and time stamp. Use plain, factual language — avoid speculation and personal opinion.

Making the coverage decision: The decision to approve, partially approve or deny a claim must be based on the policy wording and the evidence gathered. Document your reasoning in full. Decisions based on inadequate investigation expose the company to bad-faith allegations.

Salvage and subrogation: After paying a claim, the insurer may recover value from salvage (what remains of the damaged item) or through subrogation (seeking recovery from a third party at fault). Identify these opportunities early — they reduce net loss costs.

Fraud indicators: Be alert to inconsistencies — claims filed shortly after policy inception, vague or shifting accounts of the incident, prior claims history, or repair estimates that far exceed market rates. Refer suspected fraud to the appropriate team; never accuse a claimant directly.

MODULE 3 — CUSTOMER COMMUNICATION IN CLAIMS
A customer filing a claim is often in distress. How you communicate shapes their experience of the company.

Acknowledge promptly: Contact the customer within 24 hours of FNOL. Acknowledge receipt of the claim and explain what happens next. Silence breeds anxiety and distrust.

Set clear expectations: Tell the customer what documents you need, the expected timeline at each stage, and when they will next hear from you. Keep those commitments.

Explain decisions clearly: Whether you are approving or denying a claim, explain the reason in plain language. Reference the policy section that applies. Never use jargon the customer cannot understand.

Handle disputes professionally: If a customer disputes a decision, listen to their concern, review the file, and respond in writing. Escalate to a supervisor when the dispute cannot be resolved at first contact.`,
  questions: [
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
  ],
};

// ── 2. COMPLIANCE ─────────────────────────────────────────────────────────

const COMPLIANCE: CourseSpec = {
  deptName: "Compliance",
  title: "AML/CFT & Regulatory Compliance Fundamentals",
  videoUrl: "https://www.youtube.com/watch?v=DQ0fxAiHDLg",
  body: `AML/CFT & REGULATORY COMPLIANCE FUNDAMENTALS
Understanding anti-money laundering, countering the financing of terrorism, and your regulatory obligations in the insurance sector.

MODULE 1 — WHAT IS MONEY LAUNDERING AND WHY IT MATTERS
Money laundering is the process of making illegally obtained funds appear legitimate. It typically involves three stages: placement (introducing illicit funds into the financial system), layering (disguising the trail through complex transactions) and integration (returning the now-cleaned money into the legitimate economy).

Why insurers are targeted: Insurance products can be misused. Single-premium policies, early surrenders with a loss, and over-payments followed by refund requests are all patterns that money launderers exploit. The insurance sector is therefore subject to the same AML/CFT obligations as banks and other financial institutions.

The regulatory framework in Nigeria: The Central Bank of Nigeria, the NAICOM, and the EFCC set the rules. SUNU Assurances Nigeria operates under these frameworks and is required to maintain a robust AML/CFT programme. Non-compliance carries severe penalties including fines, licence suspension and criminal prosecution.

MODULE 2 — KNOW YOUR CUSTOMER AND RED FLAGS
KYC (Know Your Customer) is the foundation of AML compliance. It means verifying the identity of every customer before or immediately after a business relationship begins.

Customer due diligence (CDD): Collect and verify: full name, date of birth, address, occupation, source of funds and the nature of the intended transaction. For higher-risk customers — politically exposed persons (PEPs), non-residents, cash-intensive businesses — enhanced due diligence (EDD) applies.

Red flags to watch for: unusually large single premiums paid in cash; multiple policies purchased for no apparent economic reason; a customer who is reluctant to provide identification; a beneficiary who is unrelated to the insured; early policy cancellation with a request to refund to a different account; and transactions that do not match the customer's known income or occupation.

Politically exposed persons (PEPs): PEPs hold or have held prominent public positions. They carry a higher corruption risk and must be subject to EDD regardless of the value of the transaction.

MODULE 3 — REPORTING OBLIGATIONS AND YOUR PERSONAL DUTY
Every employee has a personal, legal obligation to report suspicious activity. Failing to do so is itself a criminal offence.

Suspicious activity reports (SARs): If you suspect that a transaction involves the proceeds of crime or the financing of terrorism, you must file an internal SAR with the designated Compliance Officer. The report should be factual and confidential — do not tip off the customer that a report has been made.

Tipping off: Telling a customer or any third party that you have filed or are about to file a SAR is a criminal offence known as "tipping off." Once a report is submitted, continue to handle the customer normally.

Record-keeping: All CDD records, transaction records and SAR reports must be retained for at least five years. This enables regulators and law enforcement to trace financial flows when investigating crime.

Your personal liability: Ignorance is not a defence. Every employee is responsible for understanding the rules that apply to their role, attending required training, and escalating any concerns to Compliance without delay.`,
  questions: [
    { text: "The three stages of money laundering are:", options: [{ text: "Detection, investigation, prosecution", correct: false }, { text: "Placement, layering, integration", correct: true }, { text: "Receipt, transfer, withdrawal", correct: false }, { text: "Opening, processing, closing", correct: false }] },
    { text: "Why is the insurance sector subject to AML/CFT rules?", options: [{ text: "Because all financial sector employees handle cash", correct: false }, { text: "Because insurance products can be misused to introduce and clean illicit funds", correct: true }, { text: "Only banks are subject to AML/CFT rules", correct: false }, { text: "Because insurance premiums are always paid in cash", correct: false }] },
    { text: "KYC stands for:", options: [{ text: "Keep Your Customers", correct: false }, { text: "Know Your Client's business", correct: false }, { text: "Know Your Customer", correct: true }, { text: "Key Year-end Compliance", correct: false }] },
    { text: "Enhanced due diligence (EDD) is required for:", options: [{ text: "Every customer regardless of risk", correct: false }, { text: "Only customers who have previously been investigated", correct: false }, { text: "Higher-risk customers such as PEPs and cash-intensive businesses", correct: true }, { text: "Customers making claims over a certain threshold", correct: false }] },
    { text: "Which of the following is a red flag for money laundering?", options: [{ text: "A customer who provides all required identity documents promptly", correct: false }, { text: "Early policy cancellation with a request to refund to a different account", correct: true }, { text: "A premium that matches the customer's known income level", correct: false }, { text: "A beneficiary who is the customer's immediate family member", correct: false }] },
    { text: "A politically exposed person (PEP) is:", options: [{ text: "Any customer with a government job", correct: false }, { text: "A person who holds or has held a prominent public position, carrying higher corruption risk", correct: true }, { text: "A person who has been investigated by regulators", correct: false }, { text: "A customer with political views that differ from company policy", correct: false }] },
    { text: "An internal suspicious activity report (SAR) should be filed when:", options: [{ text: "A customer complains about the service", correct: false }, { text: "You suspect a transaction involves proceeds of crime or terrorism financing", correct: true }, { text: "A customer requests an unusually early claim settlement", correct: false }, { text: "A transaction is processed outside normal business hours", correct: false }] },
    { text: "\"Tipping off\" means:", options: [{ text: "Giving a customer advance notice of a premium increase", correct: false }, { text: "Informing a customer or third party that a SAR has been or will be filed — a criminal offence", correct: true }, { text: "Alerting your manager to a large transaction", correct: false }, { text: "Advising a customer to seek independent financial advice", correct: false }] },
    { text: "AML/CFT records must be retained for a minimum of:", options: [{ text: "One year", correct: false }, { text: "Three years", correct: false }, { text: "Five years", correct: true }, { text: "Ten years", correct: false }] },
    { text: "If you fail to report suspicious activity, you:", options: [{ text: "May receive a verbal warning from your manager", correct: false }, { text: "Are personally committing a criminal offence", correct: true }, { text: "Will only face consequences if the transaction turns out to be criminal", correct: false }, { text: "Are not at risk as long as your manager is aware", correct: false }] },
    { text: "\"Layering\" in money laundering refers to:", options: [{ text: "Introducing cash into the financial system", correct: false }, { text: "Disguising the trail of illicit funds through complex transactions", correct: true }, { text: "Returning cleaned money to the legitimate economy", correct: false }, { text: "Opening multiple accounts at the same institution", correct: false }] },
    { text: "Which Nigerian body regulates insurance sector compliance?", options: [{ text: "FIRS only", correct: false }, { text: "NAICOM, the CBN and the EFCC", correct: true }, { text: "The Stock Exchange", correct: false }, { text: "The Ministry of Finance exclusively", correct: false }] },
    { text: "Customer due diligence (CDD) requires collecting:", options: [{ text: "Only the customer's name and phone number", correct: false }, { text: "Full name, date of birth, address, occupation, source of funds and nature of the transaction", correct: true }, { text: "Policy details only, as personal data is not required", correct: false }, { text: "Information only for transactions above a certain monetary threshold", correct: false }] },
    { text: "After submitting a SAR, you should:", options: [{ text: "Tell the customer a report has been made so they can respond", correct: false }, { text: "Immediately freeze the customer's policy", correct: false }, { text: "Continue handling the customer normally and keep the report confidential", correct: true }, { text: "Refer the customer to the police directly", correct: false }] },
    { text: "\"Ignorance is not a defence\" means:", options: [{ text: "Customers cannot claim ignorance of policy terms", correct: false }, { text: "Every employee is responsible for understanding the AML rules that apply to their role", correct: true }, { text: "Regulators will not investigate if an employee was untrained", correct: false }, { text: "Only compliance officers need to understand AML obligations", correct: false }] },
  ],
};

// ── 3. CUSTOMER SERVICE ───────────────────────────────────────────────────

const CUSTOMER_SERVICE: CourseSpec = {
  deptName: "Customer Service",
  title: "Customer Service Excellence in Financial Services",
  videoUrl: "https://www.youtube.com/watch?v=5TDFMaef6wM",
  body: `CUSTOMER SERVICE EXCELLENCE IN FINANCIAL SERVICES
How to deliver consistently outstanding service to customers in an insurance and financial services environment.

MODULE 1 — THE SERVICE STANDARD
Customer service is not a department — it is everyone's responsibility. Every interaction a customer has with SUNU Assurances Nigeria shapes their view of the company and influences whether they renew, recommend us or leave.

What customers expect: Customers want to be heard, to receive accurate information quickly, and to feel that their business matters. In financial services, they also expect confidentiality, professionalism and competence. Meeting these expectations builds loyalty; failing them creates complaints and churn.

The first impression: Greet customers professionally and promptly — by name if you know it. State your name and role. Set a confident, calm tone from the first sentence. First impressions are formed within seconds and are very difficult to reverse.

Active listening: Give the customer your full attention. Do not interrupt. Take notes. Paraphrase what they said before responding: "So what I am hearing is..." This confirms understanding and shows the customer they have been listened to.

MODULE 2 — HANDLING COMPLAINTS AND DIFFICULT CONVERSATIONS
A complaint is a gift — it tells you exactly where service has fallen short and gives you an opportunity to recover the relationship.

The recovery sequence: Acknowledge → Apologise → Act.
Acknowledge: "I understand why that is frustrating." Never minimise the customer's concern.
Apologise: Apologise for the experience, even if the fault was not yours. "I am sorry you experienced this" is not an admission of liability — it is empathy.
Act: Tell the customer what you will do and by when. Keep that commitment. If you cannot resolve the issue on the first contact, give a clear escalation path.

Staying calm under pressure: If a customer is angry, lower your own voice — do not match their volume. Use their name. Avoid defensive language such as "our policy says..." and replace it with "here is what I can do for you." You cannot control the customer's behaviour; you can control your response.

MODULE 3 — BUILDING LASTING CUSTOMER RELATIONSHIPS
Great service goes beyond resolving the immediate issue — it builds relationships that last.

Follow through: If you promised a callback, make it even if you have nothing new to report. "I wanted to let you know I am still working on this" is better than silence. Customers who feel forgotten escalate and churn.

Personalisation: Use the customer's name. Reference their policy or previous interaction when relevant. People respond to being treated as individuals, not as ticket numbers.

Feedback and improvement: Invite customers to tell you how the service could be better. Treat negative feedback as useful data, not personal criticism. Share patterns you observe with your team and your manager.

Representing the brand: Every team member is a brand ambassador. The language you use, the tone of your emails, how quickly you respond — all of these form the customer's picture of SUNU Assurances Nigeria. Act as if the most important person in the company is reading every message you send.`,
  questions: [
    { text: "Who is responsible for customer service at SUNU Assurances Nigeria?", options: [{ text: "The Customer Service department only", correct: false }, { text: "Front-line staff only", correct: false }, { text: "Everyone in the organisation", correct: true }, { text: "The complaints team only", correct: false }] },
    { text: "What do customers in financial services primarily expect?", options: [{ text: "Gifts and rewards for loyalty", correct: false }, { text: "To be heard, receive accurate information quickly, and feel that their business matters", correct: true }, { text: "The lowest possible price at all times", correct: false }, { text: "A personal relationship with senior management", correct: false }] },
    { text: "Active listening means:", options: [{ text: "Listening while preparing your response at the same time", correct: false }, { text: "Giving your full attention, not interrupting, and paraphrasing what the customer said", correct: true }, { text: "Repeating the customer's words back word-for-word", correct: false }, { text: "Listening only to the customer's initial complaint", correct: false }] },
    { text: "The correct order of the complaints recovery sequence is:", options: [{ text: "Act → Apologise → Acknowledge", correct: false }, { text: "Apologise → Acknowledge → Act", correct: false }, { text: "Acknowledge → Apologise → Act", correct: true }, { text: "Act → Acknowledge → Apologise", correct: false }] },
    { text: "\"I am sorry you experienced this\" is:", options: [{ text: "An admission of liability that should be avoided", correct: false }, { text: "An expression of empathy that is not an admission of liability", correct: true }, { text: "Only appropriate when the fault was clearly yours", correct: false }, { text: "Too informal for a professional setting", correct: false }] },
    { text: "When a customer is angry, the best approach is to:", options: [{ text: "Match their energy to show confidence", correct: false }, { text: "Lower your own voice, use their name, and focus on what you can do", correct: true }, { text: "Transfer them to a supervisor immediately", correct: false }, { text: "Cite company policy to establish the boundary", correct: false }] },
    { text: "Why is a complaint described as a gift?", options: [{ text: "Because it generates revenue for the complaints team", correct: false }, { text: "Because it tells you exactly where service has fallen short and gives you a recovery opportunity", correct: true }, { text: "Because customers rarely complain, so each one is rare", correct: false }, { text: "Because complaints are usually resolved in the company's favour", correct: false }] },
    { text: "Following through on a promised callback even with no new information is important because:", options: [{ text: "It is required by the complaints policy", correct: false }, { text: "Customers who feel forgotten escalate and churn", correct: true }, { text: "It demonstrates that the company has time to spare", correct: false }, { text: "Callbacks are always billed to the customer", correct: false }] },
    { text: "Personalising a customer interaction means:", options: [{ text: "Sharing personal details about yourself", correct: false }, { text: "Using the customer's name and referencing their specific policy or previous interaction", correct: true }, { text: "Customising the product at no extra cost", correct: false }, { text: "Sending handwritten notes after every call", correct: false }] },
    { text: "First impressions in customer service are:", options: [{ text: "Formed after the third interaction", correct: false }, { text: "Not important if the product is good", correct: false }, { text: "Formed within seconds and are very difficult to reverse", correct: true }, { text: "Primarily shaped by the company's advertising", correct: false }] },
    { text: "Defensive language like \"our policy says...\" should be replaced with:", options: [{ text: "Legal jargon to establish authority", correct: false }, { text: "\"Here is what I can do for you\"", correct: true }, { text: "\"Our policy is very clear on this\"", correct: false }, { text: "A direct reference to the customer's contract", correct: false }] },
    { text: "An escalation path should be provided to a customer when:", options: [{ text: "The customer raises their voice", correct: false }, { text: "The issue cannot be resolved on the first contact", correct: true }, { text: "The claim is above a certain monetary threshold", correct: false }, { text: "The customer has previously complained", correct: false }] },
    { text: "Negative feedback from customers should be treated as:", options: [{ text: "A personal attack on the service team", correct: false }, { text: "Useful data to improve service quality", correct: true }, { text: "Information to share only with senior management", correct: false }, { text: "An exception, since most customers are satisfied", correct: false }] },
    { text: "Being a brand ambassador means:", options: [{ text: "Attending official company events only", correct: false }, { text: "Ensuring your language, tone and response time reflect the company in every interaction", correct: true }, { text: "Promoting the company on personal social media", correct: false }, { text: "Wearing the company uniform at all times", correct: false }] },
    { text: "When greeting a customer, you should:", options: [{ text: "Wait for the customer to introduce themselves first", correct: false }, { text: "Greet professionally and promptly, state your name and role, and set a confident tone", correct: true }, { text: "Skip formalities to save time", correct: false }, { text: "Only greet customers you recognise by name", correct: false }] },
  ],
};

// ── 4. FINANCE ────────────────────────────────────────────────────────────

const FINANCE: CourseSpec = {
  deptName: "Finance",
  title: "Financial Management & Budgeting Basics",
  videoUrl: "https://www.youtube.com/watch?v=f3QoEMlF7Tk",
  body: `FINANCIAL MANAGEMENT & BUDGETING BASICS
Core financial concepts, budgeting principles and financial controls for insurance professionals.

MODULE 1 — CORE FINANCIAL CONCEPTS
Sound financial management is the backbone of a healthy insurance company. Every department's decisions have a financial dimension — understanding the fundamentals makes you a better contributor.

The income statement: Shows revenues earned and expenses incurred over a period. For an insurer, revenue includes gross written premium, investment income and fee income. Key expenses include claims incurred, operating costs and commission. The difference is profit or loss.

The balance sheet: A snapshot of what the company owns (assets), what it owes (liabilities) and the difference (equity or net worth). For an insurer, technical reserves — the funds set aside to pay future claims — are the dominant liability. Maintaining adequate reserves is a regulatory requirement.

Liquidity: The ability to meet obligations as they fall due. An insurer must always be able to pay claims when they arise. Holding too much liquidity in cash is inefficient; holding too little creates solvency risk.

The time value of money: A naira received today is worth more than a naira received in a year because today's naira can be invested. This principle underpins premium pricing, reserve discounting and investment decisions.

MODULE 2 — BUDGETING AND PLANNING
A budget is a financial plan. It converts strategy into numbers and gives managers a baseline against which to measure performance.

The budget cycle: Budgets are typically set annually, often quarterly reviewed. The process starts with strategic objectives, moves to revenue and volume assumptions, then to expense planning, and ends with an approved plan signed off by the board.

Variance analysis: Comparing actual results to budget reveals where the business is performing ahead of plan and where it is falling behind. A favourable variance (better than budget) in revenue or an adverse variance in expenses requires explanation. Understanding why a variance occurred is as important as the number itself.

Cost control: Every team must understand its own cost drivers — the activities or volumes that cause costs to increase. Approving expenditure within delegated authority limits, challenging discretionary spend and renegotiating supplier contracts are all part of cost management.

MODULE 3 — FINANCIAL CONTROLS AND COMPLIANCE
Financial controls exist to protect assets, ensure accurate reporting and prevent fraud.

Segregation of duties: No single person should both authorise a transaction and process it. Separating these roles creates a check that prevents both errors and fraud.

Delegation of authority: Every organisation has limits — specific amounts beyond which a more senior approver is required. Respecting these limits is not bureaucracy; it is risk management.

Expense claims: Expenses must be supported by receipts, comply with company policy, and be submitted promptly. Inflating expense claims is theft and grounds for dismissal.

Internal audit: The internal audit function provides independent assurance that controls are working. Cooperate fully with audit reviews — their findings protect the business and your department.`,
  questions: [
    { text: "The income statement shows:", options: [{ text: "What the company owns and owes at a point in time", correct: false }, { text: "Revenues earned and expenses incurred over a period", correct: true }, { text: "The company's investment portfolio", correct: false }, { text: "Only the company's claims payments", correct: false }] },
    { text: "For an insurer, technical reserves represent:", options: [{ text: "Cash held in the bank for daily operations", correct: false }, { text: "Funds set aside to pay future claims — the dominant liability on the balance sheet", correct: true }, { text: "Investments in shares and bonds", correct: false }, { text: "The company's retained profit", correct: false }] },
    { text: "Liquidity in an insurance context means:", options: [{ text: "How profitable the company is", correct: false }, { text: "The company's ability to meet obligations (pay claims) as they fall due", correct: true }, { text: "The ratio of equity to debt", correct: false }, { text: "The speed at which premiums are collected", correct: false }] },
    { text: "The time value of money states that:", options: [{ text: "Money loses value over time due to inflation only", correct: false }, { text: "A naira today is worth more than a naira in the future because today's naira can be invested", correct: true }, { text: "Future money is worth more because interest has been added", correct: false }, { text: "Time has no effect on the value of money", correct: false }] },
    { text: "A budget is best described as:", options: [{ text: "A historical record of past performance", correct: false }, { text: "A financial plan that converts strategy into numbers", correct: true }, { text: "A tool used only by the Finance department", correct: false }, { text: "A list of company assets and liabilities", correct: false }] },
    { text: "Variance analysis involves:", options: [{ text: "Calculating the probability of future losses", correct: false }, { text: "Comparing actual results to budget to understand performance", correct: true }, { text: "Analysing differences between employees' salaries", correct: false }, { text: "Reviewing the statistical variation in claims data", correct: false }] },
    { text: "An adverse variance means:", options: [{ text: "Revenue is better than budget", correct: false }, { text: "The result is worse than budget — revenue below plan or expenses above plan", correct: true }, { text: "The budget was set incorrectly", correct: false }, { text: "The company made a loss", correct: false }] },
    { text: "Segregation of duties means:", options: [{ text: "Separating finance from other departments", correct: false }, { text: "No single person should both authorise and process the same transaction", correct: true }, { text: "Keeping financial records confidential from non-finance staff", correct: false }, { text: "Rotating staff between departments annually", correct: false }] },
    { text: "Delegation of authority limits exist to:", options: [{ text: "Slow down decision-making to prevent errors", correct: false }, { text: "Restrict financial authority to qualified accountants", correct: false }, { text: "Ensure significant financial commitments receive appropriate senior approval", correct: true }, { text: "Comply with IFRS standards", correct: false }] },
    { text: "Inflating an expense claim is:", options: [{ text: "Acceptable if the total is below the company policy limit", correct: false }, { text: "Theft and grounds for dismissal", correct: true }, { text: "A minor procedural infraction", correct: false }, { text: "Only a problem if the company is making a loss", correct: false }] },
    { text: "Cost drivers are:", options: [{ text: "Senior managers who control the budget", correct: false }, { text: "The activities or volumes that cause costs to increase", correct: true }, { text: "Variable costs that cannot be controlled", correct: false }, { text: "Fixed costs that remain constant regardless of volume", correct: false }] },
    { text: "The balance sheet shows:", options: [{ text: "Revenue and expenses for the year", correct: false }, { text: "A snapshot of assets, liabilities and equity at a point in time", correct: true }, { text: "Cash flows into and out of the business", correct: false }, { text: "The budget for the next financial year", correct: false }] },
    { text: "The internal audit function provides:", options: [{ text: "Legal advice to the board", correct: false }, { text: "Independent assurance that financial controls are working", correct: true }, { text: "External compliance certification", correct: false }, { text: "Tax planning services", correct: false }] },
    { text: "Which of the following is an example of sound cost control?", options: [{ text: "Approving all expenditure requests to avoid delays", correct: false }, { text: "Challenging discretionary spend and respecting delegated authority limits", correct: true }, { text: "Reducing claims payments to cut costs", correct: false }, { text: "Deferring expense claims to future periods", correct: false }] },
    { text: "An insurer holds too much liquidity in cash because:", options: [{ text: "It is a regulatory requirement", correct: false }, { text: "Claims must be paid the same day they are received", correct: false }, { text: "Excessive cash is inefficient — it forgoes investment returns", correct: true }, { text: "Cash earns the highest return in a stable economy", correct: false }] },
  ],
};

// ── 5. HUMAN RESOURCES ────────────────────────────────────────────────────

const HR: CourseSpec = {
  deptName: "Human Resources",
  title: "HR Fundamentals: People, Policy & Performance",
  videoUrl: "https://www.youtube.com/watch?v=iigxHCmMp14",
  body: `HR FUNDAMENTALS: PEOPLE, POLICY & PERFORMANCE
Core human resources principles for managers and employees at SUNU Assurances Nigeria.

MODULE 1 — RECRUITMENT AND ONBOARDING
Getting the right people into the right roles is the foundation of organisational performance.

Job design: A good job description defines outcomes, not just tasks. It describes what success looks like in the role and the competencies needed to achieve it. Vague job descriptions attract misaligned candidates and set new hires up to fail.

Structured selection: Use a consistent, structured interview process — the same questions asked to every candidate for the same role. This reduces bias and makes comparisons fair. Decisions should be based on evidence from the interview and any assessment, not on "fit" impressions that mask unconscious bias.

Onboarding: The first 90 days are critical. A new employee who is well-oriented — who knows their responsibilities, their team, the systems and the company's values — becomes productive faster and is less likely to leave. Assign a buddy, complete required training, and schedule regular check-ins with the line manager.

MODULE 2 — PERFORMANCE MANAGEMENT
Performance management is a continuous conversation, not an annual event.

Goal setting: Goals should be SMART — Specific, Measurable, Achievable, Relevant and Time-bound. Goals that are vague or unrealistic demotivate rather than focus. Review them at least quarterly and update them when priorities change.

Feedback: Regular feedback — both positive and developmental — is the manager's most important tool. Feedback that is specific, timely and focused on behaviour (not character) is absorbed and acted upon. "You handled that client call well because you stayed calm and found a solution" is useful; "you're good at calls" is not.

Managing underperformance: When an employee is not meeting expectations, address it early. The longer underperformance goes unaddressed, the harder it is to resolve. Understand the root cause — is it skill (training), will (motivation), or circumstance (personal issue)? Respond with the right intervention, not a one-size-fits-all warning.

MODULE 3 — EMPLOYEE RELATIONS AND CONDUCT
A respectful, fair and consistent approach to employee relations builds trust and reduces conflict.

Disciplinary process: Discipline exists to correct behaviour, not to punish. The standard process — verbal warning, written warning, final written warning, dismissal — should be followed consistently. Skipping steps or applying the process inconsistently exposes the company to legal challenge.

Grievances: Every employee has the right to raise a grievance. Grievances must be taken seriously, investigated fairly and resolved promptly. The investigating manager should not be the subject of the grievance.

Equality and diversity: Decisions about hiring, promotion, pay and discipline must be based on merit and conduct, never on gender, ethnicity, religion, age, disability or any other protected characteristic. Discriminatory behaviour is both unlawful and contrary to the company's values.

Confidentiality: HR information — salaries, disciplinary records, medical details — is strictly confidential. Access is restricted to those with a legitimate need.`,
  questions: [
    { text: "A good job description should focus on:", options: [{ text: "A detailed list of daily tasks", correct: false }, { text: "Outcomes and the competencies needed to achieve them", correct: true }, { text: "The salary range and benefits", correct: false }, { text: "The reporting line only", correct: false }] },
    { text: "Structured selection interviews require:", options: [{ text: "Different questions for each candidate based on their CV", correct: false }, { text: "The same questions asked to every candidate for the same role", correct: true }, { text: "Panel interviews for all positions", correct: false }, { text: "Only technical questions relevant to the job", correct: false }] },
    { text: "The first 90 days of employment are critical because:", options: [{ text: "Probationary period performance determines final pay", correct: false }, { text: "A well-oriented new hire becomes productive faster and is less likely to leave", correct: true }, { text: "All skills training must be completed within 90 days", correct: false }, { text: "The employment contract is not binding during this period", correct: false }] },
    { text: "SMART goals are:", options: [{ text: "Strategic, Manageable, Ambitious, Reviewed, Timed", correct: false }, { text: "Specific, Measurable, Achievable, Relevant, Time-bound", correct: true }, { text: "Simple, Monitored, Actionable, Realistic, Thorough", correct: false }, { text: "Shared, Motivated, Agreed, Realistic, Tracked", correct: false }] },
    { text: "Which feedback is most useful?", options: [{ text: "\"You're a great communicator.\"", correct: false }, { text: "\"You handled that client call well because you stayed calm and found a solution.\"", correct: true }, { text: "\"Your communication skills need work.\"", correct: false }, { text: "\"You should communicate more like your colleague.\"", correct: false }] },
    { text: "When an employee is underperforming, you should:", options: [{ text: "Wait until the annual review to address it", correct: false }, { text: "Immediately issue a formal warning", correct: false }, { text: "Address it early, understand the root cause and respond with the right intervention", correct: true }, { text: "Reassign the employee to a different team", correct: false }] },
    { text: "The standard disciplinary process order is:", options: [{ text: "Written warning → Verbal warning → Final written warning → Dismissal", correct: false }, { text: "Verbal warning → Written warning → Final written warning → Dismissal", correct: true }, { text: "Investigation → Warning → Dismissal → Appeal", correct: false }, { text: "Dismissal → Appeal → Reinstatement", correct: false }] },
    { text: "The purpose of the disciplinary process is to:", options: [{ text: "Punish the employee for wrongdoing", correct: false }, { text: "Correct behaviour and give the employee the opportunity to improve", correct: true }, { text: "Create a legal record for future termination", correct: false }, { text: "Warn colleagues about the employee's behaviour", correct: false }] },
    { text: "When investigating a grievance, the investigating manager should:", options: [{ text: "Be the most senior person in the department", correct: false }, { text: "Not be the subject of the grievance", correct: true }, { text: "Be a member of the HR department only", correct: false }, { text: "Be appointed by the employee raising the grievance", correct: false }] },
    { text: "Decisions about hiring and promotion must be based on:", options: [{ text: "Seniority and years of service", correct: false }, { text: "Merit and conduct, never on protected characteristics such as gender or ethnicity", correct: true }, { text: "The manager's assessment of cultural fit", correct: false }, { text: "Recommendations from existing employees", correct: false }] },
    { text: "HR information such as salaries and disciplinary records must be:", options: [{ text: "Available to all employees on request", correct: false }, { text: "Shared with direct line managers only", correct: false }, { text: "Strictly confidential, accessible only to those with a legitimate need", correct: true }, { text: "Published in the company's annual report", correct: false }] },
    { text: "The root causes of underperformance can be categorised as:", options: [{ text: "Attitude, effort and results", correct: false }, { text: "Skill (training), will (motivation), or circumstance (personal issue)", correct: true }, { text: "Manager, process and tools", correct: false }, { text: "Experience, qualifications and department culture", correct: false }] },
    { text: "Performance management is best described as:", options: [{ text: "An annual performance review process", correct: false }, { text: "A continuous conversation between manager and employee", correct: true }, { text: "The HR department's responsibility to monitor staff", correct: false }, { text: "A tool used only when performance is below standard", correct: false }] },
    { text: "An onboarding buddy is assigned to:", options: [{ text: "Monitor the new employee's performance for the first 90 days", correct: false }, { text: "Complete mandatory training on behalf of the new employee", correct: false }, { text: "Help the new employee feel oriented and connected during their initial period", correct: true }, { text: "Approve the new employee's expense claims", correct: false }] },
    { text: "Skipping steps in the disciplinary process:", options: [{ text: "Speeds up the resolution of serious misconduct cases", correct: false }, { text: "Is acceptable when the manager is confident in the outcome", correct: false }, { text: "Exposes the company to legal challenge for inconsistent application", correct: true }, { text: "Is permitted if the employee has previously been warned", correct: false }] },
  ],
};

// ── 6. INFORMATION TECHNOLOGY ─────────────────────────────────────────────

const IT: CourseSpec = {
  deptName: "Information Technology",
  title: "Cybersecurity Awareness & Digital Safety",
  videoUrl: "https://www.youtube.com/watch?v=nzZkKoREEGo",
  body: `CYBERSECURITY AWARENESS & DIGITAL SAFETY
Practical guidance for every SUNU Assurances Nigeria employee on protecting company and customer data.

MODULE 1 — THE THREAT LANDSCAPE
Cyber threats are not only a problem for technology companies. Insurance firms hold vast amounts of sensitive personal and financial data, making them high-value targets.

Phishing: The most common attack vector. An attacker sends an email that appears to come from a trusted source — a colleague, a bank, a regulator — to trick you into revealing credentials or clicking a malicious link. Signs: urgency ("act now or your account will be closed"), unexpected sender, misspelled domain names, links that do not match the display text.

Malware: Malicious software installed on a device, often via a phishing email or infected USB drive. Types include ransomware (encrypts your files and demands payment), spyware (monitors your activity) and keyloggers (capture what you type).

Social engineering: Attackers manipulate people, not systems. A caller who claims to be from IT support and asks for your password, a visitor who tailgates into a secure area, or a colleague who asks you to bypass a security step — all are social engineering attacks.

Insider threats: Not all threats come from outside. Disgruntled employees, careless handling of data, and accidental disclosure are as damaging as external attacks. This is why access controls and clear data handling policies exist.

MODULE 2 — SAFE PRACTICES AT WORK
Most breaches are caused not by sophisticated hackers but by predictable human behaviour.

Passwords: Use long, unique passwords for every account. Never share passwords. Use a passphrase — three or four unrelated words joined by symbols — rather than a short complex password. Enable multi-factor authentication (MFA) wherever it is available.

Email discipline: Do not click links or open attachments from unknown senders. Verify unusual requests by calling the sender directly — not by replying to the suspicious email. If in doubt, report to IT before clicking.

Device security: Lock your screen whenever you leave your workstation, even briefly. Keep software and operating systems up to date — updates contain security patches. Never plug personal USB drives into company equipment.

Data handling: Store data only in approved company systems. Do not send customer or company data to personal email addresses. Dispose of physical documents securely — shred, do not bin.

MODULE 3 — INCIDENT RESPONSE
Knowing how to respond quickly limits the damage when a security incident occurs.

Recognising an incident: Signs include: being unable to access files you could previously open, unexpected password change notices, computer behaving unusually, an email sent from your account that you did not write, or a request for a large unusual transfer.

What to do: Stop using the affected device immediately. Do not try to fix it yourself. Report to IT immediately with as much detail as possible — what you saw, what you clicked, when it happened. The faster you report, the faster the damage can be contained.

Your obligation: Delay in reporting a cyber incident can convert a manageable problem into a data breach affecting thousands of customers, with regulatory and reputational consequences. Every employee has a duty to report immediately and honestly.`,
  questions: [
    { text: "What is phishing?", options: [{ text: "A type of malware that encrypts your files", correct: false }, { text: "An attack using deceptive emails to trick you into revealing credentials or clicking malicious links", correct: true }, { text: "A tool used by IT to test network security", correct: false }, { text: "A method of stealing data via USB drives", correct: false }] },
    { text: "Which of the following is a sign of a phishing email?", options: [{ text: "An email from a known sender that you expected", correct: false }, { text: "A link in the email that matches the display text", correct: false }, { text: "Urgent language and a sender domain that is slightly misspelled", correct: true }, { text: "A message without any attachments", correct: false }] },
    { text: "Ransomware:", options: [{ text: "Monitors your keystrokes and sends them to an attacker", correct: false }, { text: "Encrypts your files and demands payment to restore access", correct: true }, { text: "Sends spam emails from your account", correct: false }, { text: "Slows down your computer without causing data loss", correct: false }] },
    { text: "Social engineering attacks target:", options: [{ text: "Firewalls and network infrastructure", correct: false }, { text: "People — exploiting trust, urgency or authority to bypass security", correct: true }, { text: "Outdated operating systems only", correct: false }, { text: "Database servers", correct: false }] },
    { text: "The best password strategy is:", options: [{ text: "A single complex password for all accounts so it is easy to remember", correct: false }, { text: "A unique passphrase for each account, with multi-factor authentication enabled", correct: true }, { text: "Changing your password every week to confuse attackers", correct: false }, { text: "Using your name and date of birth as the basis for all passwords", correct: false }] },
    { text: "If you receive a suspicious email attachment, you should:", options: [{ text: "Open it to check if it is harmless", correct: false }, { text: "Forward it to colleagues to see if they received it too", correct: false }, { text: "Report it to IT before clicking or opening anything", correct: true }, { text: "Delete it and not report it", correct: false }] },
    { text: "Multi-factor authentication (MFA) means:", options: [{ text: "Using a different password for each system", correct: false }, { text: "Verifying identity through a second factor (such as an SMS code) in addition to a password", correct: true }, { text: "Having multiple people approve access to sensitive systems", correct: false }, { text: "Logging in with a fingerprint instead of a password", correct: false }] },
    { text: "An insider threat refers to:", options: [{ text: "An external hacker who has infiltrated the company network", correct: false }, { text: "A risk arising from employees or others with authorised access — through carelessness or malice", correct: true }, { text: "Threats originating from partner companies", correct: false }, { text: "A type of phishing attack targeting senior management", correct: false }] },
    { text: "When you receive an unusual financial transfer request by email, you should:", options: [{ text: "Process it quickly to meet the sender's deadline", correct: false }, { text: "Reply to the email to confirm the details", correct: false }, { text: "Call the apparent sender directly to verify the request independently", correct: true }, { text: "Forward it to Finance for processing", correct: false }] },
    { text: "Customer data should be stored:", options: [{ text: "In any convenient location including personal email", correct: false }, { text: "Only in approved company systems", correct: true }, { text: "On personal USB drives for backup purposes", correct: false }, { text: "In spreadsheets shared by email for easy access", correct: false }] },
    { text: "When you notice your computer is behaving unusually, you should:", options: [{ text: "Restart the computer and continue working", correct: false }, { text: "Try to fix the issue yourself first", correct: false }, { text: "Stop using the device immediately and report to IT", correct: true }, { text: "Save all open documents before doing anything else", correct: false }] },
    { text: "Software updates should be applied because:", options: [{ text: "They add new features that improve productivity", correct: false }, { text: "They contain security patches that fix known vulnerabilities", correct: true }, { text: "IT policy requires updates only once a year", correct: false }, { text: "Updates improve network speed", correct: false }] },
    { text: "Physical document security means:", options: [{ text: "Storing documents in a locked drawer at all times", correct: false }, { text: "Shredding sensitive physical documents rather than putting them in the bin", correct: true }, { text: "Printing only the documents you need each day", correct: false }, { text: "Keeping printed documents on your desk so they are visible", correct: false }] },
    { text: "Delay in reporting a cyber incident:", options: [{ text: "Allows IT time to investigate before escalating", correct: false }, { text: "Is acceptable if you are unsure whether it is a real incident", correct: false }, { text: "Can turn a manageable problem into a large-scale data breach with regulatory consequences", correct: true }, { text: "Is only harmful if the incident involves customer data", correct: false }] },
    { text: "Locking your screen whenever you leave your workstation protects against:", options: [{ text: "Phishing attacks", correct: false }, { text: "Ransomware via email", correct: false }, { text: "Unauthorised access by someone physically present at your desk", correct: true }, { text: "Malware installed via USB drives", correct: false }] },
  ],
};

// ── 7. INTERNAL CONTROL ───────────────────────────────────────────────────

const INTERNAL_CONTROL: CourseSpec = {
  deptName: "Internal Control",
  title: "Internal Controls & Risk Management",
  videoUrl: "https://www.youtube.com/watch?v=jj1vRWfOg0Q",
  body: `INTERNAL CONTROLS & RISK MANAGEMENT
How internal controls work, why they matter in insurance, and how every employee contributes to a sound control environment.

MODULE 1 — WHAT ARE INTERNAL CONTROLS?
Internal controls are the policies, procedures and behaviours that an organisation puts in place to achieve its objectives reliably, protect its assets, and ensure accurate reporting.

The COSO framework: The most widely used internal control framework identifies five components: Control Environment (the tone set by management), Risk Assessment (identifying and evaluating risks), Control Activities (the specific policies and procedures that address risks), Information & Communication (ensuring the right information reaches the right people), and Monitoring Activities (ongoing assessment of whether controls are working).

Why they matter in insurance: Insurers hold premium funds in trust for policyholders. A failure of internal controls — an undetected error, a fraudulent transaction, an overridden approval — can result in regulatory sanctions, financial loss and reputational damage. Internal controls are the last line of defence.

Types of controls:
- Preventive controls stop errors or fraud before they occur (e.g., requiring two signatures on a payment).
- Detective controls identify errors or fraud after the fact (e.g., monthly bank reconciliations).
- Corrective controls address identified problems (e.g., reversing a wrongly posted journal entry).

MODULE 2 — IDENTIFYING AND MANAGING RISK
Risk is the possibility that an event will occur and adversely affect the achievement of objectives.

The risk register: A structured record of identified risks, their likelihood, potential impact, the controls in place to manage them, and the residual risk that remains after controls. Every department contributes to the risk register.

Risk appetite: The level of risk an organisation is prepared to accept in pursuit of its objectives. Some risk is unavoidable in insurance — the company takes on risk as its business. The question is whether the risk is priced, understood and controlled.

The three lines of defence:
- First line: Business operations (every employee managing risks in their daily work).
- Second line: Risk and compliance functions (oversight and frameworks).
- Third line: Internal audit (independent assurance).

MODULE 3 — TESTING AND MONITORING CONTROLS
Controls that are not monitored degrade over time. People find workarounds; volumes increase; risks change. Continuous monitoring keeps the control environment effective.

Control testing: Periodically verifying that a control operates as designed. For example, testing whether expense approvals are always obtained before payment. Testing may be done by the control owner (self-assessment) or by Internal Audit.

Key control indicators (KCIs): Metrics that signal whether controls are working — reconciliation completion rates, approval turnaround times, number of overrides. A KCI that deteriorates is an early warning that a control is breaking down.

Your responsibility: Every employee is part of the control environment. If you identify a control that is not working — a step being skipped, a system error, a process that creates a risk — you are expected to escalate it. Silence when you see a problem is a failure of the control environment too.`,
  questions: [
    { text: "Internal controls are designed to:", options: [{ text: "Restrict employee autonomy", correct: false }, { text: "Achieve objectives reliably, protect assets and ensure accurate reporting", correct: true }, { text: "Satisfy regulatory requirements only", correct: false }, { text: "Replace the need for external audit", correct: false }] },
    { text: "The five components of the COSO framework include:", options: [{ text: "Planning, Organising, Leading, Controlling, Reporting", correct: false }, { text: "Control Environment, Risk Assessment, Control Activities, Information & Communication, Monitoring", correct: true }, { text: "Prevention, Detection, Correction, Oversight, Reporting", correct: false }, { text: "Strategy, Operations, Compliance, Reporting, Technology", correct: false }] },
    { text: "A preventive control:", options: [{ text: "Identifies errors after they have occurred", correct: false }, { text: "Corrects errors once they are found", correct: false }, { text: "Stops errors or fraud before they occur", correct: true }, { text: "Reports issues to management on a monthly basis", correct: false }] },
    { text: "A detective control is best illustrated by:", options: [{ text: "Requiring two signatures before a payment is made", correct: false }, { text: "Monthly bank reconciliations that identify unmatched transactions", correct: true }, { text: "Restricting system access to authorised users only", correct: false }, { text: "Mandatory anti-fraud training for all staff", correct: false }] },
    { text: "The risk register records:", options: [{ text: "Claims paid in the current period", correct: false }, { text: "Identified risks, their likelihood and impact, controls in place, and residual risk", correct: true }, { text: "Past incidents only", correct: false }, { text: "The company's insurance policies", correct: false }] },
    { text: "Risk appetite refers to:", options: [{ text: "The level of risk the company will never accept", correct: false }, { text: "The level of risk an organisation is prepared to accept in pursuit of its objectives", correct: true }, { text: "The maximum claim amount the company will pay", correct: false }, { text: "The number of risk events expected in a year", correct: false }] },
    { text: "The first line of defence is:", options: [{ text: "Internal Audit", correct: false }, { text: "The Risk and Compliance function", correct: false }, { text: "Business operations — every employee managing risks in their daily work", correct: true }, { text: "The board of directors", correct: false }] },
    { text: "The third line of defence is:", options: [{ text: "Business operations", correct: false }, { text: "Risk and Compliance oversight", correct: false }, { text: "Internal Audit providing independent assurance", correct: true }, { text: "External regulators", correct: false }] },
    { text: "Control testing verifies that:", options: [{ text: "Employees understand the company's risk appetite", correct: false }, { text: "A control operates as it was designed to operate", correct: true }, { text: "The risk register is up to date", correct: false }, { text: "Regulatory reports have been submitted on time", correct: false }] },
    { text: "Key control indicators (KCIs) are:", options: [{ text: "Annual targets set during the budgeting process", correct: false }, { text: "Metrics that signal whether controls are working and may flag early deterioration", correct: true }, { text: "Legal requirements issued by regulators", correct: false }, { text: "Scores given to employees after a control audit", correct: false }] },
    { text: "If you identify a control that is not working, you should:", options: [{ text: "Fix it yourself without informing anyone", correct: false }, { text: "Ignore it if it has not caused a problem yet", correct: false }, { text: "Escalate it to your manager or the Internal Control team", correct: true }, { text: "Document it in your personal notes for future reference", correct: false }] },
    { text: "An undetected control failure in an insurance company can result in:", options: [{ text: "Faster claims processing", correct: false }, { text: "Regulatory sanctions, financial loss and reputational damage", correct: true }, { text: "Improved profitability due to reduced compliance costs", correct: false }, { text: "Stronger relationships with policyholders", correct: false }] },
    { text: "Why do controls degrade over time if not monitored?", options: [{ text: "Regulations change and old controls become irrelevant", correct: false }, { text: "People find workarounds, volumes change, and new risks emerge", correct: true }, { text: "Controls become more expensive to maintain over time", correct: false }, { text: "Technology upgrades automatically replace manual controls", correct: false }] },
    { text: "The Control Environment component of COSO refers to:", options: [{ text: "The specific procedures that address individual risks", correct: false }, { text: "The systems used to record financial transactions", correct: false }, { text: "The tone set by management — the foundation on which other controls rest", correct: true }, { text: "The process for identifying and assessing risks", correct: false }] },
    { text: "\"Residual risk\" is:", options: [{ text: "The total risk before any controls are applied", correct: false }, { text: "Risk that has already resulted in a loss", correct: false }, { text: "The risk that remains after controls have been applied", correct: true }, { text: "The risk that cannot be insured", correct: false }] },
  ],
};

// ── 8. LEGAL ──────────────────────────────────────────────────────────────

const LEGAL: CourseSpec = {
  deptName: "Legal",
  title: "Legal Compliance & Contract Essentials",
  videoUrl: "https://www.youtube.com/watch?v=hq9EMtAH34w",
  body: `LEGAL COMPLIANCE & CONTRACT ESSENTIALS
Key legal concepts that every SUNU Assurances Nigeria employee needs to understand.

MODULE 1 — CONTRACTS AND LEGAL OBLIGATIONS
A contract is a legally binding agreement between two or more parties. Insurance policies are contracts. Supplier agreements are contracts. Employment agreements are contracts. Understanding what makes a contract valid — and what can go wrong — protects the company.

Elements of a valid contract: Offer, acceptance, consideration (something of value exchanged by each side), intention to create legal relations, and capacity (both parties must be legally able to enter the contract — adults of sound mind). Missing any element means the contract may be unenforceable.

Insurance contracts specifically: An insurance contract is based on the principle of utmost good faith (uberrimae fidei). Both parties — the insurer and the insured — are obliged to disclose all material facts. A policyholder who fails to disclose that they have a prior criminal conviction may void the policy. An insurer who misrepresents the scope of cover may be liable beyond the policy terms.

Breach of contract: A breach occurs when one party fails to fulfil their contractual obligation. It may be material (going to the heart of the contract — entitling the other party to treat the contract as ended) or minor (entitling only to damages). Identifying and documenting a breach early is critical.

MODULE 2 — REGULATORY COMPLIANCE IN INSURANCE
Operating as an insurer in Nigeria carries a web of regulatory obligations that cannot be delegated or ignored.

The Insurance Act and NAICOM: The National Insurance Commission (NAICOM) licenses and regulates all insurance companies in Nigeria. Its directives are legally binding. Failure to comply — late regulatory returns, inadequate solvency margins, mis-selling — can result in sanctions including licence revocation.

Consumer protection: Policyholders are protected by both insurance regulations and broader consumer protection law. Insurance must be explained clearly; exclusions must be disclosed; claim settlement must not be unreasonably delayed. The insurer's obligation is not simply to issue a policy — it is to ensure the customer understands what they have bought.

Data protection: The Nigeria Data Protection Regulation (NDPR) and subsequent legislation impose obligations on how the company collects, stores and uses personal data. Customer data may only be used for the purpose for which it was collected. It must be held securely and not shared without consent.

MODULE 3 — EMPLOYMENT LAW ESSENTIALS
Every manager and HR practitioner needs a working knowledge of employment law.

The Labour Act: Sets minimum standards for employment — notice periods, termination, leave entitlements, and working hours. Contracts cannot take away statutory rights; they can only provide more generous terms.

Termination: Dismissal must follow a fair procedure. Unfair dismissal — removing an employee without following due process — exposes the company to claims. Even where the reason for dismissal is valid (misconduct, redundancy), the process must be fair.

Intellectual property at work: Work created by an employee in the course of employment generally belongs to the employer. Confidential business information, client lists, and processes learned on the job may not be taken to a competitor. These obligations often continue after the employment ends.`,
  questions: [
    { text: "Which elements are required to form a valid contract?", options: [{ text: "Offer, rejection, payment and signature", correct: false }, { text: "Offer, acceptance, consideration, intention and capacity", correct: true }, { text: "Terms, conditions, duration and parties", correct: false }, { text: "Agreement, witnesses, stamp duty and registration", correct: false }] },
    { text: "The principle of utmost good faith in insurance means:", options: [{ text: "The insurer must always pay claims promptly", correct: false }, { text: "Both parties must disclose all material facts to each other", correct: true }, { text: "The insured must behave honestly only when filing a claim", correct: false }, { text: "The insurer must offer the best available premium", correct: false }] },
    { text: "A material breach of contract:", options: [{ text: "Entitles the injured party only to claim damages", correct: false }, { text: "Goes to the heart of the contract and entitles the injured party to treat the contract as ended", correct: true }, { text: "Is always accidental and cannot form the basis of a legal claim", correct: false }, { text: "Occurs only when a payment is missed", correct: false }] },
    { text: "NAICOM is responsible for:", options: [{ text: "Tax collection from insurance companies", correct: false }, { text: "Licensing and regulating all insurance companies in Nigeria", correct: true }, { text: "Setting monetary policy for the financial sector", correct: false }, { text: "Adjudicating disputes between policyholders only", correct: false }] },
    { text: "Failing to disclose a prior criminal conviction on an insurance application may:", options: [{ text: "Increase the premium retrospectively", correct: false }, { text: "Be overlooked if the conviction is old", correct: false }, { text: "Void the policy on the grounds of non-disclosure of a material fact", correct: true }, { text: "Result in a formal warning but not affect cover", correct: false }] },
    { text: "Under the NDPR, customer data may only be used:", options: [{ text: "For any purpose that benefits the company", correct: false }, { text: "For the purpose for which it was collected, with the data held securely", correct: true }, { text: "By the Sales and Marketing team for promotional campaigns", correct: false }, { text: "Without restriction, as the customer provided it voluntarily", correct: false }] },
    { text: "Consumer protection in insurance requires the insurer to:", options: [{ text: "Offer the lowest possible premium to all customers", correct: false }, { text: "Explain products clearly, disclose exclusions and not unreasonably delay claims", correct: true }, { text: "Guarantee that all claims will be paid", correct: false }, { text: "Provide a free review every year", correct: false }] },
    { text: "The Labour Act in Nigeria sets:", options: [{ text: "Tax rates for employee salaries", correct: false }, { text: "Minimum standards for notice periods, termination, leave entitlements and working hours", correct: true }, { text: "The maximum number of employees a company may hire", correct: false }, { text: "Rules for collective bargaining by trade unions only", correct: false }] },
    { text: "An employment contract may:", options: [{ text: "Remove statutory rights provided by the Labour Act", correct: false }, { text: "Only provide rights that are more generous than the Labour Act minimum", correct: true }, { text: "Override health and safety legislation", correct: false }, { text: "Set terms that are binding only if witnessed by a lawyer", correct: false }] },
    { text: "Intellectual property created by an employee during employment generally:", options: [{ text: "Belongs to the employee who created it", correct: false }, { text: "Is jointly owned by the employee and the employer", correct: false }, { text: "Belongs to the employer", correct: true }, { text: "Enters the public domain after five years", correct: false }] },
    { text: "An insurer who misrepresents the scope of cover may be:", options: [{ text: "Protected by the policy exclusion clauses", correct: false }, { text: "Liable beyond the policy terms", correct: true }, { text: "Required only to refund the premium", correct: false }, { text: "Exempt if the misrepresentation was unintentional", correct: false }] },
    { text: "Late regulatory returns to NAICOM can result in:", options: [{ text: "An informal reminder from the regulator", correct: false }, { text: "Sanctions including fines and in serious cases, licence revocation", correct: true }, { text: "A reduction in the company's solvency margin requirement", correct: false }, { text: "No consequences for the first offence", correct: false }] },
    { text: "\"Consideration\" in a contract means:", options: [{ text: "Thinking carefully before signing", correct: false }, { text: "Something of value exchanged by each party — what each gives and receives", correct: true }, { text: "The duration of the contract period", correct: false }, { text: "The legal costs of enforcing the contract", correct: false }] },
    { text: "Post-employment obligations regarding confidential information mean:", options: [{ text: "An employee must delete all company data before leaving", correct: false }, { text: "Confidentiality obligations end on the last day of employment", correct: false }, { text: "An employee may not use confidential business information with a competitor even after leaving", correct: true }, { text: "Client lists belong to the employee if they developed the relationships personally", correct: false }] },
    { text: "Fair dismissal requires:", options: [{ text: "A valid reason for dismissal only", correct: false }, { text: "A valid reason AND a fair procedure", correct: true }, { text: "Board approval for every dismissal", correct: false }, { text: "Written notice from Legal before any termination discussion", correct: false }] },
  ],
};

// ── 9. UNDERWRITING ───────────────────────────────────────────────────────

const UNDERWRITING: CourseSpec = {
  deptName: "Underwriting",
  title: "Insurance Underwriting Principles",
  videoUrl: "https://www.youtube.com/watch?v=KLz9roBL8Go",
  body: `INSURANCE UNDERWRITING PRINCIPLES
How insurers assess, price and accept risk — the foundations of sound underwriting practice.

MODULE 1 — WHAT IS UNDERWRITING?
Underwriting is the process by which an insurer evaluates a risk, decides whether to accept it, and determines the terms and premium on which it will be covered.

The underwriting function: Underwriters act as the gatekeepers of an insurer's risk portfolio. Their decisions determine what risks the company carries, at what price, and on what conditions. Poor underwriting — accepting bad risks at inadequate premiums — leads to adverse claims experience and can threaten solvency.

The law of large numbers: Insurance works because of statistical predictability. By accepting many similar risks, the insurer can predict with reasonable accuracy what proportion will produce a claim and price accordingly. The more risks in the pool, the more stable the claims experience.

Adverse selection: The tendency for people with higher-than-average risk to seek insurance, while those with lower risk are less motivated to buy it. Insurers manage adverse selection through underwriting — by carefully evaluating each risk rather than offering the same price to all comers.

Moral hazard: The risk that having insurance changes behaviour — a person with fully comprehensive motor cover may be less careful parking than one paying for all repairs themselves. Underwriting terms such as excesses and policy conditions are partly designed to maintain the insured's incentive to manage risk.

MODULE 2 — RISK ASSESSMENT AND PRICING
Underwriting is fundamentally about understanding risk well enough to price it fairly and sustainably.

Information gathering: The underwriting decision starts with the proposal form or submission. The underwriter needs accurate, complete information about the nature of the risk — what is being insured, its value, how it is used, prior claims history, and any special features that increase or decrease risk.

Rating factors: The specific variables used to calculate a premium. In motor insurance: age, vehicle type, driver history, geographic location. In property: construction type, occupancy, security measures, proximity to flood zones. Rating factors should be predictive of claims and justifiable.

Underwriting authorities: Most underwriters work within defined limits. Risks above a certain size or complexity require referral to a senior underwriter or a reinsurer. Respecting these limits is a governance requirement, not an optional step.

Reinsurance: Insurance for insurers. By ceding a portion of their risk to a reinsurer, an insurer limits its exposure to any single large loss. This allows the insurer to accept risks it could not otherwise carry alone.

MODULE 3 — UNDERWRITING DECISIONS AND DOCUMENTATION
Sound decisions, properly documented, are what separate professional underwriting from guesswork.

Accepting, modifying or declining: An underwriter may accept a risk as submitted, accept it on amended terms (a higher excess, an exclusion, a warranty), or decline it. The decision should be based on the risk presented and the company's underwriting guidelines — not on who is asking.

Documentation: Every underwriting decision must be documented — the information reviewed, the factors considered, the terms offered and the rationale. If a risk produces a large claim, the file must show that the decision to accept it was made on a sound, informed basis.

Warranties and conditions: A warranty is a promise by the insured that a certain state of affairs is or will remain true (e.g., a burglar alarm will be maintained in working order). Breach of warranty — even if unrelated to the claim — may discharge the insurer's liability. Conditions precedent must be strictly complied with.

Portfolio management: Individual underwriting decisions must also be considered in the context of the whole portfolio. Concentration risk (too many similar risks in one geographic area or industry) must be managed. The underwriting manager reviews the portfolio regularly for balance.`,
  questions: [
    { text: "Underwriting is best defined as:", options: [{ text: "The process of collecting premiums from policyholders", correct: false }, { text: "Evaluating a risk, deciding whether to accept it, and setting the terms and premium", correct: true }, { text: "Investigating and paying insurance claims", correct: false }, { text: "Selling insurance products to customers", correct: false }] },
    { text: "The law of large numbers enables insurance because:", options: [{ text: "More policies mean higher total revenue", correct: false }, { text: "With many similar risks, the insurer can predict with reasonable accuracy the proportion that will claim", correct: true }, { text: "Large groups of policyholders negotiate better reinsurance rates", correct: false }, { text: "Large insurers are exempt from some regulatory requirements", correct: false }] },
    { text: "Adverse selection describes:", options: [{ text: "The tendency for policyholders to over-claim", correct: false }, { text: "The risk of a claims manager making a bad decision", correct: false }, { text: "The tendency for higher-risk individuals to seek insurance more than lower-risk ones", correct: true }, { text: "An insurer that accepts all risks without assessment", correct: false }] },
    { text: "Moral hazard means:", options: [{ text: "An insured who has committed fraud", correct: false }, { text: "The risk that insurance reduces the insured's incentive to manage the insured risk carefully", correct: true }, { text: "An underwriter who accepts a risk they should decline", correct: false }, { text: "A policyholder who does not disclose material facts", correct: false }] },
    { text: "An excess in a policy is partly designed to:", options: [{ text: "Increase the insurer's premium income", correct: false }, { text: "Maintain the insured's financial interest in managing the risk", correct: true }, { text: "Reduce the amount of documentation required", correct: false }, { text: "Limit the insurer's total liability", correct: false }] },
    { text: "Rating factors must be:", options: [{ text: "Applied equally to all policyholders regardless of their risk profile", correct: false }, { text: "Predictive of claims and justifiable", correct: true }, { text: "Set only by the reinsurer", correct: false }, { text: "Kept confidential from the policyholder", correct: false }] },
    { text: "An underwriting authority limit means:", options: [{ text: "The maximum premium that can be charged", correct: false }, { text: "Risks above a defined size or complexity must be referred to a senior underwriter or reinsurer", correct: true }, { text: "The underwriter's right to decline any risk", correct: false }, { text: "A limit on the number of policies that can be issued per day", correct: false }] },
    { text: "Reinsurance is:", options: [{ text: "Insurance sold to private individuals rather than businesses", correct: false }, { text: "Insurance purchased by an insurer to limit its exposure to individual large losses", correct: true }, { text: "A second insurance policy taken out by the same policyholder", correct: false }, { text: "A type of investment product offered to high-net-worth clients", correct: false }] },
    { text: "An underwriter may respond to a submitted risk by:", options: [{ text: "Accepting, modifying terms, or declining — based on the risk and company guidelines", correct: true }, { text: "Only accepting or declining — no modifications are permitted", correct: false }, { text: "Accepting any risk as long as a premium is offered", correct: false }, { text: "Deferring to the broker's recommendation in all cases", correct: false }] },
    { text: "Why must underwriting decisions be documented?", options: [{ text: "To comply with NAICOM's annual filing requirements", correct: false }, { text: "To show that acceptance of a risk was made on a sound, informed basis if a large claim arises", correct: true }, { text: "Documentation is required only for declined risks", correct: false }, { text: "To measure the underwriter's productivity", correct: false }] },
    { text: "A warranty in an insurance policy is:", options: [{ text: "A guarantee by the insurer to pay all claims within a set period", correct: false }, { text: "A promise by the insured that a certain state of affairs is or will remain true", correct: true }, { text: "A special discount given to long-standing customers", correct: false }, { text: "The legal name for the policy document", correct: false }] },
    { text: "Breach of a warranty:", options: [{ text: "Automatically increases the premium for the next period", correct: false }, { text: "Is only relevant if the breach caused the claim", correct: false }, { text: "May discharge the insurer's liability even if unrelated to the claim", correct: true }, { text: "Requires the policyholder to notify the insurer within 30 days", correct: false }] },
    { text: "Concentration risk in an underwriting portfolio means:", options: [{ text: "A single underwriter handling too many risks at once", correct: false }, { text: "Too many similar risks in one geographic area or industry, increasing overall exposure", correct: true }, { text: "A risk where the insured holds too many policies", correct: false }, { text: "A portfolio that is too diverse to manage effectively", correct: false }] },
    { text: "The proposal form in underwriting provides:", options: [{ text: "The legal basis for a reinsurance treaty", correct: false }, { text: "Complete, accurate information about the risk on which the underwriting decision is based", correct: true }, { text: "A binding offer of cover from the insurer", correct: false }, { text: "The standard terms and conditions of the policy", correct: false }] },
    { text: "Poor underwriting — accepting bad risks at inadequate premiums — leads to:", options: [{ text: "Short-term revenue growth with no long-term consequences", correct: false }, { text: "Adverse claims experience and potentially a threat to the insurer's solvency", correct: true }, { text: "Improved customer satisfaction as more risks are covered", correct: false }, { text: "Regulatory praise for inclusive insurance practices", correct: false }] },
  ],
};

// ══════════════════════════════════════════════════════════════════════════
// SEED ALL COURSES
// ══════════════════════════════════════════════════════════════════════════

const COURSES: CourseSpec[] = [
  CLAIMS,
  COMPLIANCE,
  CUSTOMER_SERVICE,
  FINANCE,
  HR,
  IT,
  INTERNAL_CONTROL,
  LEGAL,
  UNDERWRITING,
];

for (const course of COURSES) {
  await seedCourse(course);
}

await close();
console.log("\nDone — all department courses seeded.");
