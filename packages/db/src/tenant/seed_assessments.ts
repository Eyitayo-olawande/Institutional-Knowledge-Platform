/**
 * Seeds assessment questions for the two SUNU knowledge-check library items:
 *   1. Leadership Foundations — Knowledge Check (15 questions)
 *   2. Communication & Business Etiquette — Knowledge Check (15 questions)
 *
 * Run from packages/db after migration 0012 has been applied:
 *   npx tsx src/tenant/seed_assessments.ts
 */
import { eq } from "drizzle-orm";
import { connectTenant } from "./client.ts";
import { libraryItems } from "./schema.ts";
import { addOption, addQuestion, createAssessment } from "./assessments.ts";

const ACTOR = "system:sunu_assessment_seed";
const DB_URL = process.env.MANTLE_PG_SERVER_URL ?? "postgres://localhost:5432/postgres";
const DB_NAME = "mantle_tenant_alpha";

const { db, close } = connectTenant(DB_URL, DB_NAME);

type Q = { text: string; options: { text: string; correct: boolean }[] };

const LEADERSHIP_QUESTIONS: Q[] = [
  {
    text: "According to research by the Centre for Creative Leadership, what percentage of a manager's effectiveness is attributed to their ability to build relationships and trust?",
    options: [
      { text: "About 30%", correct: false },
      { text: "About 50%", correct: false },
      { text: "About 70%", correct: true },
      { text: "About 90%", correct: false },
    ],
  },
  {
    text: "Which leadership style is most appropriate when a team member is highly skilled but lacks motivation?",
    options: [
      { text: "Directing", correct: false },
      { text: "Coaching", correct: false },
      { text: "Supporting", correct: true },
      { text: "Delegating", correct: false },
    ],
  },
  {
    text: "A team leader notices that two colleagues are in conflict. The most effective first step is to:",
    options: [
      { text: "Report the matter to HR immediately", correct: false },
      { text: "Bring both parties together and facilitate a private conversation", correct: true },
      { text: "Warn both individuals that disciplinary action may follow", correct: false },
      { text: "Ignore it and hope they resolve it themselves", correct: false },
    ],
  },
  {
    text: "What does it mean to lead with psychological safety?",
    options: [
      { text: "Ensuring team members never feel challenged or uncomfortable", correct: false },
      { text: "Creating an environment where people can speak up, take risks, and admit mistakes without fear", correct: true },
      { text: "Keeping all sensitive conversations private from the team", correct: false },
      { text: "Prioritising physical health and wellness in the workplace", correct: false },
    ],
  },
  {
    text: "Which of the following is a hallmark of a growth mindset in a leader?",
    options: [
      { text: "Believing that intelligence and ability are fixed traits", correct: false },
      { text: "Avoiding difficult feedback to protect team morale", correct: false },
      { text: "Seeing challenges and failures as opportunities to learn and improve", correct: true },
      { text: "Focusing only on strengths and ignoring weaknesses", correct: false },
    ],
  },
  {
    text: "Effective delegation involves:",
    options: [
      { text: "Assigning tasks without explanation to build independence", correct: false },
      { text: "Keeping all important decisions with the leader", correct: false },
      { text: "Matching tasks to individual strengths and providing clear expectations", correct: true },
      { text: "Only delegating low-value tasks to protect quality", correct: false },
    ],
  },
  {
    text: "A new manager wants to build trust with their team quickly. The most effective approach is to:",
    options: [
      { text: "Demonstrate authority early by making fast decisions", correct: false },
      { text: "Listen actively, follow through on commitments, and be consistent", correct: true },
      { text: "Socialise frequently outside of work to build personal bonds", correct: false },
      { text: "Avoid showing any vulnerability or uncertainty", correct: false },
    ],
  },
  {
    text: "Which statement best describes servant leadership?",
    options: [
      { text: "The leader focuses on their own vision and pulls others along", correct: false },
      { text: "The leader prioritises the growth and wellbeing of team members above personal gain", correct: true },
      { text: "The leader delegates all decision-making to avoid being blamed for mistakes", correct: false },
      { text: "The leader takes credit for the team's successes to maintain authority", correct: false },
    ],
  },
  {
    text: "During a team meeting, a junior colleague proposes an idea that challenges the current approach. A good leader should:",
    options: [
      { text: "Dismiss it politely to avoid disrupting established processes", correct: false },
      { text: "Acknowledge the idea and invite the team to evaluate it together", correct: true },
      { text: "Tell the person to submit a formal proposal instead", correct: false },
      { text: "Agree publicly but ignore it privately", correct: false },
    ],
  },
  {
    text: "What is the primary purpose of setting SMART goals with a team?",
    options: [
      { text: "To ensure the leader has full control over outcomes", correct: false },
      { text: "To create clarity, accountability, and a shared direction", correct: true },
      { text: "To reduce the need for regular feedback conversations", correct: false },
      { text: "To measure performance for annual appraisals only", correct: false },
    ],
  },
  {
    text: "Emotional intelligence in leadership most directly affects:",
    options: [
      { text: "Technical decision-making quality", correct: false },
      { text: "Budget management skills", correct: false },
      { text: "How a leader responds to pressure, reads the room, and manages relationships", correct: true },
      { text: "Compliance with company policies", correct: false },
    ],
  },
  {
    text: "A manager who consistently takes credit for their team's successes is likely to:",
    options: [
      { text: "Motivate the team to work harder", correct: false },
      { text: "Erode trust and reduce discretionary effort", correct: true },
      { text: "Improve their own career prospects long term", correct: false },
      { text: "Maintain team cohesion by protecting the group's reputation", correct: false },
    ],
  },
  {
    text: "What is the most important quality of feedback that leads to genuine behaviour change?",
    options: [
      { text: "It is delivered in front of the whole team for accountability", correct: false },
      { text: "It focuses on effort rather than outcomes", correct: false },
      { text: "It is specific, timely, and focused on behaviour rather than personality", correct: true },
      { text: "It avoids any negative language to protect confidence", correct: false },
    ],
  },
  {
    text: "Which of the following leadership behaviours most directly increases team innovation?",
    options: [
      { text: "Strictly enforcing standard procedures", correct: false },
      { text: "Encouraging experimentation and tolerating well-reasoned failure", correct: true },
      { text: "Limiting external distractions to keep the team focused", correct: false },
      { text: "Rewarding only results, not the process", correct: false },
    ],
  },
  {
    text: "A leader who is consistent, fair, and keeps their commitments is best described as demonstrating:",
    options: [
      { text: "Transactional leadership", correct: false },
      { text: "Integrity and reliability", correct: true },
      { text: "Autocratic control", correct: false },
      { text: "Passive management", correct: false },
    ],
  },
];

