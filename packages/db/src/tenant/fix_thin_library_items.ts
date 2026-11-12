/**
 * One-off: add video URLs, expand body content, and create knowledge-check
 * assessments for the 4 published library items that currently have thin or
 * broken content:
 *   1. Fire and marine claims handling procedure
 *   2. People manager handbook
 *   3. Workplace health and safety quick reference
 *   4. Organisation chart (body expansion only, no video or assessment)
 *
 * Run from packages/db (Mac Terminal):
 *   npx tsx src/tenant/fix_thin_library_items.ts
 */
import { and, eq } from "drizzle-orm";
import { addOption, addQuestion, createAssessment } from "./assessments.ts";
import { connectTenant } from "./client.ts";
import { libraryItems, libraryItemVersions } from "./schema.ts";

const ACTOR = "system:fix_thin_library_items";
const DB_URL = process.env.MANTLE_PG_SERVER_URL ?? "postgres://localhost:5432/postgres";
const DB_NAME = "mantle_tenant_alpha";

const { db, close } = connectTenant(DB_URL, DB_NAME);

type Option = { text: string; correct: boolean };
type Question = { text: string; options: Option[] };

interface ItemUpdate {
  title: string;
  videoUrl?: string;
  body: string;
  questions?: Question[];
}

// ── body content ──────────────────────────────────────────────────────────────

const FIRE_MARINE_BODY = `FIRE AND MARINE CLAIMS HANDLING PROCEDURE
A step-by-step guide for SUNU Group staff on processing fire and marine insurance claims accurately and efficiently.

MODULE 1, UNDERSTANDING FIRE AND MARINE INSURANCE
Fire insurance protects policyholders against loss or damage caused by fire, lightning and related perils. Marine insurance covers loss or damage to ships, cargo and other interests in maritime transportation.

These are two of the oldest and most important lines of non-life insurance. SUNU Group writes fire and marine business across its territories, and the handling of claims in these lines directly impacts our customer satisfaction scores and financial results.

Key differences: Fire claims are typically location-based (a building or its contents), while marine claims follow the goods or vessel in transit. Fire claims involve assessors, surveyors and loss adjusters who physically inspect the damaged property. Marine claims require documentary evidence of the voyage, the cargo, and the event causing the loss.

MODULE 2, FIRST NOTIFICATION OF LOSS
When a policyholder reports a fire or marine loss, the first notification of loss (FNOL) triggers the claims process.

For fire claims, record: policy number, date and time of incident, location of the fire, description of property damaged, estimated value of loss, whether police or fire service attended, and the contact details of any witnesses.

For marine claims, record: policy number, bill of lading or airway bill number, description of goods, shipping route, date and location of loss, name of carrier, and any survey or inspection report already in the policyholder's possession.

Acknowledge receipt of the claim in writing within 24 hours. This is a regulatory requirement and sets the tone for the entire claims interaction.

MODULE 3, COVERAGE VERIFICATION
Before proceeding with any investigation or payment, verify that the claim is covered.

Policy in force: Confirm that the premium was paid and the policy was active on the date of loss. A lapsed policy is not covered, and paying a lapsed claim creates liability for the company.

Sum insured and limits: Check whether the declared value of the damaged property matches the sum insured. Underinsurance may apply, which will affect the settlement amount.

Exclusions: Both fire and marine policies contain exclusions. Common fire policy exclusions include consequential loss, war, and wilful acts by the insured. Common marine exclusions include inadequate packing, inherent vice, and wilful misconduct by the insured.

MODULE 4, INVESTIGATION AND ASSESSMENT
Once coverage is confirmed, appoint the appropriate expert to assess the loss.

For fire claims, appoint a licensed loss adjuster. The adjuster will inspect the damaged premises, assess the value of the loss, and prepare a report for the insurer.

For marine claims, appoint a marine surveyor if the loss involves a vessel, or a cargo surveyor if goods are damaged. Survey reports are the primary evidence for marine settlement.

Cooperate fully with law enforcement if the fire is of suspicious origin. Claims involving suspected arson must be referred to the investigation unit before any commitment to pay is made.

MODULE 5, SETTLEMENT AND DOCUMENTATION
Every step of the claims process must be documented. Settlement without adequate documentation creates regulatory and financial risk.

Settlement authority: Know your authority limits. Claims above your authority threshold must be referred to your supervisor or to the technical claims department before any offer is made.

Settlement letter: Once the investigation is complete, issue a settlement letter that clearly states the covered amount, any deductions (such as the policy excess or underinsurance), and the basis of settlement.

Closing the file: Obtain a signed discharge voucher from the policyholder before making payment. File all documentation including FNOL, survey report, valuation, discharge voucher, and payment record in the claims management system.`;

