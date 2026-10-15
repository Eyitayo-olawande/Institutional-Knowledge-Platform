"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authFor, requestHost } from "../server/auth.ts";
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
