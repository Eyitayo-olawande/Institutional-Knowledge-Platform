import { and, eq, inArray, sql } from "drizzle-orm";
import { createHash, createHmac, randomBytes } from "node:crypto";
import type { TenantDb } from "./client.ts";
import {
  aptitudeAssignments,
  aptitudeAttempts,
  aptitudeOptions,
  aptitudeQuestions,
  aptitudeResponses,
  aptitudeSections,
  aptitudeTests,
  candidates,
} from "./schema.ts";

// ---- Candidates ----

export interface CandidateInput {
  firstName: string;
  surname: string;
  middleName?: string | null;
  email: string;
  phone: string;
  positionAppliedFor: string;
  department: string;
  highestQualification?: string | null;
  institution?: string | null;
}

export interface CandidateRow {
  id: string;
  candidateRef: string;
  firstName: string;
  surname: string;
  middleName: string | null;
  email: string;
  phone: string;
  positionAppliedFor: string;
  department: string;
  highestQualification: string | null;
  institution: string | null;
  registeredAt: Date;
}

async function nextCandidateRef(db: TenantDb): Promise<string> {
  const year = new Date().getFullYear();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(candidates)
    .where(sql`"candidate_ref" LIKE ${`CAN-${year}-%`}`);
  const n = ((row?.count ?? 0) + 1).toString().padStart(3, "0");
  return `CAN-${year}-${n}`;
}

export async function registerCandidate(
  db: TenantDb,
  input: CandidateInput,
  changedBy: string,
): Promise<CandidateRow> {
  const candidateRef = await nextCandidateRef(db);
  const [row] = await db
    .insert(candidates)
    .values({
      candidateRef,
      firstName: input.firstName,
      surname: input.surname,
      middleName: input.middleName ?? null,
      email: input.email,
      phone: input.phone,
      positionAppliedFor: input.positionAppliedFor,
      department: input.department,
      highestQualification: input.highestQualification ?? null,
      institution: input.institution ?? null,
      changedBy,
    })
    .returning();
  return row as CandidateRow;
}

export async function listCandidates(db: TenantDb): Promise<CandidateRow[]> {
  return db.select().from(candidates).orderBy(candidates.registeredAt) as Promise<CandidateRow[]>;
}

export async function getCandidate(db: TenantDb, id: string): Promise<CandidateRow | null> {
  const [row] = await db.select().from(candidates).where(eq(candidates.id, id));
  return (row as CandidateRow | undefined) ?? null;
}

export async function updateCandidate(
  db: TenantDb,
  id: string,
  input: CandidateInput,
  changedBy: string,
): Promise<void> {
  await db.update(candidates).set({
    firstName: input.firstName,
    surname: input.surname,
    middleName: input.middleName ?? null,
    email: input.email,
    phone: input.phone,
    positionAppliedFor: input.positionAppliedFor,
    department: input.department,
    highestQualification: input.highestQualification ?? null,
    institution: input.institution ?? null,
    updatedAt: new Date(),
    changedBy,
  }).where(eq(candidates.id, id));
}

// ---- Tests ----

export interface AptitudeTestInput {
  name: string;
  instructions: string;
  durationMinutes: number;
  numQuestions: number;
  totalMarks: number;
  passMark: number;
}

export interface AptitudeTestRow {
  id: string;
  name: string;
  instructions: string;
  durationMinutes: number;
  numQuestions: number;
  totalMarks: number;
  passMark: number;
  createdAt: Date;
}

const SECTION_DEFAULTS = [
  { name: "General Aptitude", sectionKey: "general_aptitude" as const, weightPercent: 40 },
  { name: "Company Knowledge", sectionKey: "company_knowledge" as const, weightPercent: 60 },
] as const;

export async function createAptitudeTest(
  db: TenantDb,
  input: AptitudeTestInput,
  changedBy: string,
): Promise<AptitudeTestRow> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(aptitudeTests)
      .values({ ...input, changedBy })
      .returning();
    const test = rows[0]!;
    for (const s of SECTION_DEFAULTS) {
      await tx.insert(aptitudeSections).values({ testId: test.id, ...s, changedBy });
    }
    return test as AptitudeTestRow;
  });
}

