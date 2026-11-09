/**
 * Seeds the SUNU Nigeria eLearning modules scoped during the IKP platform
 * engagement:
 *   1. Leadership Foundations — YouTube video + 15-question knowledge check
 *   2. Communication & Business Etiquette — enriched body + 15-question check
 *   3. A new learning path with both modules assigned to Funke Adeyemi
 *
 * Run once from packages/db:
 *   npx tsx src/tenant/seed_sunu_elearning.ts
 */
import { eq } from "drizzle-orm";
import { connectTenant } from "./client.ts";
import { addItemToModule, addModuleToStage, createModule, createPath, getPathBuilder } from "./paths.ts";
import { createLibraryItem, publishDraft } from "./library.ts";
import { commonArea, contentTypeByKey } from "./areas.ts";
import { assignments, libraryItems, libraryItemVersions, people, users } from "./schema.ts";

const ACTOR = "system:sunu_elearning_seed";
const DB_URL = process.env.MANTLE_PG_SERVER_URL ?? "postgres://localhost:5432/postgres";
const DB_NAME = "mantle_tenant_alpha";

const { db, close } = connectTenant(DB_URL, DB_NAME);

// ── common learning area and content type IDs ──────────────────────────────
const commonAreaId = await commonArea(db);
if (!commonAreaId) throw new Error("Common learning area not found");

const leadershipTypeId = await contentTypeByKey(db, "common", "leadership");
const communicationTypeId = await contentTypeByKey(db, "common", "communication");
if (!leadershipTypeId || !communicationTypeId) throw new Error("Content types not found");

// ── 1. Leadership Foundations library item ─────────────────────────────────
const LEADERSHIP_BODY = `LEADERSHIP FOUNDATIONS
A free leadership course covering the essential skills every leader needs in today's dynamic workplace.

MODULE 1 — FOUNDATIONS OF LEADERSHIP
Leadership is not simply about holding a position of authority. It is about inspiring others, cultivating relationships, and creating an environment where individuals can thrive.

What leadership is: the ability to guide others toward achieving a common goal. It exists at every level of life — from personal endeavours to large-scale operations.

Leadership styles: Transformational leaders inspire by example; servant leaders place the team's needs first; democratic leaders build consensus; autocratic leaders drive speed in a crisis. Effective leaders adapt their style to the situation.

Emotional intelligence: Self-awareness, empathy, and self-regulation are as important as technical knowledge. A leader who understands their own emotions, and those of their team, creates psychological safety and trust.

MODULE 2 — INFLUENCE AND COMMUNICATION
The ability to influence and communicate effectively is one of the most important leadership skills.

Building trust: Consistency, transparency, and follow-through build the credibility a leader needs to influence others. Trust is built in small actions over time.

Active listening: Leaders who listen with full attention — without formulating a reply while the other person is still speaking — gain better information and make others feel valued.

Giving and receiving feedback: Constructive feedback is specific, timely, and focused on behaviour rather than character. Leaders who receive feedback without defensiveness model the growth mindset they want their teams to develop.

MODULE 3 — STRATEGIC EXECUTION
Even the best strategy is useless without the ability to execute it.

Setting clear direction: A leader's first job is to ensure the team knows what success looks like. Clear goals, measurable outcomes, and a shared understanding of priorities prevent wasted effort.

Navigating obstacles: When plans hit resistance, effective leaders stay focused on the goal, adapt their approach, and communicate changes clearly so the team stays aligned.

Driving results: Accountability — holding yourself and others to commitments — is what converts strategy into outcomes. Leaders who celebrate progress while addressing shortfalls keep teams motivated and on track.`;