const PEOPLE_MANAGER_BODY = `PEOPLE MANAGER HANDBOOK
A practical guide for managers at SUNU Group on leading teams with clarity, fairness and effectiveness.

MODULE 1, THE MANAGER'S ROLE
Managing people is one of the most important responsibilities in any organisation. As a people manager at SUNU Group, you are the primary link between your team and the organisation's strategy.

Your core responsibilities: clarify expectations and goals for each team member, provide regular feedback, remove obstacles to performance, and develop the skills and capabilities within your team. A manager who does these four things consistently will build a high-performing team.

The difference between management and leadership: Management is about systems, processes and consistency. Leadership is about direction, inspiration and change. Good people managers need both, shifting between them as the situation demands.

MODULE 2, SETTING EXPECTATIONS AND GOALS
Clear expectations are the foundation of a productive team. Without them, team members default to their own assumptions about what good performance looks like.

Goal setting: Use the SMART framework, which stands for Specific, Measurable, Achievable, Relevant, Time-bound. Each team member should have clear performance goals that connect their daily work to the department's objectives.

Role clarity: Every person on your team should know exactly what they are responsible for and what authority they have. Overlapping responsibilities create conflict; gaps create things that fall through.

Performance standards: Set the bar clearly and apply it consistently. Inconsistent standards undermine trust and create a perception of favouritism, even where none exists.

MODULE 3, FEEDBACK AND PERFORMANCE CONVERSATIONS
Feedback is the primary tool a manager has to develop their team. Most managers give too little of it.

Positive feedback: Catch people doing things right. Specific, timely recognition reinforces the behaviours you want to see more of. Generic praise is less effective than specific acknowledgement tied to an observable action.

Corrective feedback: Address performance issues early. A small course correction in week one is far less difficult than a formal performance conversation six months later. Use private, factual, forward-looking conversations focused on the behaviour and its impact, not the person.

Annual reviews: These should contain no surprises. If you are delivering feedback in an annual review that the person has not heard before, you have waited too long.

MODULE 4, MANAGING DIFFERENT TEAM MEMBERS
Not all team members need the same type of management. Adjust your approach based on each person's capability and engagement.

New team members need clear direction and close support. Experienced team members performing well need autonomy and recognition. High performers who are disengaged need to understand how their work connects to something meaningful. Underperformers need honest, documented conversations with clear improvement timelines.

MODULE 5, DIFFICULT CONVERSATIONS
Every manager will face situations that require a difficult conversation covering a performance issue, a conflict between team members, or misconduct.

Prepare before the conversation: know the facts, have specific examples, and be clear about what outcome you are seeking. Enter the conversation with curiosity, not a verdict.

During the conversation: listen fully before responding. The team member's perspective may reveal information that changes your understanding of the situation.

After the conversation: document what was discussed and agreed, and follow up on commitments made by both parties.

Escalation: Some situations require HR involvement, including formal performance improvement plans, disciplinary matters, or anything involving potential legal liability. Know when to escalate and do so promptly.`;

