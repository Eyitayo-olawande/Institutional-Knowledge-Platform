"use server";

import {
  addQuestion,
  createAssessment,
  deleteAssessment,
  deleteAssessmentQuestion,
  deleteOption,
  getAssessmentForAdmin,
  setCorrectOption,
  updatePassingScore,
  updateQuestion,
  upsertAssessmentOption,
} from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { requireFeature, requirePermission } from "../../../../../server/session.ts";

const ID = /^[0-9a-f-]{36}$/;
const SCORE = /^\d+$/;

async function editor() {
  const ctx = await requirePermission("library.edit");
  await requireFeature(ctx.tenant, "knowledge_library");
  return ctx;
}

function builderUrl(itemId: string, msg?: string) {
  return msg ? `/admin/library/${itemId}/assessment?msg=${msg}` : `/admin/library/${itemId}/assessment`;
}

export async function setPassingScoreAction(form: FormData) {
  const ctx = await editor();
  const itemId = String(form.get("itemId") ?? "");
  const assessmentId = String(form.get("assessmentId") ?? "");
  const raw = String(form.get("passingScore") ?? "");
  if (!ID.test(itemId) || !SCORE.test(raw)) redirect(builderUrl(itemId));
  const score = Math.min(100, Math.max(1, parseInt(raw, 10)));
  const changedBy = `user:${ctx.user.id}`;
  if (ID.test(assessmentId)) {
    await updatePassingScore(ctx.db, assessmentId, score, changedBy);
  } else {
    await createAssessment(ctx.db, itemId, score, changedBy);
  }
  redirect(builderUrl(itemId, "saved"));
}

export async function addQuestionAction(form: FormData) {
  const ctx = await editor();
  const itemId = String(form.get("itemId") ?? "");
  const assessmentId = String(form.get("assessmentId") ?? "");
  const questionText = String(form.get("questionText") ?? "").trim();
  if (!ID.test(itemId) || !ID.test(assessmentId) || !questionText) redirect(builderUrl(itemId));
  const existing = await getAssessmentForAdmin(ctx.db, itemId);
  const sortOrder = (existing?.questions.length ?? 0);
  await addQuestion(ctx.db, assessmentId, questionText, sortOrder, `user:${ctx.user.id}`);
  redirect(builderUrl(itemId, "saved"));
}

export async function updateQuestionAction(form: FormData) {
  const ctx = await editor();
  const itemId = String(form.get("itemId") ?? "");
  const questionId = String(form.get("questionId") ?? "");
  const questionText = String(form.get("questionText") ?? "").trim();
  if (!ID.test(itemId) || !ID.test(questionId) || !questionText) redirect(builderUrl(itemId));
  await updateQuestion(ctx.db, questionId, questionText, `user:${ctx.user.id}`);
  redirect(builderUrl(itemId, "saved"));
}

export async function deleteQuestionAction(form: FormData) {
  const ctx = await editor();
  const itemId = String(form.get("itemId") ?? "");
  const questionId = String(form.get("questionId") ?? "");
  if (!ID.test(itemId) || !ID.test(questionId)) redirect(builderUrl(itemId));
  await deleteAssessmentQuestion(ctx.db, questionId);
  redirect(builderUrl(itemId));
}

export async function addOptionAction(form: FormData) {
  const ctx = await editor();
  const itemId = String(form.get("itemId") ?? "");
  const questionId = String(form.get("questionId") ?? "");
  const optionText = String(form.get("optionText") ?? "").trim();
  if (!ID.test(itemId) || !ID.test(questionId) || !optionText) redirect(builderUrl(itemId));
  const assessment = await getAssessmentForAdmin(ctx.db, itemId);
  const question = assessment?.questions.find((q) => q.id === questionId);
  const sortOrder = question?.options.length ?? 0;
  await upsertAssessmentOption(ctx.db, questionId, null, optionText, sortOrder, `user:${ctx.user.id}`);
  redirect(builderUrl(itemId, "saved"));
}

export async function setCorrectOptionAction(form: FormData) {
  const ctx = await editor();
  const itemId = String(form.get("itemId") ?? "");
  const questionId = String(form.get("questionId") ?? "");
  const optionId = String(form.get("optionId") ?? "");
  if (!ID.test(itemId) || !ID.test(questionId) || !ID.test(optionId)) redirect(builderUrl(itemId));
  await setCorrectOption(ctx.db, questionId, optionId, `user:${ctx.user.id}`);
  redirect(builderUrl(itemId, "saved"));
}

export async function deleteOptionAction(form: FormData) {
  const ctx = await editor();
  const itemId = String(form.get("itemId") ?? "");
  const optionId = String(form.get("optionId") ?? "");
  if (!ID.test(itemId) || !ID.test(optionId)) redirect(builderUrl(itemId));
  await deleteOption(ctx.db, optionId);
  redirect(builderUrl(itemId));
}

export async function deleteAssessmentAction(form: FormData) {
  const ctx = await editor();
  const itemId = String(form.get("itemId") ?? "");
  const assessmentId = String(form.get("assessmentId") ?? "");
  if (!ID.test(itemId) || !ID.test(assessmentId)) redirect(builderUrl(itemId));
  await deleteAssessment(ctx.db, assessmentId);
  redirect(builderUrl(itemId));
}
