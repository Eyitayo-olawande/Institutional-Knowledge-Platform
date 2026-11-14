"use server";

import {
  assignCandidateToTest,
  createAptitudeTest,
  deleteQuestion,
  generatePin,
  type AptitudeTestInput,
  type QuestionInput,
  unassignCandidateFromTest,
  updateAptitudeTest,
  upsertQuestion,
} from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { requireFeature, requirePermission } from "../../../server/session.ts";

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}
function num(form: FormData, name: string): number {
  return Number(field(form, name)) || 0;
}

function parseTestInput(form: FormData): AptitudeTestInput {
  return {
    name: field(form, "name"),
    instructions: field(form, "instructions"),
    durationMinutes: num(form, "durationMinutes"),
    numQuestions: num(form, "numQuestions"),
    totalMarks: num(form, "totalMarks"),
    passMark: num(form, "passMark"),
  };
}

function validateTest(input: AptitudeTestInput): boolean {
  return !!(
    input.name &&
    input.durationMinutes > 0 &&
    input.numQuestions > 0 &&
    input.totalMarks > 0 &&
    input.passMark > 0 &&
    input.passMark <= input.totalMarks
  );
}

export async function createTestAction(form: FormData): Promise<void> {
  const { db, user, tenant } = await requirePermission("candidates.manage");
  await requireFeature(tenant, "aptitude_testing");
  const input = parseTestInput(form);
  if (!validateTest(input)) redirect("/admin/aptitude-tests/new?error=invalid");
  const test = await createAptitudeTest(db, input, `user:${user.id}`);
  redirect(`/admin/aptitude-tests/${test.id}`);
}

export async function editTestAction(form: FormData): Promise<void> {
  const { db, user, tenant } = await requirePermission("candidates.manage");
  await requireFeature(tenant, "aptitude_testing");
  const id = field(form, "testId");
  const input = parseTestInput(form);
  if (!id || !validateTest(input)) redirect(`/admin/aptitude-tests/${id}?error=invalid`);
  await updateAptitudeTest(db, id, input, `user:${user.id}`);
  redirect(`/admin/aptitude-tests/${id}?saved=1`);
}

export async function upsertQuestionAction(form: FormData): Promise<void> {
  const { db, user, tenant } = await requirePermission("candidates.manage");
  await requireFeature(tenant, "aptitude_testing");
  const testId = field(form, "testId");
  const sectionId = field(form, "sectionId");
  const existingId = field(form, "questionId") || undefined;
  const questionText = field(form, "questionText");
  const marks = num(form, "marks");
  const sortOrder = num(form, "sortOrder");

  const optionTexts = (form.getAll("optionText") as string[]).map((s) => s.trim());
  const correctIdx = Number(field(form, "correctOption"));

  if (!questionText || marks <= 0 || optionTexts.length < 2) {
    redirect(`/admin/aptitude-tests/${testId}?qerror=1`);
  }

  const options: QuestionInput["options"] = optionTexts.map((optionText, i) => ({
    optionText,
    isCorrect: i === correctIdx,
    sortOrder: i + 1,
  }));

  await upsertQuestion(db, testId, sectionId, { questionText, marks, sortOrder, options }, `user:${user.id}`, existingId);
  redirect(`/admin/aptitude-tests/${testId}?qsaved=1`);
}

export async function deleteQuestionAction(form: FormData): Promise<void> {
  const { db, tenant } = await requirePermission("candidates.manage");
  await requireFeature(tenant, "aptitude_testing");
  const testId = field(form, "testId");
  const questionId = field(form, "questionId");
  if (!questionId) redirect(`/admin/aptitude-tests/${testId}`);
  await deleteQuestion(db, questionId);
  redirect(`/admin/aptitude-tests/${testId}`);
}

export async function assignCandidateAction(form: FormData): Promise<void> {
  const { db, user, tenant } = await requirePermission("candidates.manage");
  await requireFeature(tenant, "aptitude_testing");
  const testId = field(form, "testId");
  const candidateId = field(form, "candidateId");
  if (!testId || !candidateId) redirect(`/admin/aptitude-tests/${testId}?aerror=1`);
  try {
    await assignCandidateToTest(db, testId, candidateId, `user:${user.id}`);
  } catch {
    redirect(`/admin/aptitude-tests/${testId}?aerror=duplicate`);
  }
  redirect(`/admin/aptitude-tests/${testId}?assigned=1`);
}

export async function unassignCandidateAction(form: FormData): Promise<void> {
  const { db, tenant } = await requirePermission("candidates.manage");
  await requireFeature(tenant, "aptitude_testing");
  const testId = field(form, "testId");
  const candidateId = field(form, "candidateId");
  await unassignCandidateFromTest(db, testId, candidateId);
  redirect(`/admin/aptitude-tests/${testId}`);
}

export async function generatePinAction(form: FormData): Promise<void> {
  const { db, user, tenant } = await requirePermission("candidates.manage");
  await requireFeature(tenant, "aptitude_testing");
  const testId = field(form, "testId");
  const candidateId = field(form, "candidateId");
  if (!testId || !candidateId) redirect(`/admin/aptitude-tests/${testId}`);
  const pin = await generatePin(db, testId, candidateId, `user:${user.id}`);
  redirect(`/admin/aptitude-tests/${testId}?pin=${encodeURIComponent(pin)}&pinFor=${encodeURIComponent(candidateId)}`);
}