const WORKPLACE_HS_BODY = `WORKPLACE HEALTH AND SAFETY QUICK REFERENCE
A practical guide to maintaining a safe and healthy work environment for all SUNU Group employees.

MODULE 1, WHY HEALTH AND SAFETY MATTERS
Workplace health and safety is not a compliance exercise. It is a fundamental part of how we respect our colleagues and protect our business.

Every year, workplace accidents result in injuries, lost working days, financial penalties and reputational damage. Most of these accidents are preventable. SUNU Group's commitment is to ensure that every employee goes home at the end of the day in the same condition they arrived.

Your responsibility: Health and safety is everyone's responsibility, not just the safety officer's. If you see a hazard, report it. If you are asked to do something unsafe, refuse it and report it. You have both the right and the duty to work safely.

MODULE 2, COMMON WORKPLACE HAZARDS
A hazard is anything with the potential to cause harm. Identifying hazards before they cause accidents is the foundation of effective health and safety management.

Slip, trip and fall hazards: Wet floors, loose cables, uneven surfaces and cluttered walkways are the most common cause of workplace injuries. Keep your work area tidy. Report spillages immediately. Do not run cables across walkways.

Ergonomic hazards: Poorly adjusted chairs, computer screens positioned at the wrong height, and repetitive tasks without breaks can cause musculoskeletal disorders over time. Adjust your workstation to suit your height. Take a short break every hour.

Electrical hazards: Do not use damaged electrical equipment. Report frayed cables and broken sockets immediately. Never overload electrical sockets. Do not allow liquids near electrical equipment.

Fire hazards: Keep fire exits clear at all times. Know the location of your nearest fire exit, fire extinguisher and fire assembly point. Never prop open fire doors.

MODULE 3, EMERGENCY PROCEDURES
Knowing what to do in an emergency can save lives.

Fire: On discovering a fire, raise the alarm immediately by activating the nearest fire alarm call point. Do not attempt to fight the fire unless you have been trained and the fire is small. Leave the building by the nearest fire exit. Do not use lifts. Assemble at the designated assembly point and do not re-enter the building until instructed by the fire warden.

Medical emergency: Call the emergency services immediately. Notify the company's first aider and your line manager. Keep the area clear to allow the first aider to work. Do not move an injured person unless they are in immediate danger.

Evacuation: Follow the instructions of fire wardens. Wardens are responsible for ensuring their floor is clear and reporting to the assembly point. Cooperate fully and promptly.

MODULE 4, REPORTING AND INCIDENT MANAGEMENT
Every accident, near miss, and hazard must be reported, even if no injury occurred.

Why report near misses: A near miss is a warning. The conditions that allowed the near miss to occur are the same conditions that could cause a serious accident next time. Reporting near misses allows the organisation to fix the problem before someone is hurt.

How to report: Use the incident reporting form available from your line manager or on the company intranet. Record what happened, where, when, who was involved, and what the outcome was.

Investigation: All reported incidents are investigated. The purpose of investigation is to find the root cause and prevent recurrence, not to apportion blame. Cooperate fully with any investigation.

MODULE 5, PERSONAL RESPONSIBILITY
Good health and safety practice starts with individual behaviour.

Take ownership: Do not walk past a hazard hoping someone else will deal with it. If you see something unsafe, act. Report it, correct it if it is safe to do so, or alert someone who can.

Fatigue: Tiredness impairs judgement as significantly as other impairments. If you are feeling unwell or excessively fatigued, speak to your manager. Do not operate equipment or make critical decisions when unfit to do so.

Wellbeing: Physical and mental health are both important. SUNU Group's employee assistance programme is available to any employee experiencing personal or work-related difficulties.`;

