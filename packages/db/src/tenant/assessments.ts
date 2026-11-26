import { and, eq, inArray } from "drizzle-orm";
import type { TenantDb } from "./client.ts";
import {
  assessmentAttempts,
  assessmentOptions,
  assessmentQuestions,
  assessments,
  assessmentResponses,
  itemViews,
  libraryItems,
  moduleItems,
} from "./schema.ts";

export type AssessmentQuestion = {
  id: string;
  questionText: string;
  sortOrder: number;
  options: { id: string; optionText: string; sortOrder: number }[];
};

export type AssessmentForItem = {
  id: string;
  passingScore: number;
  questions: AssessmentQuestion[];
};

export type AttemptResponse = { questionId: string; optionId: string };

export type AttemptResult = {
  attemptId: string;
  score: number;
  passed: boolean;
  gate1Satisfied: boolean;
  total: number;
  correct: number;
  responses: {
    questionId: string;
    questionText: string;
    chosenOptionId: string;
    chosenOptionText: string;
    isCorrect: boolean;
    correctOptionId: string;
    correctOptionText: string;
  }[];
};

export async function getAssessmentForItem(
  db: TenantDb,
  itemId: string,
): Promise<AssessmentForItem | null> {
  const [row] = await db
    .select({ id: assessments.id, passingScore: assessments.passingScore })
    .from(assessments)
    .where(eq(assessments.itemId, itemId));
  if (!row) return null;

  const questions = await db
    .select({
      id: assessmentQuestions.id,
      questionText: assessmentQuestions.questionText,
      sortOrder: assessmentQuestions.sortOrder,
    })
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, row.id))
    .orderBy(assessmentQuestions.sortOrder);

  if (questions.length === 0) return null;

  const qIds = questions.map((q) => q.id);
  const options = await db
    .select({
      id: assessmentOptions.id,
      questionId: assessmentOptions.questionId,
      optionText: assessmentOptions.optionText,
      sortOrder: assessmentOptions.sortOrder,
    })
    .from(assessmentOptions)
    .where(inArray(assessmentOptions.questionId, qIds))
    .orderBy(assessmentOptions.sortOrder);

  return {
    id: row.id,
    passingScore: row.passingScore,
    questions: questions.map((q) => ({
      ...q,
      options: options.filter((o) => o.questionId === q.id),
    })),
  };
}

export async function recordItemView(
  db: TenantDb,
  personId: string,
  moduleId: string,
  itemId: string,
  changedBy: string,
  itemVersion?: number | null,
): Promise<void> {
  const now = new Date();
  await db
    .insert(itemViews)
    .values({ personId, moduleId, itemId, itemVersion: itemVersion ?? null, changedBy })
    .onConflictDoUpdate({
      target: [itemViews.personId, itemViews.moduleId, itemViews.itemId],
      set: { viewedAt: now, itemVersion: itemVersion ?? null, updatedAt: now, changedBy },
    });
}

export async function hasViewedAllModuleItems(
  db: TenantDb,
  personId: string,
  moduleId: string,
): Promise<boolean> {
  // Only content items count — assessmentOnly items are quizzes and
  // never have their view recorded, so they must not be included here.
  const contentItems = await db
    .select({ itemId: moduleItems.itemId })
    .from(moduleItems)
    .innerJoin(libraryItems, eq(libraryItems.id, moduleItems.itemId))
    .where(and(eq(moduleItems.moduleId, moduleId), eq(libraryItems.assessmentOnly, false)));

  if (contentItems.length === 0) return true;

  const viewed = await db
    .select({ itemId: itemViews.itemId })
    .from(itemViews)
    .where(and(eq(itemViews.personId, personId), eq(itemViews.moduleId, moduleId)));

  const viewedSet = new Set(viewed.map((v) => v.itemId));
  return contentItems.every((mi) => viewedSet.has(mi.itemId));
}