const LEADERSHIP_KNOWLEDGE_CHECK = `KNOWLEDGE CHECK — LEADERSHIP FOUNDATIONS
Based on the Leadership Foundations video. Read each question and select the best answer.

1. At its core, leadership is best described as:
   A) Holding the most senior position in an organisation
   B) The ability to guide others toward achieving a common goal
   C) Managing budgets and resources effectively
   D) Setting rules that the team must follow
   Answer: B

2. Which statement about where leadership exists is most accurate?
   A) Leadership is only relevant in large organisations
   B) Leadership applies only in professional settings
   C) Leadership exists at every level of life, from personal endeavours to corporate operations
   D) Leadership is a quality that cannot be learned
   Answer: C

3. A transformational leader primarily:
   A) Gives detailed instructions for every task
   B) Inspires the team by example and communicates a compelling vision
   C) Makes all decisions alone to ensure consistency
   D) Focuses exclusively on short-term targets
   Answer: B

4. Which leadership style is most useful when a team needs fast decisions in a crisis?
   A) Democratic leadership
   B) Servant leadership
   C) Transformational leadership
   D) Autocratic leadership
   Answer: D

5. Emotional intelligence in a leader includes:
   A) Technical expertise in the leader's field
   B) The ability to manage one's own emotions and empathise with others
   C) Authority to make final decisions on all matters
   D) Experience of working in many different industries
   Answer: B

6. How is trust in a leader typically built?
   A) Through a single impressive decision
   B) By telling the team what they want to hear
   C) Through consistency, transparency, and following through on commitments over time
   D) By avoiding conflict at all costs
   Answer: C

7. A leader who listens with full attention, without formulating a reply while the other person is still speaking, is practising:
   A) Passive listening
   B) Active listening
   C) Reflective listening
   D) Selective listening
   Answer: B

8. Constructive feedback should focus on:
   A) The team member's personality
   B) Past mistakes that cannot be changed
   C) Specific, observable behaviour and its impact
   D) What other team members have said about the person
   Answer: C

9. When a leader receives critical feedback without becoming defensive, they are modelling:
   A) Weak leadership
   B) A growth mindset
   C) Indifference to quality
   D) Lack of conviction
   Answer: B

10. A leader's first job in strategic execution is to:
    A) Set the team's performance bonuses
    B) Identify underperforming team members
    C) Ensure the team has a clear understanding of what success looks like
    D) Report progress to senior management
    Answer: C

11. Which of the following best describes psychological safety in a team?
    A) Team members feel free to take risks and speak up without fear of negative consequences
    B) The team is insulated from all external pressures
    C) The leader makes all decisions so team members feel protected
    D) Sensitive information is kept confidential
    Answer: A

12. A democratic leadership style primarily:
    A) Removes the leader's responsibility for final decisions
    B) Builds consensus by involving the team in decision-making
    C) Works best when speed is more important than buy-in
    D) Applies only to senior leadership teams
    Answer: B

13. The role of accountability in converting strategy into outcomes is:
    A) Identifying who made mistakes so they can be addressed
    B) Holding yourself and others to commitments so plans translate into results
    C) Setting targets high enough to stretch the team beyond what is realistic
    D) Delegating all responsibility to individual team members
    Answer: B

14. A servant leader:
    A) Avoids making unpopular decisions
    B) Prioritises status and recognition
    C) Places the team's needs above their own interests
    D) Relies on authority to get results
    Answer: C

15. When a plan hits unexpected resistance, an effective leader should:
    A) Abandon the plan and start again from scratch
    B) Blame external factors and wait for conditions to improve
    C) Stay focused on the goal, adapt the approach, and communicate changes clearly to the team
    D) Escalate the problem upward immediately without attempting a solution
    Answer: C`;

// Check if already seeded
const existing = await db
  .select({ id: libraryItems.id })
  .from(libraryItems)
  .where(eq(libraryItems.title, "Leadership Foundations"));

let leadershipItemId: string;
if (existing.length > 0) {
  leadershipItemId = existing[0]!.id;
  console.log("Leadership Foundations item already exists:", leadershipItemId);
} else {
  leadershipItemId = await createLibraryItem(
    db,
    {
      title: "Leadership Foundations",
      body: LEADERSHIP_BODY,
      ownerUserId: null,
      reviewDate: null,
      areaId: commonAreaId,
      contentTypeId: leadershipTypeId,
      videoUrl: "https://www.youtube.com/watch?v=KI6HlNPZGbM",
    },
    ACTOR,
  );
  await publishDraft(db, leadershipItemId, ACTOR);
  console.log("Created Leadership Foundations item:", leadershipItemId);
}