const ORG_CHART_BODY = `SUNU GROUP ORGANISATION CHART
A reference guide to the SUNU Group corporate structure, reporting lines and key leadership roles.

ABOUT SUNU GROUP
SUNU Group is a pan-African financial services group with operations across multiple territories in West and Central Africa. The group offers insurance, reinsurance, banking and other financial services through its subsidiaries and affiliates.

The organisation chart shows the formal reporting structure of SUNU Group and its operating companies. Understanding the organisational structure helps employees to know who makes decisions in specific areas, who to escalate issues to, and how different functions within the group relate to each other.

READING THE ORGANISATION CHART
The chart is organised hierarchically, with the Group Holding Company and Board at the top.

Subsidiary companies: Each operating company (such as SUNU Assurances Nigeria) reports to the Group and is led by its own Managing Director or CEO. The subsidiary has autonomy over its day-to-day operations within the framework set by the Group.

Functional heads: Within each subsidiary, functional heads (Chief Finance Officer, Chief Technical Officer, Head of Claims, Head of HR, etc.) report to the Managing Director. They are responsible for their specific functional areas.

Departments: Each functional head oversees one or more departments. Department managers report to functional heads and are responsible for the day-to-day management of their teams.

HOW TO USE THE ORGANISATION CHART
When you are unsure who to contact on a specific matter, use the organisation chart as your first reference. Identify the function that handles the type of issue you are dealing with, then identify the appropriate contact within that function.

For cross-functional matters, escalate to your line manager and copy the relevant functional counterpart. Where matters involve multiple subsidiaries, involve the Group function that coordinates across the operating companies.

The organisation chart is updated periodically to reflect changes in leadership and structure. Contact HR for the most current version if the attached chart does not reflect recent changes.`;

// ── knowledge check questions ─────────────────────────────────────────────────

const FIRE_MARINE_QUESTIONS: Question[] = [
  {
    text: "Which of the following events is typically covered by a standard fire insurance policy?",
    options: [
      { text: "Damage caused by deliberate arson by the insured", correct: false },
      { text: "Loss of profit resulting from a fire at the insured premises", correct: false },
      { text: "Damage to the insured building caused by lightning", correct: true },
      { text: "Damage caused by a flood following a fire", correct: false },
    ],
  },
  {
    text: "Marine insurance differs from fire insurance primarily because:",
    options: [
      { text: "Marine insurance is optional while fire insurance is compulsory", correct: false },
      { text: "Marine claims follow the goods or vessel in transit rather than a fixed location", correct: true },
      { text: "Marine policies never contain exclusions", correct: false },
      { text: "Marine claims do not require a surveyor's report", correct: false },
    ],
  },
  {
    text: "When a policyholder reports a fire loss, which of the following should be recorded at FNOL?",
    options: [
      { text: "The policyholder's investment portfolio value", correct: false },
      { text: "Whether police or fire service attended and the contact details of any witnesses", correct: true },
      { text: "The policyholder's credit rating", correct: false },
      { text: "The settlement amount the policyholder expects", correct: false },
    ],
  },
  {
    text: "SUNU Group is required to acknowledge receipt of a fire or marine claim in writing within:",
    options: [
      { text: "One working day", correct: false },
      { text: "Three working days", correct: false },
      { text: "24 hours", correct: true },
      { text: "One week", correct: false },
    ],
  },
  {
    text: "Before investigating or making any payment on a claim, the first step is to:",
    options: [
      { text: "Appoint a loss adjuster and begin the site inspection", correct: false },
      { text: "Contact the policyholder to agree a settlement figure", correct: false },
      { text: "Verify that the policy was active on the date of loss and covers the type of loss reported", correct: true },
      { text: "Issue a reservation of rights letter", correct: false },
    ],
  },
  {
    text: "Underinsurance in a fire claim means:",
    options: [
      { text: "The policyholder is not entitled to any payment", correct: false },
      { text: "The declared value of the property is less than its actual value, which may reduce the settlement", correct: true },
      { text: "The insurer must pay the full market value regardless of the sum insured", correct: false },
      { text: "The policy excess is waived", correct: false },
    ],
  },
  {
    text: "For a marine cargo claim, the most important document confirming the shipment is the:",
    options: [
      { text: "Company registration certificate", correct: false },
      { text: "Bill of lading or airway bill", correct: true },
      { text: "Policyholder's bank statement", correct: false },
      { text: "Letter of credit from the buyer", correct: false },
    ],
  },
  {
    text: "If a fire is of suspicious origin, the claims handler should:",
    options: [
      { text: "Pay the claim quickly to avoid customer dissatisfaction", correct: false },
      { text: "Decline the claim immediately without investigation", correct: false },
      { text: "Refer the matter to the investigation unit before making any commitment to pay", correct: true },
      { text: "Ask the policyholder to sign a statutory declaration and then proceed to pay", correct: false },
    ],
  },
  {
    text: "A signed discharge voucher is required before making payment because:",
    options: [
      { text: "It is used to calculate the premium for the renewal policy", correct: false },
      { text: "It confirms the policyholder accepts the settlement and releases the insurer from further liability", correct: true },
      { text: "It satisfies the requirements of the company's audit team", correct: false },
      { text: "It is required by the marine surveyor before issuing their report", correct: false },
    ],
  },
  {
    text: "What action should a claims handler take when a claim exceeds their settlement authority limit?",
    options: [
      { text: "Decline the claim and advise the policyholder to resubmit it at a lower value", correct: false },
      { text: "Pay the claim and report it after the fact", correct: false },
      { text: "Refer the claim to the supervisor or technical claims department before making any offer", correct: true },
      { text: "Ask the policyholder to split the claim into smaller amounts", correct: false },
    ],
  },
];