export async function listAptitudeTests(db: TenantDb): Promise<(AptitudeTestRow & { questionCount: number; assignedCount: number })[]> {
  const tests = await db.select().from(aptitudeTests).orderBy(aptitudeTests.createdAt) as AptitudeTestRow[];
  const qCounts = await db
    .select({ testId: aptitudeQuestions.testId, count: sql<number>`count(*)::int` })
    .from(aptitudeQuestions)
    .groupBy(aptitudeQuestions.testId);
  const aCounts = await db
    .select({ testId: aptitudeAssignments.testId, count: sql<number>`count(*)::int` })
    .from(aptitudeAssignments)
    .groupBy(aptitudeAssignments.testId);
  const qMap = new Map(qCounts.map((r) => [r.testId, r.count]));
  const aMap = new Map(aCounts.map((r) => [r.testId, r.count]));
  return tests.map((t) => ({ ...t, questionCount: qMap.get(t.id) ?? 0, assignedCount: aMap.get(t.id) ?? 0 }));
}

export async function getAptitudeTest(db: TenantDb, id: string): Promise<AptitudeTestRow | null> {
  const [row] = await db.select().from(aptitudeTests).where(eq(aptitudeTests.id, id));
  return (row as AptitudeTestRow | undefined) ?? null;
}

export async function updateAptitudeTest(
  db: TenantDb,
  id: string,
  input: AptitudeTestInput,
  changedBy: string,
): Promise<void> {
  await db.update(aptitudeTests).set({ ...input, updatedAt: new Date(), changedBy }).where(eq(aptitudeTests.id, id));
}

// ---- Sections ----

export interface AptitudeSectionRow {
  id: string;
  testId: string;
  name: string;
  sectionKey: "general_aptitude" | "company_knowledge";
  weightPercent: number;
}

export async function getTestSections(db: TenantDb, testId: string): Promise<AptitudeSectionRow[]> {
  return db.select().from(aptitudeSections).where(eq(aptitudeSections.testId, testId)) as Promise<AptitudeSectionRow[]>;
}

// ---- Questions ----