// Knowledge check for Leadership
const lkExisting = await db
  .select({ id: libraryItems.id })
  .from(libraryItems)
  .where(eq(libraryItems.title, "Leadership Foundations — Knowledge Check"));

let leadershipCheckId: string;
if (lkExisting.length > 0) {
  leadershipCheckId = lkExisting[0]!.id;
  console.log("Leadership knowledge check already exists:", leadershipCheckId);
} else {
  leadershipCheckId = await createLibraryItem(
    db,
    {
      title: "Leadership Foundations — Knowledge Check",
      body: LEADERSHIP_KNOWLEDGE_CHECK,
      ownerUserId: null,
      reviewDate: null,
      areaId: commonAreaId,
      contentTypeId: leadershipTypeId,
    },
    ACTOR,
  );
  await publishDraft(db, leadershipCheckId, ACTOR);
  console.log("Created Leadership knowledge check:", leadershipCheckId);
}

// ── 2. Communication & Business Etiquette ─────────────────────────────────
const ETIQUETTE_BODY = `THE EVERYDAY PROFESSIONAL: COMMUNICATION & BUSINESS ETIQUETTE

WHY THIS MATTERS
Every email, meeting, phone call, chat message and customer interaction shapes how people experience working with you.

Professional etiquette is not about sounding formal all the time. It is about making communication easier, clearer and more respectful for everyone.

EMAIL AND WRITTEN COMMUNICATION
Use a clear subject line that tells the reader what the message is about and what action, if any, is needed.
Write in plain language. Avoid jargon that the recipient may not know.
Keep messages short. If an email needs more than three paragraphs, consider whether a brief conversation would be faster.
Reply within one working day, even if only to acknowledge receipt and confirm when a full response will follow.
Check your tone before you send. Text cannot carry a smile — a message you intend as direct can read as curt.

MEETINGS
Arrive on time. Joining late disrupts focus and signals that your time matters more than everyone else's.
Come prepared. Read background materials in advance so the meeting achieves its purpose.
Listen to understand, not just to respond. Hold questions until the speaker has finished.
Stay on topic. If a discussion drifts, it is acceptable to say "can we take that one offline?"
Follow up. Confirm actions, owners and deadlines by the end of the meeting or in a brief written note afterwards.

TELEPHONE AND VIDEO CALLS
Answer calls professionally: state your name and department on the first ring.
On a video call, mute yourself when not speaking to reduce background noise.
Make eye contact by looking at the camera, not the screen, when you are speaking.
If you need to place a caller on hold, ask permission first and check back within two minutes.
End the call by confirming what happens next.

WORKPLACE RELATIONSHIPS
Treat every colleague with the same courtesy you would show a customer.
If you have a concern about a colleague's behaviour, raise it privately and directly with that person before escalating.
Give credit publicly. When a team member contributes to a success, acknowledge it in front of others.
Respect boundaries. Everyone works differently — some people need focus time; not every question needs an immediate answer.
Disagreements are normal; personal attacks are not. Keep all professional disagreements focused on the work, never the person.

CUSTOMER INTERACTIONS
Address customers by name where possible.
Acknowledge their concern before offering a solution. "I understand this is frustrating" goes further than immediately explaining policy.
Under-promise and over-deliver. If you are not certain you can meet a deadline, say so early rather than missing it without warning.
If you do not know the answer, say so and commit to finding out. Never guess with a customer.
Close every interaction by confirming what happens next and by when.`;