const PEOPLE_MANAGER_QUESTIONS: Question[] = [
  {
    text: "According to the People Manager Handbook, the four core responsibilities of a people manager are:",
    options: [
      { text: "Hiring, firing, promoting and rewarding team members", correct: false },
      { text: "Clarifying expectations, providing feedback, removing obstacles and developing team skills", correct: true },
      { text: "Setting budgets, reporting performance, managing rosters and enforcing policy", correct: false },
      { text: "Conducting appraisals, writing job descriptions, training new starters and managing leave", correct: false },
    ],
  },
  {
    text: "The SMART framework for goal setting stands for:",
    options: [
      { text: "Strategic, Measurable, Actionable, Repeatable, Timely", correct: false },
      { text: "Specific, Motivating, Agreed, Resourced, Tracked", correct: false },
      { text: "Specific, Measurable, Achievable, Relevant, Time-bound", correct: true },
      { text: "Simple, Manageable, Aligned, Reviewed, Tangible", correct: false },
    ],
  },
  {
    text: "Overlapping team member responsibilities are most likely to result in:",
    options: [
      { text: "Better outcomes through shared accountability", correct: false },
      { text: "Conflict between team members", correct: true },
      { text: "Faster completion of tasks", correct: false },
      { text: "Clearer escalation paths", correct: false },
    ],
  },
  {
    text: "The handbook recommends that corrective feedback should be delivered:",
    options: [
      { text: "In the annual performance review to allow time for reflection", correct: false },
      { text: "In a group setting so the team can support the individual", correct: false },
      { text: "Early, privately, and focused on behaviour and its impact rather than the person", correct: true },
      { text: "In writing only, to create a formal record from the outset", correct: false },
    ],
  },
  {
    text: "If an annual performance review contains feedback the team member has never heard before, it means:",
    options: [
      { text: "The manager has been saving up important information for a comprehensive review", correct: false },
      { text: "The manager has waited too long and should have delivered the feedback earlier", correct: true },
      { text: "The team member has been performing consistently and no earlier feedback was needed", correct: false },
      { text: "The formal review is the appropriate and only place for such feedback", correct: false },
    ],
  },
  {
    text: "According to the handbook, which approach is most appropriate for a new team member?",
    options: [
      { text: "High autonomy and minimal supervision so they can demonstrate initiative", correct: false },
      { text: "Clear direction and close support", correct: true },
      { text: "Delegation of complex tasks to accelerate their development", correct: false },
      { text: "Pairing with the highest performer on the team and leaving them to observe", correct: false },
    ],
  },
  {
    text: "Before a difficult conversation with a team member, a manager should:",
    options: [
      { text: "Involve the team to present a united front", correct: false },
      { text: "Decide in advance what disciplinary action will be taken", correct: false },
      { text: "Know the facts, have specific examples, and be clear about the desired outcome", correct: true },
      { text: "Wait until the team member raises the issue themselves to avoid conflict", correct: false },
    ],
  },
  {
    text: "During a difficult conversation, what does the handbook recommend the manager do first?",
    options: [
      { text: "Deliver the prepared message without interruption to stay on track", correct: false },
      { text: "Listen fully to the team member's perspective before responding", correct: true },
      { text: "Ask HR to join the conversation as a witness", correct: false },
      { text: "Confirm in writing that the meeting is taking place", correct: false },
    ],
  },
  {
    text: "A high performer who appears disengaged most likely needs:",
    options: [
      { text: "A formal performance improvement plan", correct: false },
      { text: "Closer supervision and more frequent check-ins", correct: false },
      { text: "To understand how their work connects to something meaningful", correct: true },
      { text: "A salary increase as the most effective form of motivation", correct: false },
    ],
  },
  {
    text: "According to the handbook, HR should be involved in a performance matter when:",
    options: [
      { text: "Any team member fails to meet their targets in a given quarter", correct: false },
      { text: "The manager wants to document a first corrective conversation", correct: false },
      { text: "A formal performance improvement plan, disciplinary action, or legal liability is involved", correct: true },
      { text: "The team member disputes the feedback in a one-to-one conversation", correct: false },
    ],
  },
];