export async function submitAssessmentAttempt(
  db: TenantDb,
  personId: string,
  assessmentId: string,
  moduleId: string,
  responses: AttemptResponse[],
  changedBy: string,
): Promise<AttemptResult> {
  const [assessment] = await db
    .select({ passingScore: assessments.passingScore })
    .from(assessments)
    .where(eq(assessments.id, assessmentId));
  if (!assessment) throw new Error("Assessment not found");

  const questions = await db
    .select({ id: assessmentQuestions.id, questionText: assessmentQuestions.questionText })
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId));

  const qIds = questions.map((q) => q.id);
  const options = await db
    .select({
      id: assessmentOptions.id,
      questionId: assessmentOptions.questionId,
      optionText: assessmentOptions.optionText,
      isCorrect: assessmentOptions.isCorrect,
    })
    .from(assessmentOptions)
    .where(inArray(assessmentOptions.questionId, qIds));

  const correctByQuestion = new Map<string, { id: string; text: string }>();
  for (const o of options) {
    if (o.isCorrect) correctByQuestion.set(o.questionId, { id: o.id, text: o.optionText });
  }

  const optionById = new Map(options.map((o) => [o.id, o]));

  const scored = responses.map((r) => {
    const opt = optionById.get(r.optionId);
    return { ...r, isCorrect: opt?.isCorrect ?? false };
  });

  const correct = scored.filter((r) => r.isCorrect).length;
  const total = questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= assessment.passingScore;
  const now = new Date();

  const [attempt] = await db
    .insert(assessmentAttempts)
    .values({ personId, assessmentId, moduleId, score, passed, submittedAt: now, changedBy })
    .returning({ id: assessmentAttempts.id });
  if (!attempt) throw new Error("Failed to create attempt");

  if (scored.length > 0) {
    await db.insert(assessmentResponses).values(
      scored.map((r) => ({
        attemptId: attempt.id,
        questionId: r.questionId,
        optionId: r.optionId,
        isCorrect: r.isCorrect,
        changedBy,
      })),
    );
  }

  const gate1 = await hasViewedAllModuleItems(db, personId, moduleId);

  const qMap = new Map(questions.map((q) => [q.id, q.questionText]));
  const detailedResponses = scored.map((r) => {
    const opt = optionById.get(r.optionId)!;
    const correctOpt = correctByQuestion.get(r.questionId)!;
    return {
      questionId: r.questionId,
      questionText: qMap.get(r.questionId) ?? "",
      chosenOptionId: r.optionId,
      chosenOptionText: opt?.optionText ?? "",
      isCorrect: r.isCorrect,
      correctOptionId: correctOpt?.id ?? "",
      correctOptionText: correctOpt?.text ?? "",
    };
  });

  return {
    attemptId: attempt.id,
    score,
    passed,
    gate1Satisfied: gate1,
    total,
    correct,
    responses: detailedResponses,
  };
}

export async function getAttemptResults(
  db: TenantDb,
  attemptId: string,
): Promise<AttemptResult | null> {
  const [attempt] = await db
    .select({
      id: assessmentAttempts.id,
      personId: assessmentAttempts.personId,
      assessmentId: assessmentAttempts.assessmentId,
      moduleId: assessmentAttempts.moduleId,
      score: assessmentAttempts.score,
      passed: assessmentAttempts.passed,
    })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.id, attemptId));
  if (!attempt) return null;

  const responses = await db
    .select({
      questionId: assessmentResponses.questionId,
      optionId: assessmentResponses.optionId,
      isCorrect: assessmentResponses.isCorrect,
    })
    .from(assessmentResponses)
    .where(eq(assessmentResponses.attemptId, attemptId));

  const qIds = [...new Set(responses.map((r) => r.questionId))];
  if (qIds.length === 0) {
    return {
      attemptId,
      score: attempt.score ?? 0,
      passed: attempt.passed ?? false,
      gate1Satisfied: false,
      total: 0,
      correct: responses.filter((r) => r.isCorrect).length,
      responses: [],
    };
  }

  const questions = await db
    .select({ id: assessmentQuestions.id, questionText: assessmentQuestions.questionText })
    .from(assessmentQuestions)
    .where(inArray(assessmentQuestions.id, qIds));

  const options = await db
    .select({
      id: assessmentOptions.id,
      questionId: assessmentOptions.questionId,
      optionText: assessmentOptions.optionText,
      isCorrect: assessmentOptions.isCorrect,
    })
    .from(assessmentOptions)
    .where(inArray(assessmentOptions.questionId, qIds));

  const correctByQuestion = new Map<string, { id: string; text: string }>();
  for (const o of options) {
    if (o.isCorrect) correctByQuestion.set(o.questionId, { id: o.id, text: o.optionText });
  }

  const optionById = new Map(options.map((o) => [o.id, o]));
  const qMap = new Map(questions.map((q) => [q.id, q.questionText]));

  const gate1 = await hasViewedAllModuleItems(db, attempt.personId, attempt.moduleId);

  return {
    attemptId,
    score: attempt.score ?? 0,
    passed: attempt.passed ?? false,
    gate1Satisfied: gate1,
    total: qIds.length,
    correct: responses.filter((r) => r.isCorrect).length,
    responses: responses.map((r) => {
      const opt = optionById.get(r.optionId);
      const correctOpt = correctByQuestion.get(r.questionId);
      return {
        questionId: r.questionId,
        questionText: qMap.get(r.questionId) ?? "",
        chosenOptionId: r.optionId,
        chosenOptionText: opt?.optionText ?? "",
        isCorrect: r.isCorrect,
        correctOptionId: correctOpt?.id ?? "",
        correctOptionText: correctOpt?.text ?? "",
      };
    }),
  };
}

// ── Admin read (includes isCorrect for the builder UI) ───────────────────────

export type AssessmentAdminOption = { id: string; optionText: string; isCorrect: boolean; sortOrder: number };
export type AssessmentAdminQuestion = { id: string; questionText: string; sortOrder: number; options: AssessmentAdminOption[] };
export type AssessmentAdmin = { id: string; passingScore: number; questions: AssessmentAdminQuestion[] };

