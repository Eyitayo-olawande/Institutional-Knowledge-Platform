"use server";

import { signToken, submitAttempt, verifyToken, type AptitudeAttemptResponse } from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { tenantDb } from "../../../../server/session.ts";
import { resolveRequestTenant } from "../../../../server/tenant.ts";

export async function submitTestAction(form: FormData): Promise<void> {
  const token = String(form.get("token") ?? "");
  const parsed = verifyToken(token);
  if (!parsed) redirect("/aptitude?error=invalid");

  const resolution = await resolveRequestTenant();
  if (!resolution.ok) redirect("/aptitude?error=invalid");
  const db = tenantDb(resolution.tenant);

  const { testId, candidateId, attemptId } = parsed;
  if (attemptId === "pending") redirect(`/aptitude/${token}/start`);

  const responses: AptitudeAttemptResponse[] = [];
  for (const [key, value] of form.entries()) {
    if (key.startsWith("q_")) {
      const questionId = key.slice(2);
      responses.push({ questionId, optionId: String(value) });
    }
  }

  await submitAttempt(db, attemptId, testId, responses);

  const resultsToken = signToken(testId, candidateId, attemptId);
  redirect(`/aptitude/${resultsToken}/results`);
}