const WORKPLACE_HS_QUESTIONS: Question[] = [
  {
    text: "According to SUNU Group's approach, workplace health and safety is best described as:",
    options: [
      { text: "Primarily the safety officer's responsibility", correct: false },
      { text: "A compliance exercise to satisfy regulators", correct: false },
      { text: "Everyone's responsibility and a core part of respecting colleagues", correct: true },
      { text: "An issue only relevant in industrial or manufacturing settings", correct: false },
    ],
  },
  {
    text: "Which of the following is the most common cause of workplace injuries in an office environment?",
    options: [
      { text: "Electrical faults", correct: false },
      { text: "Slip, trip and fall hazards such as wet floors and loose cables", correct: true },
      { text: "Chemical spills", correct: false },
      { text: "Fire and explosion", correct: false },
    ],
  },
  {
    text: "To reduce ergonomic risk at a workstation, an employee should:",
    options: [
      { text: "Work without breaks to complete tasks quickly and reduce overall exposure", correct: false },
      { text: "Adjust the chair and screen height and take short breaks every hour", correct: true },
      { text: "Stand at their desk for the entire working day", correct: false },
      { text: "Report to occupational health only after experiencing pain", correct: false },
    ],
  },
  {
    text: "On discovering a fire in the building, the first action should be to:",
    options: [
      { text: "Attempt to extinguish the fire before raising the alarm", correct: false },
      { text: "Call your line manager to report the fire", correct: false },
      { text: "Raise the alarm by activating the nearest fire alarm call point", correct: true },
      { text: "Use the lift to evacuate the building quickly", correct: false },
    ],
  },
  {
    text: "During a fire evacuation, employees should NOT:",
    options: [
      { text: "Follow the instructions of fire wardens", correct: false },
      { text: "Assemble at the designated assembly point", correct: false },
      { text: "Use lifts to evacuate the building", correct: true },
      { text: "Leave the building by the nearest fire exit", correct: false },
    ],
  },
  {
    text: "The main reason for reporting near misses (incidents where no injury occurred) is to:",
    options: [
      { text: "Satisfy the requirements of the annual safety audit", correct: false },
      { text: "Identify and fix hazardous conditions before they cause a serious accident", correct: true },
      { text: "Demonstrate to regulators that the company tracks all incidents", correct: false },
      { text: "Allow the safety officer to apportion blame for unsafe behaviour", correct: false },
    ],
  },
  {
    text: "When investigating an incident, the purpose is to:",
    options: [
      { text: "Identify who was at fault so disciplinary action can be taken", correct: false },
      { text: "Find the root cause and prevent recurrence", correct: true },
      { text: "Satisfy the company's insurance requirements", correct: false },
      { text: "Provide evidence for any legal claim that may follow", correct: false },
    ],
  },
  {
    text: "If you see a colleague's electrical extension cable running across a walkway, you should:",
    options: [
      { text: "Ignore it as it is not your responsibility", correct: false },
      { text: "Walk around it carefully until someone else deals with it", correct: false },
      { text: "Report it and, if safe to do so, remove the hazard", correct: true },
      { text: "Wait until it causes an accident before reporting", correct: false },
    ],
  },
  {
    text: "SUNU Group's employee assistance programme is available to:",
    options: [
      { text: "Only employees who have been with the company for more than one year", correct: false },
      { text: "Only employees referred by their line manager", correct: false },
      { text: "Any employee experiencing personal or work-related difficulties", correct: true },
      { text: "Only employees in senior management positions", correct: false },
    ],
  },
  {
    text: "An employee who is feeling excessively fatigued before operating equipment should:",
    options: [
      { text: "Take a short break and then proceed as normal", correct: false },
      { text: "Drink coffee to improve alertness before starting", correct: false },
      { text: "Speak to their manager and not operate the equipment until fit to do so", correct: true },
      { text: "Complete the minimum required tasks and then rest", correct: false },
    ],
  },
];