const ETIQUETTE_KNOWLEDGE_CHECK = `KNOWLEDGE CHECK — COMMUNICATION & BUSINESS ETIQUETTE
Based on The Everyday Professional: Communication & Business Etiquette. Read each question and select the best answer.

1. The purpose of professional etiquette is to:
   A) Ensure all communication uses formal language
   B) Make communication easier, clearer and more respectful for everyone
   C) Avoid all direct conversation and work through written messages only
   D) Follow a fixed set of rules regardless of the situation
   Answer: B

2. When writing a professional email, the subject line should:
   A) Be left blank to keep the message informal
   B) Tell the reader what the message is about and what action, if any, is needed
   C) Always begin with "URGENT" to get attention
   D) Include your full name and job title
   Answer: B

3. If you receive an email that requires research before you can reply fully, the best action is to:
   A) Wait until you have the complete answer, however long that takes
   B) Reply at the end of the week
   C) Acknowledge receipt and confirm when a full response will follow
   D) Ask a colleague to reply on your behalf
   Answer: C

4. What is the most likely risk when writing a short, direct email message?
   A) It may be too long for the recipient to read
   B) It may read as curt or unfriendly because text cannot carry tone
   C) The recipient may not understand plain language
   D) Short messages are less professional than long ones
   Answer: B

5. The correct way to handle a drift in a meeting is to:
   A) Ignore it and let the discussion continue
   B) Leave the meeting and send your comments by email
   C) Say "can we take that one offline?" and return to the agenda
   D) Interrupt the speaker mid-sentence to get back on topic
   Answer: C

6. After a meeting, the agreed actions should be:
   A) Remembered by each individual without written record
   B) Confirmed in writing, with owners and deadlines, by the end of the meeting or shortly after
   C) Assigned by the most senior person present
   D) Reviewed only at the next scheduled meeting
   Answer: B

7. On a video call, you should mute yourself when not speaking because:
   A) It prevents your video from freezing
   B) Your camera will overheat if the microphone is on
   C) It reduces background noise for the other participants
   D) It signals to other participants that you are listening
   Answer: C

8. When making eye contact on a video call, you should look at:
   A) Your own face in the preview window
   B) The faces of participants on the screen
   C) The camera lens when speaking
   D) Your notes so you do not lose your train of thought
   Answer: C

9. Before placing a caller on hold, the professional approach is to:
   A) Put them on hold immediately to find the answer faster
   B) Ask permission first and check back within two minutes
   C) Ask for their email and reply later
   D) Transfer them to another colleague without explaining why
   Answer: B

10. If you have a concern about a colleague's behaviour, you should first:
    A) Report it to HR immediately
    B) Discuss it with other colleagues to get their view
    C) Raise it privately and directly with that person
    D) Send a formal written complaint
    Answer: C

11. In a professional disagreement, the focus should always be on:
    A) The personal failings that caused the problem
    B) Who was responsible so accountability can be established
    C) The work and the issue, never the person
    D) Reaching agreement as quickly as possible, even if it means backing down
    Answer: C

12. When addressing a customer complaint, the best opening is to:
    A) Explain the company policy that applies to their situation
    B) Ask them to put their complaint in writing
    C) Acknowledge their concern before offering a solution
    D) Transfer them to a manager immediately
    Answer: C

13. If you are unsure whether you can meet a customer's deadline, you should:
    A) Agree to the deadline and do your best to meet it
    B) Say you cannot help and suggest they call back later
    C) Say so early, before committing, rather than missing it without warning
    D) Give the most optimistic estimate to avoid disappointing them
    Answer: C

14. If a customer asks a question you cannot answer, the correct response is to:
    A) Give your best guess to avoid appearing uninformed
    B) Refer them to the company website
    C) Acknowledge that you do not know and commit to finding out
    D) Ask them to contact another department
    Answer: C

15. Giving credit publicly to a team member who contributed to a success:
    A) Undermines your own standing as a leader
    B) Is unnecessary because the team already knows who contributed
    C) Should be done only at annual review time
    D) Acknowledges the contribution and encourages continued performance
    Answer: D`;