const ETIQUETTE_QUESTIONS: Q[] = [
  {
    text: "When you receive an email that requires a detailed response but you cannot reply immediately, the professional approach is to:",
    options: [
      { text: "Wait until you have time to write the full response", correct: false },
      { text: "Send a brief acknowledgement and state when a full reply will follow", correct: true },
      { text: "Forward it to a colleague to reply on your behalf", correct: false },
      { text: "Reply only once you have researched the matter fully", correct: false },
    ],
  },
  {
    text: "During a formal business meeting, using your mobile phone to check messages is:",
    options: [
      { text: "Acceptable if you do it discreetly", correct: false },
      { text: "Fine if the meeting is running over schedule", correct: false },
      { text: "Inappropriate unless it is a genuine emergency", correct: true },
      { text: "Normal practice in a modern workplace", correct: false },
    ],
  },
  {
    text: "You are introducing a senior client to a junior colleague. The correct order of introduction is:",
    options: [
      { text: "Introduce the junior colleague to the client first", correct: false },
      { text: "Introduce the client to the junior colleague first", correct: false },
      { text: "Introduce the junior colleague to the senior person", correct: true },
      { text: "Let both parties introduce themselves", correct: false },
    ],
  },
  {
    text: "In a professional email, the most appropriate greeting for someone you have not met is:",
    options: [
      { text: "Hey [First Name]", correct: false },
      { text: "To Whom It May Concern", correct: false },
      { text: "Dear Mr/Ms [Surname]", correct: true },
      { text: "Good day", correct: false },
    ],
  },
  {
    text: "When attending a business lunch, payment is typically handled by:",
    options: [
      { text: "Whoever arrives first at the restaurant", correct: false },
      { text: "Splitting the bill equally regardless of seniority", correct: false },
      { text: "The person who extended the invitation", correct: true },
      { text: "Taking turns on a rotating basis", correct: false },
    ],
  },
  {
    text: "If you disagree with a colleague's idea in a team meeting, the most professional approach is to:",
    options: [
      { text: "Stay silent to avoid conflict", correct: false },
      { text: "Interrupt immediately to correct the error", correct: false },
      { text: "Wait for them to finish, then share your view respectfully with reasons", correct: true },
      { text: "Bring it up with the manager after the meeting", correct: false },
    ],
  },
  {
    text: "Appropriate business attire is best described as:",
    options: [
      { text: "Whatever the most senior person in the office wears", correct: false },
      { text: "Clothing that meets or slightly exceeds the stated dress code", correct: true },
      { text: "Casual clothing that expresses your personality", correct: false },
      { text: "Whatever you are most comfortable in", correct: false },
    ],
  },
  {
    text: "When making eye contact on a video call, you should look at:",
    options: [
      { text: "Your own face in the preview window", correct: false },
      { text: "The faces of participants on the screen", correct: false },
      { text: "The camera lens when speaking", correct: true },
      { text: "Your notes so you do not lose your train of thought", correct: false },
    ],
  },
  {
    text: "Before placing a caller on hold, the professional approach is to:",
    options: [
      { text: "Put them on hold immediately to find the answer faster", correct: false },
      { text: "Ask permission first and check back within two minutes", correct: true },
      { text: "Ask for their email and reply later", correct: false },
      { text: "Transfer them to another colleague without explaining why", correct: false },
    ],
  },
  {
    text: "If you have a concern about a colleague's behaviour, you should first:",
    options: [
      { text: "Report it to HR immediately", correct: false },
      { text: "Discuss it with other colleagues to get their view", correct: false },
      { text: "Raise it privately and directly with that person", correct: true },
      { text: "Send a formal written complaint", correct: false },
    ],
  },
  {
    text: "In a professional disagreement, the focus should always be on:",
    options: [
      { text: "The personal failings that caused the problem", correct: false },
      { text: "Who was responsible so accountability can be established", correct: false },
      { text: "The work and the issue, never the person", correct: true },
      { text: "Reaching agreement as quickly as possible, even if it means backing down", correct: false },
    ],
  },
  {
    text: "When addressing a customer complaint, the best opening is to:",
    options: [
      { text: "Explain the company policy that applies to their situation", correct: false },
      { text: "Ask them to put their complaint in writing", correct: false },
      { text: "Acknowledge their concern before offering a solution", correct: true },
      { text: "Transfer them to a manager immediately", correct: false },
    ],
  },
  {
    text: "If you are unsure whether you can meet a customer's deadline, you should:",
    options: [
      { text: "Agree to the deadline and do your best to meet it", correct: false },
      { text: "Say you cannot help and suggest they call back later", correct: false },
      { text: "Say so early, before committing, rather than missing it without warning", correct: true },
      { text: "Give the most optimistic estimate to avoid disappointing them", correct: false },
    ],
  },
  {
    text: "If a customer asks a question you cannot answer, the correct response is to:",
    options: [
      { text: "Give your best guess to avoid appearing uninformed", correct: false },
      { text: "Refer them to the company website", correct: false },
      { text: "Acknowledge that you do not know and commit to finding out", correct: true },
      { text: "Ask them to contact another department", correct: false },
    ],
  },
  {
    text: "Giving credit publicly to a team member who contributed to a success:",
    options: [
      { text: "Undermines your own standing as a leader", correct: false },
      { text: "Is unnecessary because the team already knows who contributed", correct: false },
      { text: "Should be done only at annual review time", correct: false },
      { text: "Acknowledges the contribution and encourages continued performance", correct: true },
    ],
  },
];

async function seedAssessmentForItem(title: string, questions: Q[]): Promise<void> {
  const [item] = await db.select({ id: libraryItems.id }).from(libraryItems).where(eq(libraryItems.title, title));
  if (!item) {
    console.log(`Item not found: "${title}" — skipping`);
    return;
  }

  const assessmentId = await createAssessment(db, item.id, 70, ACTOR);
  console.log(`Assessment for "${title}": ${assessmentId}`);

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi]!;
    const questionId = await addQuestion(db, assessmentId, q.text, qi, ACTOR);
    for (let oi = 0; oi < q.options.length; oi++) {
      const o = q.options[oi]!;
      await addOption(db, questionId, o.text, o.correct, oi, ACTOR);
    }
  }

  console.log(`  Inserted ${questions.length} questions`);
}

await seedAssessmentForItem("Leadership Foundations — Knowledge Check", LEADERSHIP_QUESTIONS);
await seedAssessmentForItem("Communication & Business Etiquette — Knowledge Check", ETIQUETTE_QUESTIONS);

await close();
console.log("Done.");