// ── updates config ────────────────────────────────────────────────────────────

const UPDATES: ItemUpdate[] = [
  {
    title: "Fire and marine claims handling procedure",
    videoUrl: "https://www.youtube.com/watch?v=V4BQu6g82hI",
    body: FIRE_MARINE_BODY,
    questions: FIRE_MARINE_QUESTIONS,
  },
  {
    title: "People manager handbook",
    videoUrl: "https://www.youtube.com/watch?v=qqZQfi7DDkk",
    body: PEOPLE_MANAGER_BODY,
    questions: PEOPLE_MANAGER_QUESTIONS,
  },
  {
    title: "Workplace health and safety quick reference",
    videoUrl: "https://www.youtube.com/watch?v=5pEf7Eroqso",
    body: WORKPLACE_HS_BODY,
    questions: WORKPLACE_HS_QUESTIONS,
  },
  {
    title: "Organisation chart",
    // No video for reference document
    body: ORG_CHART_BODY,
    // No assessment for a reference-only document
  },
];

// ── runner ────────────────────────────────────────────────────────────────────

for (const update of UPDATES) {
  console.log(`\n── ${update.title} ────────────────────────────────────────`);

  const [item] = await db
    .select({ id: libraryItems.id, publishedVersion: libraryItems.publishedVersion })
    .from(libraryItems)
    .where(eq(libraryItems.title, update.title));

  if (!item) {
    console.warn(`  Item not found, skipping.`);
    continue;
  }

  // Update video URL if provided
  if (update.videoUrl) {
    await db
      .update(libraryItems)
      .set({ videoUrl: update.videoUrl, changedBy: ACTOR, updatedAt: new Date() })
      .where(eq(libraryItems.id, item.id));
    console.log(`  Video URL updated.`);
  }

  // Update body on the published version
  if (item.publishedVersion !== null) {
    const updated = await db
      .update(libraryItemVersions)
      .set({ body: update.body, changedBy: ACTOR, updatedAt: new Date() })
      .where(
        and(
          eq(libraryItemVersions.itemId, item.id),
          eq(libraryItemVersions.version, item.publishedVersion),
        ),
      )
      .returning({ id: libraryItemVersions.id });
    if (updated.length > 0) {
      console.log(`  Body updated (version ${item.publishedVersion}).`);
    } else {
      console.warn(`  Published version ${item.publishedVersion} not found for body update.`);
    }
  } else {
    console.warn(`  No published version found, skipping body update.`);
  }

  // Create knowledge-check assessment if questions provided
  if (update.questions && update.questions.length > 0) {
    const assessmentId = await createAssessment(db, item.id, 70, ACTOR);
    for (let qi = 0; qi < update.questions.length; qi++) {
      const q = update.questions[qi]!;
      const questionId = await addQuestion(db, assessmentId, q.text, qi + 1, ACTOR);
      for (let oi = 0; oi < q.options.length; oi++) {
        const o = q.options[oi]!;
        await addOption(db, questionId, o.text, o.correct, oi + 1, ACTOR);
      }
    }
    console.log(`  Assessment created with ${update.questions.length} questions.`);
  }
}

await close();
console.log("\nDone.");
