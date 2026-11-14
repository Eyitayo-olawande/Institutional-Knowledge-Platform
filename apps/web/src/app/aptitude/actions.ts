"use server";

import { signToken, verifyPin } from "@mantle/db/tenant";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { tenantDb } from "../../server/session.ts";
import { resolveRequestTenant } from "../../server/tenant.ts";

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

export async function accessAction(form: FormData): Promise<void> {
  const candidateRef = field(form, "candidateRef").toUpperCase();
  const pin = field(form, "pin");

  if (!candidateRef || pin.length !== 4) {
    redirect("/aptitude?error=invalid");
  }

  const resolution = await resolveRequestTenant();
  if (!resolution.ok) redirect("/aptitude?error=invalid");
  const { tenant } = resolution;

  const db = tenantDb(tenant);
  const result = await verifyPin(db, candidateRef, pin);

  if (!result) {
    redirect("/aptitude?error=invalid");
  }

  const { testId, candidateId } = result;
  const token = signToken(testId, candidateId, "pending");

  const jar = await cookies();
  jar.set("aptitude_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 4, // 4 hours
    path: "/aptitude",
  });

  redirect(`/aptitude/${token}/start`);
}
