import { createLibraryItem, listLibraryItems, publishDraft, type TenantDb } from "@mantle/db/tenant";

// Fictional library items for the fictional development tenants, so demos
// and screen reviews show realistic Common Staff Learning and Claims content.
// Never run against real tenants. Every title ends in "(fictional)".

export interface DemoItem {
  readonly title: string;
  readonly body: string;
  // Days from today; negative means the review is already overdue.
  readonly reviewInDays: number | null;
  readonly publish: boolean;
}

export const DEMO_ITEMS: readonly DemoItem[] = [
  {
    title: "Code of conduct (fictional)",
    publish: true,
    reviewInDays: 300,
    body: "Our code of conduct explains how we treat customers, colleagues and partners.\n\n1. Act honestly and fairly in every claim, sale and service.\n2. Declare any conflict of interest to your manager.\n3. Never accept gifts that could influence a decision.\n4. Protect customer information as if it were your own.\n5. Speak up: report concerns to your manager or the whistleblowing line.",
  },
  {
    title: "AML/CFT essentials for all staff (fictional)",
    publish: true,
    reviewInDays: 120,
    body: "Money laundering and terrorist financing can pass through insurance products.\n\nKnow your customer: confirm identity before issuing a policy or paying a claim.\nWatch for warning signs: overpayment followed by a refund request, payments from unrelated third parties, or a customer who avoids questions.\nReport, do not investigate: send any suspicion to the Compliance team the same day, and do not tell the customer.",
  },
  {
    title: "Data protection at work (fictional)",
    publish: true,
    reviewInDays: 200,
    body: "We hold personal data about customers and colleagues and must protect it.\n\nCollect only what the task needs.\nKeep it in approved systems, not personal email or phones.\nShare it only with people who need it for their work.\nReport a lost device or a message sent to the wrong person to IT and Compliance at once.",
  },
  {
    title: "Information security basics (fictional)",
    publish: true,
    reviewInDays: 90,
    body: "Most attacks start with a message.\n\nCheck the sender before opening links or attachments.\nNever share your password or sign in code, even with IT.\nLock your screen when you leave your desk.\nReport anything suspicious to IT using the report button.",
  },
  {
    title: "Customer service standards (fictional)",
    publish: true,
    reviewInDays: 250,
    body: "Every customer should know what happens next.\n\nAnswer calls within five rings and emails within one working day.\nGive your name and a reference number.\nExplain decisions in plain language.\nIf you cannot help, pass the customer to someone who can and tell them who.",
  },
  {
    title: "Motor claim registration procedure (fictional)",
    publish: true,
    reviewInDays: 30,
    body: "Purpose: register every motor claim the same way, within one working day of notification.\n\n1. Record the policy number, date, place and a short description of the loss.\n2. Check the policy was in force on the date of loss.\n3. Ask for the documents on the motor claim checklist.\n4. Create the claim in the core system and give the customer the claim number.\n5. Refer claims above your authority limit to a supervisor.",
  },
  {
    title: "Documents needed for a motor claim (fictional)",
    publish: true,
    reviewInDays: -10,
    body: "Ask the customer for:\n\nA completed claim form.\nPhotos of the damage.\nThe repair estimate.\nA police report where a third party or theft is involved.\nThe driver's licence of the person driving at the time.",
  },
  {
    title: "Salvage and recoveries guide (fictional)",
    publish: false,
    reviewInDays: null,
    body: "Draft for review.\n\nWhen a vehicle is a total loss, the damaged vehicle becomes salvage. Record its value, arrange collection, and note any recovery we can make from a third party who caused the loss.",
  },
];

function isoDate(daysFromToday: number, today: Date): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

// Adds any demo item that is not there yet, matched by title. Safe to run again.
export async function seedDemoLibrary(db: TenantDb, today = new Date()): Promise<{ added: number; skipped: number }> {
  const existing = new Set((await listLibraryItems(db, { publishedOnly: false })).map((i) => i.title));
  let added = 0;
  for (const item of DEMO_ITEMS) {
    if (existing.has(item.title)) continue;
    const reviewDate = item.reviewInDays === null ? null : isoDate(item.reviewInDays, today);
    const id = await createLibraryItem(db, { title: item.title, body: item.body, ownerUserId: null, reviewDate }, "system:demo_seed");
    if (item.publish) await publishDraft(db, id, "system:demo_seed");
    added += 1;
  }
  return { added, skipped: DEMO_ITEMS.length - added };
}