export async function getAssessmentForAdmin(db: TenantDb, itemId: string): Promise<AssessmentAdmin | null> {
  const [row] = await db
    .select({ id: assessments.id, passingScore: assessments.passingScore })
    .from(assessments)
    .where(eq(assessments.itemId, itemId));
  if (!row) return null;

  const questions = await db
    .select({ id: assessmentQuestions.id, questionText: assessmentQuestions.questionText, sortOrder: assessmentQuestions.sortOrder })
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, row.id))
    .orderBy(assessmentQuestions.sortOrder);

  const qIds = questions.map((q) => q.id);
  const options = qIds.length > 0
    ? await db
        .select({ id: assessmentOptions.id, questionId: assessmentOptions.questionId, optionText: assessmentOptions.optionText, isCorrect: assessmentOptions.isCorrect, sortOrder: assessmentOptions.sortOrder })
        .from(assessmentOptions)
        .where(inArray(assessmentOptions.questionId, qIds))
        .orderBy(assessmentOptions.sortOrder)
    : [];

  return {
    id: row.id,
    passingScore: row.passingScore,
    questions: questions.map((q) => ({ ...q, options: options.filter((o) => o.questionId === q.id) })),
  };
}

// ── Admin mutations ───────────────────────────────────────────────────────────

export async function updatePassingScore(db: TenantDb, assessmentId: string, passingScore: number, changedBy: string): Promise<void> {
  await db.update(assessments).set({ passingScore, updatedAt: new Date(), changedBy }).where(eq(assessments.id, assessmentId));
}

export async function updateQuestion(db: TenantDb, questionId: string, questionText: string, changedBy: string): Promise<void> {
  await db.update(assessmentQuestions).set({ questionText, updatedAt: new Date(), changedBy }).where(eq(assessmentQuestions.id, questionId));
}

export async function deleteAssessmentQuestion(db: TenantDb, questionId: string): Promise<void> {
  await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, questionId));
}

export async function upsertAssessmentOption(db: TenantDb, questionId: string, optionId: string | null, optionText: string, sortOrder: number, changedBy: string): Promise<string> {
  if (optionId) {
    await db.update(assessmentOptions).set({ optionText, sortOrder, updatedAt: new Date(), changedBy }).where(eq(assessmentOptions.id, optionId));
    return optionId;
  }
  const [row] = await db.insert(assessmentOptions).values({ questionId, optionText, isCorrect: false, sortOrder, changedBy }).returning({ id: assessmentOptions.id });
  if (!row) throw new Error("Option insert failed");
  return row.id;
}

export async function setCorrectOption(db: TenantDb, questionId: string, optionId: string, changedBy: string): Promise<void> {
  const now = new Date();
  await db.update(assessmentOptions).set({ isCorrect: false, updatedAt: now, changedBy }).where(eq(assessmentOptions.questionId, questionId));
  await db.update(assessmentOptions).set({ isCorrect: true, updatedAt: now, changedBy }).where(eq(assessmentOptions.id, optionId));
}

export async function deleteOption(db: TenantDb, optionId: string): Promise<void> {
  await db.delete(assessmentOptions).where(eq(assessmentOptions.id, optionId));
}

export async function deleteAssessment(db: TenantDb, assessmentId: string): Promise<void> {
  await db.delete(assessments).where(eq(assessments.id, assessmentId));
}

// ── Seeding helpers ───────────────────────────────────────────────────────────

export async function createAssessment(
  db: TenantDb,
  itemId: string,
  passingScore: number,
  changedBy: string,
): Promise<string> {
  const [row] = await db
    .insert(assessments)
    .values({ itemId, passingScore, changedBy })
    .onConflictDoNothing()
    .returning({ id: assessments.id });
  if (row) return row.id;
  const [existing] = await db.select({ id: assessments.id }).from(assessments).where(eq(assessments.itemId, itemId));
  if (!existing) throw new Error("Assessment insert failed");
  return existing.id;
}

export async function addQuestion(
  db: TenantDb,
  assessmentId: string,
  questionText: string,
  sortOrder: number,
  changedBy: string,
): Promise<string> {
  const [row] = await db
    .insert(assessmentQuestions)
    .values({ assessmentId, questionText, sortOrder, changedBy })
    .returning({ id: assessmentQuestions.id });
  if (!row) throw new Error("Question insert failed");
  return row.id;
}

export async function addOption(
  db: TenantDb,
  questionId: string,
  optionText: string,
  isCorrect: boolean,
  sortOrder: number,
  changedBy: string,
): Promise<string> {
  const [row] = await db
    .insert(assessmentOptions)
    .values({ questionId, optionText, isCorrect, sortOrder, changedBy })
    .returning({ id: assessmentOptions.id });
  if (!row) throw new Error("Option insert failed");
  return row.id;
}
