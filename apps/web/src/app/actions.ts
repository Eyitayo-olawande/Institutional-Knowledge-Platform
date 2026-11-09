"use server";

import { completeModule, personByUserId, submitAssessmentAttempt, type AttemptResponse } from "@mantle/db/tenant";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authFor, requestHost } from "../server/auth.ts";
import { requireSignedIn } from "../server/session.ts";
import { resolveRequestTenant } from "../server/tenant.ts";

async function currentAuth() {
  const resolution = await resolveRequestTenant();
  if (!resolution.ok) redirect("/");
  const { host, protocol } = await requestHost();
  return authFor(resolution.tenant, host, protocol);
}

// The address a code was sent to, kept in a short lived cookie rather than
// the page address so it never lands in browser history or server logs.
const CODE_EMAIL_COOKIE = "mantle_code_email";

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

export async function signInWithPassword(form: FormData): Promise<void> {
  const auth = await currentAuth();
  try {
    await auth.api.signInEmail({ body: { email: field(form, "email"), password: String(form.get("password") ?? "") }, headers: await headers() });
  } catch {
    redirect("/sign-in?error=wrong_details");
  }
  redirect("/");
}

export async function sendSignInCode(form: FormData): Promise<void> {
  const auth = await currentAuth();
  const email = field(form, "email");
  try {
    await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" }, headers: await headers() });
  } catch {
    // Same answer whether or not the person exists, so addresses cannot be probed.
  }
  (await cookies()).set(CODE_EMAIL_COOKIE, email, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  redirect("/sign-in?code_sent=1");
}

export async function signInWithCode(form: FormData): Promise<void> {
  const auth = await currentAuth();
  const email = (await cookies()).get(CODE_EMAIL_COOKIE)?.value ?? "";
  try {
    await auth.api.signInEmailOTP({ body: { email, otp: field(form, "code") }, headers: await headers() });
  } catch {
    redirect("/sign-in?code_sent=1&error=wrong_code");
  }
  (await cookies()).delete(CODE_EMAIL_COOKIE);
  redirect("/");
}

export async function signOut(): Promise<void> {
  const auth = await currentAuth();
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}

// No longer used directly — module completion is system-driven via submitAssessmentAction.
// Kept for any admin tooling that may call it directly.
export async function completeModuleAction(form: FormData): Promise<void> {
  const { db, user } = await requireSignedIn();
  const moduleId = String(form.get("moduleId") ?? "");
  const person = await personByUserId(db, user.id);
  if (person) await completeModule(db, person.id, moduleId, `user:${user.id}`);
  redirect("/my-learning");
}

// Gate 2: score the assessment, record the attempt, and — if both gates
// pass — mark the module complete. Gate 1 (all content items viewed) is
// checked inside submitAssessmentAttempt via hasViewedAllModuleItems.
export async function submitAssessmentAction(form: FormData): Promise<void> {
  const { db, user } = await requireSignedIn();
  const assessmentId = String(form.get("assessmentId") ?? "");
  const moduleId = String(form.get("moduleId") ?? "");
  const itemId = String(form.get("itemId") ?? "");

  if (!assessmentId || !moduleId || !itemId) redirect("/my-learning");

  const person = await personByUserId(db, user.id);
  if (!person) redirect("/my-learning");

  const responses: AttemptResponse[] = [];
  for (const [key, value] of form.entries()) {
    if (key.startsWith("response_")) {
      const questionId = key.slice("response_".length);
      responses.push({ questionId, optionId: String(value) });
    }
  }

  const result = await submitAssessmentAttempt(
    db,
    person.id,
    assessmentId,
    moduleId,
    responses,
    `user:${user.id}`,
  );

  if (result.passed && result.gate1Satisfied) {
    await completeModule(db, person.id, moduleId, `system:assessment:${result.attemptId}`);
    redirect("/my-learning?completed=1");
  }

  redirect(`/library/${itemId}?moduleId=${moduleId}&attempt=${result.attemptId}`);
}