export interface AptitudeOptionRow {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface AptitudeQuestionRow {
  id: string;
  testId: string;
  sectionId: string;
  questionText: string;
  marks: number;
  sortOrder: number;
  options: AptitudeOptionRow[];
}

export async function getTestQuestions(db: TenantDb, testId: string): Promise<AptitudeQuestionRow[]> {
  const qs = await db.select().from(aptitudeQuestions).where(eq(aptitudeQuestions.testId, testId)).orderBy(aptitudeQuestions.sortOrder);
  if (qs.length === 0) return [];
  const opts = await db.select().from(aptitudeOptions).where(inArray(aptitudeOptions.questionId, qs.map((q) => q.id))).orderBy(aptitudeOptions.sortOrder);
  const optsByQ = new Map<string, AptitudeOptionRow[]>();
  for (const o of opts) {
    const arr = optsByQ.get(o.questionId) ?? [];
    arr.push(o as AptitudeOptionRow);
    optsByQ.set(o.questionId, arr);
  }
  return qs.map((q) => ({ ...(q as Omit<AptitudeQuestionRow, "options">), options: optsByQ.get(q.id) ?? [] }));
}

export interface QuestionInput {
  questionText: string;
  marks: number;
  sortOrder: number;
  options: { optionText: string; isCorrect: boolean; sortOrder: number }[];
}

export async function upsertQuestion(
  db: TenantDb,
  testId: string,
  sectionId: string,
  input: QuestionInput,
  changedBy: string,
  existingId?: string,
): Promise<string> {
  return db.transaction(async (tx) => {
    let qId: string;
    if (existingId) {
      await tx.update(aptitudeQuestions).set({
        questionText: input.questionText,
        marks: input.marks,
        sortOrder: input.sortOrder,
        sectionId,
        updatedAt: new Date(),
        changedBy,
      }).where(eq(aptitudeQuestions.id, existingId));
      await tx.delete(aptitudeOptions).where(eq(aptitudeOptions.questionId, existingId));
      qId = existingId;
    } else {
      const rows = await tx.insert(aptitudeQuestions).values({ testId, sectionId, ...input, changedBy }).returning({ id: aptitudeQuestions.id });
      qId = rows[0]!.id;
    }
    for (const opt of input.options) {
      await tx.insert(aptitudeOptions).values({ questionId: qId, ...opt, changedBy });
    }
    return qId;
  });
}

export async function deleteQuestion(db: TenantDb, questionId: string): Promise<void> {
  await db.delete(aptitudeQuestions).where(eq(aptitudeQuestions.id, questionId));
}

// ---- Assignments and PINs ----

function hashPin(pin: string): string {
  return createHash("sha256").update(`aptitude:${pin}`).digest("hex");
}

export async function assignCandidateToTest(
  db: TenantDb,
  testId: string,
  candidateId: string,
  changedBy: string,
): Promise<void> {
  await db
    .insert(aptitudeAssignments)
    .values({ testId, candidateId, changedBy })
    .onConflictDoNothing();
}

export async function unassignCandidateFromTest(
  db: TenantDb,
  testId: string,
  candidateId: string,
): Promise<void> {
  await db.delete(aptitudeAssignments).where(
    and(eq(aptitudeAssignments.testId, testId), eq(aptitudeAssignments.candidateId, candidateId)),
  );
}

export async function getAssignedCandidates(db: TenantDb, testId: string): Promise<{ id: string; candidateId: string; candidateRef: string; firstName: string; surname: string; email: string; hasPinSet: boolean }[]> {
  const rows = await db
    .select({
      id: aptitudeAssignments.id,
      candidateId: aptitudeAssignments.candidateId,
      candidateRef: candidates.candidateRef,
      firstName: candidates.firstName,
      surname: candidates.surname,
      email: candidates.email,
      accessPinHash: aptitudeAssignments.accessPinHash,
    })
    .from(aptitudeAssignments)
    .innerJoin(candidates, eq(candidates.id, aptitudeAssignments.candidateId))
    .where(eq(aptitudeAssignments.testId, testId));
  return rows.map((r) => ({ ...r, hasPinSet: r.accessPinHash !== null }));
}

export async function generatePin(
  db: TenantDb,
  testId: string,
  candidateId: string,
  changedBy: string,
): Promise<string> {
  const pin = Math.floor(1000 + Math.random() * 9000).toString();
  const hash = hashPin(pin);
  await db.update(aptitudeAssignments).set({
    accessPinHash: hash,
    pinSetAt: new Date(),
    updatedAt: new Date(),
    changedBy,
  }).where(and(eq(aptitudeAssignments.testId, testId), eq(aptitudeAssignments.candidateId, candidateId)));
  return pin;
}

export async function verifyPin(
  db: TenantDb,
  candidateRef: string,
  pin: string,
): Promise<{ testId: string; candidateId: string } | null> {
  const hash = hashPin(pin);
  const [row] = await db
    .select({ testId: aptitudeAssignments.testId, candidateId: aptitudeAssignments.candidateId })
    .from(aptitudeAssignments)
    .innerJoin(candidates, eq(candidates.id, aptitudeAssignments.candidateId))
    .where(and(eq(candidates.candidateRef, candidateRef), eq(aptitudeAssignments.accessPinHash, hash)));
  return row ?? null;
}

// ---- Test taking ----

export interface AptitudeTestForCandidate {
  test: AptitudeTestRow;
  sections: (AptitudeSectionRow & { questions: AptitudeQuestionRow[] })[];
}

export async function getTestForCandidate(db: TenantDb, testId: string): Promise<AptitudeTestForCandidate | null> {
  const test = await getAptitudeTest(db, testId);
  if (!test) return null;
  const sections = await getTestSections(db, testId);
  const questions = await getTestQuestions(db, testId);
  const bySection = new Map<string, AptitudeQuestionRow[]>();
  for (const q of questions) {
    const arr = bySection.get(q.sectionId) ?? [];
    arr.push(q);
    bySection.set(q.sectionId, arr);
  }
  return {
    test,
    sections: sections.map((s) => ({ ...s, questions: bySection.get(s.id) ?? [] })),
  };
}

export type AptitudeAttemptResponse = { questionId: string; optionId: string };

export async function startAttempt(
  db: TenantDb,
  testId: string,
  candidateId: string,
): Promise<{ attemptId: string; alreadySubmitted: boolean }> {
  const existing = await db
    .select({ id: aptitudeAttempts.id, submittedAt: aptitudeAttempts.submittedAt })
    .from(aptitudeAttempts)
    .where(and(eq(aptitudeAttempts.testId, testId), eq(aptitudeAttempts.candidateId, candidateId)));
  const prior = existing[0];
  if (prior?.submittedAt) return { attemptId: prior.id, alreadySubmitted: true };
  if (prior) return { attemptId: prior.id, alreadySubmitted: false };
  const newRows = await db
    .insert(aptitudeAttempts)
    .values({ testId, candidateId, changedBy: `candidate:${candidateId}` })
    .returning({ id: aptitudeAttempts.id });
  return { attemptId: newRows[0]!.id, alreadySubmitted: false };
}

export interface SubmitResult {
  totalScore: number;
  generalAptitudeScore: number;
  companyKnowledgeScore: number;
  passed: boolean;
  totalMarks: number;
  generalAptitudeMarks: number;
  companyKnowledgeMarks: number;
  passMark: number;
}

export async function submitAttempt(
  db: TenantDb,
  attemptId: string,
  testId: string,
  responses: AptitudeAttemptResponse[],
): Promise<SubmitResult> {
  return db.transaction(async (tx) => {
    const test = await tx.select().from(aptitudeTests).where(eq(aptitudeTests.id, testId)).then(([r]) => r);
    if (!test) throw new Error("test_not_found");

    const sections = await tx.select().from(aptitudeSections).where(eq(aptitudeSections.testId, testId));
    const questions = await tx.select().from(aptitudeQuestions).where(eq(aptitudeQuestions.testId, testId));
    const options = questions.length > 0
      ? await tx.select().from(aptitudeOptions).where(inArray(aptitudeOptions.questionId, questions.map((q) => q.id)))
      : [];

    const correctOpts = new Map(options.filter((o) => o.isCorrect).map((o) => [o.questionId, o.id]));
    const qSection = new Map(questions.map((q) => [q.id, q.sectionId]));
    const qMarks = new Map(questions.map((q) => [q.id, q.marks]));

    const sectionScores = new Map<string, number>();
    const sectionMaxes = new Map<string, number>();
    for (const s of sections) { sectionScores.set(s.id, 0); sectionMaxes.set(s.id, 0); }
    for (const q of questions) {
      const sid = qSection.get(q.id)!;
      sectionMaxes.set(sid, (sectionMaxes.get(sid) ?? 0) + q.marks);
    }

    for (const r of responses) {
      const isCorrect = correctOpts.get(r.questionId) === r.optionId;
      const sid = qSection.get(r.questionId);
      const marks = qMarks.get(r.questionId) ?? 0;
      await tx.insert(aptitudeResponses).values({
        attemptId,
        questionId: r.questionId,
        optionId: r.optionId,
        isCorrect,
        changedBy: `attempt:${attemptId}`,
      }).onConflictDoNothing();
      if (isCorrect && sid) sectionScores.set(sid, (sectionScores.get(sid) ?? 0) + marks);
    }

    const gaSection = sections.find((s) => s.sectionKey === "general_aptitude");
    const ckSection = sections.find((s) => s.sectionKey === "company_knowledge");

    const gaScore = sectionScores.get(gaSection?.id ?? "") ?? 0;
    const ckScore = sectionScores.get(ckSection?.id ?? "") ?? 0;
    const gaMax = sectionMaxes.get(gaSection?.id ?? "") ?? 0;
    const ckMax = sectionMaxes.get(ckSection?.id ?? "") ?? 0;

    const gaWeight = gaSection?.weightPercent ?? 40;
    const ckWeight = ckSection?.weightPercent ?? 60;
    const totalMax = test.totalMarks;

    const gaContrib = gaMax > 0 ? Math.round((gaScore / gaMax) * (gaWeight / 100) * totalMax) : 0;
    const ckContrib = ckMax > 0 ? Math.round((ckScore / ckMax) * (ckWeight / 100) * totalMax) : 0;
    const totalScore = gaContrib + ckContrib;
    const passed = totalScore >= test.passMark;

    await tx.update(aptitudeAttempts).set({
      submittedAt: new Date(),
      totalScore,
      generalAptitudeScore: gaScore,
      companyKnowledgeScore: ckScore,
      passed,
      updatedAt: new Date(),
      changedBy: `attempt:${attemptId}`,
    }).where(eq(aptitudeAttempts.id, attemptId));

    return { totalScore, generalAptitudeScore: gaScore, companyKnowledgeScore: ckScore, passed, totalMarks: totalMax, generalAptitudeMarks: gaMax, companyKnowledgeMarks: ckMax, passMark: test.passMark };
  });
}

export async function getAttemptResult(db: TenantDb, attemptId: string): Promise<SubmitResult & { candidateName: string; testName: string } | null> {
  const [row] = await db
    .select({
      totalScore: aptitudeAttempts.totalScore,
      generalAptitudeScore: aptitudeAttempts.generalAptitudeScore,
      companyKnowledgeScore: aptitudeAttempts.companyKnowledgeScore,
      passed: aptitudeAttempts.passed,
      testId: aptitudeAttempts.testId,
      candidateId: aptitudeAttempts.candidateId,
    })
    .from(aptitudeAttempts)
    .where(eq(aptitudeAttempts.id, attemptId));
  if (!row || row.totalScore === null) return null;

  const test = await getAptitudeTest(db, row.testId);
  const candidate = await getCandidate(db, row.candidateId);
  const sections = await getTestSections(db, row.testId);
  const questions = await db.select().from(aptitudeQuestions).where(eq(aptitudeQuestions.testId, row.testId));

  const gaSection = sections.find((s) => s.sectionKey === "general_aptitude");
  const ckSection = sections.find((s) => s.sectionKey === "company_knowledge");
  const gaMax = questions.filter((q) => q.sectionId === gaSection?.id).reduce((s, q) => s + q.marks, 0);
  const ckMax = questions.filter((q) => q.sectionId === ckSection?.id).reduce((s, q) => s + q.marks, 0);

  return {
    totalScore: row.totalScore,
    generalAptitudeScore: row.generalAptitudeScore ?? 0,
    companyKnowledgeScore: row.companyKnowledgeScore ?? 0,
    passed: row.passed ?? false,
    totalMarks: test?.totalMarks ?? 100,
    generalAptitudeMarks: gaMax,
    companyKnowledgeMarks: ckMax,
    passMark: test?.passMark ?? 50,
    candidateName: candidate ? `${candidate.firstName} ${candidate.surname}` : "Unknown",
    testName: test?.name ?? "Unknown",
  };
}

// ---- Results (admin view) ----

export interface AptitudeResultRow {
  candidateId: string;
  assignmentId: string;
  candidateName: string;
  candidateRef: string;
  positionAppliedFor: string;
  firstName: string;
  surname: string;
  status: "not_started" | "completed";
  generalAptitudeScore: number | null;
  companyKnowledgeScore: number | null;
  totalScore: number | null;
  passed: boolean | null;
  submittedAt: Date | null;
}

export async function getTestResults(db: TenantDb, testId: string): Promise<AptitudeResultRow[]> {
  const assigned = await db
    .select({ candidateId: aptitudeAssignments.candidateId, assignmentId: aptitudeAssignments.id })
    .from(aptitudeAssignments)
    .where(eq(aptitudeAssignments.testId, testId));
  if (assigned.length === 0) return [];

  const assignmentMap = new Map(assigned.map((r) => [r.candidateId, r.assignmentId]));
  const candidateIds = assigned.map((r) => r.candidateId);
  const cands = await db.select().from(candidates).where(inArray(candidates.id, candidateIds));
  const attempts = await db.select().from(aptitudeAttempts).where(
    and(eq(aptitudeAttempts.testId, testId), inArray(aptitudeAttempts.candidateId, candidateIds)),
  );
  const attemptMap = new Map(attempts.map((a) => [a.candidateId, a]));

  return cands.map((c) => {
    const a = attemptMap.get(c.id);
    const assignmentId = assignmentMap.get(c.id) ?? "";
    if (!a?.submittedAt) {
      return { candidateId: c.id, assignmentId, candidateName: `${c.firstName} ${c.surname}`, firstName: c.firstName, surname: c.surname, candidateRef: c.candidateRef, positionAppliedFor: c.positionAppliedFor, status: "not_started" as const, generalAptitudeScore: null, companyKnowledgeScore: null, totalScore: null, passed: null, submittedAt: null };
    }
    return { candidateId: c.id, assignmentId, candidateName: `${c.firstName} ${c.surname}`, firstName: c.firstName, surname: c.surname, candidateRef: c.candidateRef, positionAppliedFor: c.positionAppliedFor, status: "completed" as const, generalAptitudeScore: a.generalAptitudeScore, companyKnowledgeScore: a.companyKnowledgeScore, totalScore: a.totalScore, passed: a.passed, submittedAt: a.submittedAt };
  });
}

// ---- Candidate status for admin candidate view ----

export interface CandidateStatus {
  status: "not_assigned" | "not_started" | "completed";
  testName?: string;
  totalScore?: number | null;
  passed?: boolean | null;
}

export async function getCandidateStatus(db: TenantDb, candidateId: string): Promise<CandidateStatus> {
  const [assignment] = await db
    .select({ testId: aptitudeAssignments.testId })
    .from(aptitudeAssignments)
    .where(eq(aptitudeAssignments.candidateId, candidateId));
  if (!assignment) return { status: "not_assigned" };

  const test = await getAptitudeTest(db, assignment.testId);
  const [attempt] = await db
    .select({ totalScore: aptitudeAttempts.totalScore, passed: aptitudeAttempts.passed, submittedAt: aptitudeAttempts.submittedAt })
    .from(aptitudeAttempts)
    .where(and(eq(aptitudeAttempts.testId, assignment.testId), eq(aptitudeAttempts.candidateId, candidateId)));

  if (!attempt?.submittedAt) {
    const result: CandidateStatus = { status: "not_started" };
    if (test?.name) result.testName = test.name;
    return result;
  }
  const result: CandidateStatus = { status: "completed", totalScore: attempt.totalScore, passed: attempt.passed };
  if (test?.name) result.testName = test.name;
  return result;
}

// ---- Access token (signed cookie payload) ----

const TOKEN_SECRET = process.env.APTITUDE_TOKEN_SECRET ?? "aptitude-dev-secret-change-in-prod";

export function signToken(testId: string, candidateId: string, attemptId: string): string {
  const payload = `${testId}:${candidateId}:${attemptId}`;
  const sig = createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyToken(token: string): { testId: string; candidateId: string; attemptId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    const testId = parts[0]!;
    const candidateId = parts[1]!;
    const attemptId = parts[2]!;
    const sig = parts[3]!;
    const payload = `${testId}:${candidateId}:${attemptId}`;
    const expected = createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
    if (sig !== expected) return null;
    return { testId, candidateId, attemptId };
  } catch {
    return null;
  }
}
