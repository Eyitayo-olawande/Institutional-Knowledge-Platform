import { and, desc, eq } from "drizzle-orm";
import type { TenantDb } from "./client.ts";
import { assignments, paths, people, trainingNominations, users } from "./schema.ts";
import type { nominationReason } from "./schema.ts";
import { recordActivity } from "./activity.ts";
import { addNotice } from "./notices.ts";

export type NominationReason = (typeof nominationReason.enumValues)[number];

export const NOMINATION_REASONS: readonly NominationReason[] = [
  "performance_improvement",
  "skills_gap",
  "assessment_results",
  "compliance_requirement",
  "new_role",
  "manager_recommendation",
  "refresher_training",
  "career_development",
] as const;

export interface NominationInput {
  personId: string;
  pathId: string;
  reason: NominationReason;
  reasonDetail: string | null;
  suggestedStartDate: string | null;
}

export async function createNomination(db: TenantDb, input: NominationInput, actor: string): Promise<string> {
  const [row] = await db
    .insert(trainingNominations)
    .values({ ...input, nominatedBy: actor, status: "pending", changedBy: actor })
    .returning({ id: trainingNominations.id });
  if (!row) throw new Error("Insert failed");
  await recordActivity(db, { actor, action: "nominations.created", entityType: "person", entityId: input.personId, details: { path_id: input.pathId } });
  return row.id;
}

export interface NominationListRow {
  id: string;
  personId: string;
  personName: string;
  pathId: string;
  pathName: string;
  nominatedBy: string;
  reason: NominationReason;
  status: "pending" | "approved" | "rejected";
  suggestedStartDate: string | null;
  createdAt: Date;
}

export async function listNominations(db: TenantDb, status?: "pending" | "approved" | "rejected"): Promise<NominationListRow[]> {
  const rows = await db
    .select({
      id: trainingNominations.id,
      personId: trainingNominations.personId,
      personName: people.fullName,
      pathId: trainingNominations.pathId,
      pathName: paths.name,
      nominatedBy: trainingNominations.nominatedBy,
      reason: trainingNominations.reason,
      status: trainingNominations.status,
      suggestedStartDate: trainingNominations.suggestedStartDate,
      createdAt: trainingNominations.createdAt,
    })
    .from(trainingNominations)
    .innerJoin(people, eq(people.id, trainingNominations.personId))
    .innerJoin(paths, eq(paths.id, trainingNominations.pathId))
    .where(status ? eq(trainingNominations.status, status) : undefined)
    .orderBy(desc(trainingNominations.createdAt));
  return rows as NominationListRow[];
}

export interface NominationDetail extends NominationListRow {
  reasonDetail: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  approvedStartDate: string | null;
  personWorkEmail: string;
}

export async function getNomination(db: TenantDb, id: string): Promise<NominationDetail | null> {
  const [row] = await db
    .select({
      id: trainingNominations.id,
      personId: trainingNominations.personId,
      personName: people.fullName,
      personWorkEmail: people.workEmail,
      pathId: trainingNominations.pathId,
      pathName: paths.name,
      nominatedBy: trainingNominations.nominatedBy,
      reason: trainingNominations.reason,
      reasonDetail: trainingNominations.reasonDetail,
      status: trainingNominations.status,
      suggestedStartDate: trainingNominations.suggestedStartDate,
      reviewedBy: trainingNominations.reviewedBy,
      reviewNote: trainingNominations.reviewNote,
      approvedStartDate: trainingNominations.approvedStartDate,
      createdAt: trainingNominations.createdAt,
    })
    .from(trainingNominations)
    .innerJoin(people, eq(people.id, trainingNominations.personId))
    .innerJoin(paths, eq(paths.id, trainingNominations.pathId))
    .where(eq(trainingNominations.id, id));
  return (row as NominationDetail | undefined) ?? null;
}

export async function approveNomination(
  db: TenantDb,
  id: string,
  startDate: string,
  reviewNote: string | null,
  actor: string,
): Promise<void> {
  const nom = await getNomination(db, id);
  if (!nom || nom.status !== "pending") throw new Error("Nomination not found or not pending");

  // Prevent duplicate assignment.
  const existing = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.personId, nom.personId), eq(assignments.pathId, nom.pathId)));
  if (existing.length > 0) throw new Error("duplicate");

  await db.transaction(async (tx) => {
    await tx
      .update(trainingNominations)
      .set({ status: "approved", reviewedBy: actor, reviewNote, approvedStartDate: startDate, changedBy: actor })
      .where(eq(trainingNominations.id, id));

    await tx
      .insert(assignments)
      .values({ pathId: nom.pathId, personId: nom.personId, startDate, changedBy: actor });
  });

  await recordActivity(db, { actor, action: "nominations.approved", entityType: "person", entityId: nom.personId, details: { nomination_id: id, path_id: nom.pathId } });
}

export async function rejectNomination(db: TenantDb, id: string, reviewNote: string | null, actor: string): Promise<void> {
  const nom = await getNomination(db, id);
  if (!nom || nom.status !== "pending") throw new Error("Nomination not found or not pending");

  await db
    .update(trainingNominations)
    .set({ status: "rejected", reviewedBy: actor, reviewNote, changedBy: actor })
    .where(eq(trainingNominations.id, id));

  await recordActivity(db, { actor, action: "nominations.rejected", entityType: "person", entityId: nom.personId, details: { nomination_id: id, path_id: nom.pathId } });
}

// Send in-app notices about a nomination decision. Looks up the nominee's
// user account (if any) by work email; notifies the nominator by their id.
// nominatedBy is stored as "user:<uuid>" by convention.
export async function notifyNominationDecision(
  db: TenantDb,
  nomination: NominationDetail,
  approved: boolean,
): Promise<void> {
  const [nomineeUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, nomination.personWorkEmail));
  if (nomineeUser && approved) {
    await addNotice(db, {
      userId: nomineeUser.id,
      event: `nomination.approved.${nomination.id}`,
      subject: `You have been scheduled for training: ${nomination.pathName}`,
      body: `Your learning assignment for "${nomination.pathName}" has been approved and scheduled from ${nomination.approvedStartDate ?? ""}. Open My Learning to get started.`,
    });
  }

  const nominatorId = nomination.nominatedBy.startsWith("user:") ? nomination.nominatedBy.slice(5) : null;
  if (nominatorId) {
    const subject = approved
      ? `Nomination approved: ${nomination.personName} for ${nomination.pathName}`
      : `Nomination not approved: ${nomination.personName} for ${nomination.pathName}`;
    const body = approved
      ? `Your nomination for ${nomination.personName} to complete "${nomination.pathName}" has been approved.`
      : `Your nomination for ${nomination.personName} to complete "${nomination.pathName}" was not approved${nomination.reviewNote ? `: ${nomination.reviewNote}` : "."}`;
    await addNotice(db, {
      userId: nominatorId,
      event: `nomination.${approved ? "approved" : "rejected"}.nominator.${nomination.id}`,
      subject,
      body,
    });
  }
}