// Update or create etiquette item
const etiquetteItemId = "f944a0e4-0ff5-4947-918d-4932a1785b39";
// Update the existing item's body to the enriched version
const [existingVersion] = await db
  .select({ id: libraryItemVersions.id, version: libraryItemVersions.version })
  .from(libraryItemVersions)
  .where(eq(libraryItemVersions.itemId, etiquetteItemId))
  .orderBy(libraryItemVersions.version);

if (existingVersion) {
  await db
    .update(libraryItemVersions)
    .set({ body: ETIQUETTE_BODY, changedBy: ACTOR, updatedAt: new Date() })
    .where(eq(libraryItemVersions.id, existingVersion.id));
  console.log("Updated etiquette item body.");
} else {
  console.log("Etiquette item version not found — skipping body update.");
}

// Knowledge check for Etiquette
const ekExisting = await db
  .select({ id: libraryItems.id })
  .from(libraryItems)
  .where(eq(libraryItems.title, "Communication & Business Etiquette — Knowledge Check"));

let etiquetteCheckId: string;
if (ekExisting.length > 0) {
  etiquetteCheckId = ekExisting[0]!.id;
  console.log("Etiquette knowledge check already exists:", etiquetteCheckId);
} else {
  etiquetteCheckId = await createLibraryItem(
    db,
    {
      title: "Communication & Business Etiquette — Knowledge Check",
      body: ETIQUETTE_KNOWLEDGE_CHECK,
      ownerUserId: null,
      reviewDate: null,
      areaId: commonAreaId,
      contentTypeId: communicationTypeId,
    },
    ACTOR,
  );
  await publishDraft(db, etiquetteCheckId, ACTOR);
  console.log("Created Etiquette knowledge check:", etiquetteCheckId);
}

// ── 3. Funke's learning path ───────────────────────────────────────────────
const [funkeUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, "funke@sunu-group.com"));
if (!funkeUser) throw new Error("funke@sunu-group.com not found in users table");

const [funkePerson] = await db.select({ id: people.id }).from(people).where(eq(people.userId, funkeUser.id));
if (!funkePerson) throw new Error("No people record found for funke@sunu-group.com");

console.log("Funke person id:", funkePerson.id);

// Check for existing assignment to this path
const existingAssignments = await db
  .select({ id: assignments.id })
  .from(assignments)
  .where(eq(assignments.personId, funkePerson.id));

if (existingAssignments.length > 0) {
  console.log("Funke already has", existingAssignments.length, "assignment(s). Skipping path creation.");
} else {
  const pathId = await createPath(
    db,
    { name: "SUNU Nigeria eLearning Programme", departmentId: null },
    ACTOR,
  );
  console.log("Created path:", pathId);

  const builder = await getPathBuilder(db, pathId);
  if (!builder) throw new Error("Path builder not found");

  const commonStage = builder.stages.find((s) => s.kind === "common");
  if (!commonStage) throw new Error("Common stage not found");

  const leadershipModId = await createModule(db, "Leadership Foundations", ACTOR);
  await addModuleToStage(db, commonStage.stageId, leadershipModId, ACTOR);
  await addItemToModule(db, leadershipModId, leadershipItemId, ACTOR);
  await addItemToModule(db, leadershipModId, leadershipCheckId, ACTOR);
  console.log("Created Leadership Foundations module:", leadershipModId);

  const etiquetteModId = await createModule(db, "Communication & Business Etiquette", ACTOR);
  await addModuleToStage(db, commonStage.stageId, etiquetteModId, ACTOR);
  await addItemToModule(db, etiquetteModId, etiquetteItemId, ACTOR);
  await addItemToModule(db, etiquetteModId, etiquetteCheckId, ACTOR);
  console.log("Created Etiquette module:", etiquetteModId);

  const startDate = new Date().toISOString().slice(0, 10);
  await db.insert(assignments).values({
    personId: funkePerson.id,
    pathId,
    startDate,
    changedBy: ACTOR,
  });
  console.log("Assigned SUNU Nigeria eLearning Programme to Funke. Start date:", startDate);
}

await close();
console.log("Done.");
