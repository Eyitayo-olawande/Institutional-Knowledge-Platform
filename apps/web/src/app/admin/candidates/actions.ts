"use server";

import { registerCandidate, updateCandidate, type CandidateInput } from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { requireFeature, requirePermission } from "../../../server/session.ts";

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}
function opt(form: FormData, name: string): string | null {
  const v = field(form, name);
  return v === "" ? null : v;
}

function parseInput(form: FormData): CandidateInput {
  return {
    firstName: field(form, "firstName"),
    surname: field(form, "surname"),
    middleName: opt(form, "middleName"),
    email: field(form, "email"),
    phone: field(form, "phone"),
    positionAppliedFor: field(form, "positionAppliedFor"),
    department: field(form, "department"),
    highestQualification: opt(form, "highestQualification"),
    institution: opt(form, "institution"),
  };
}

function validate(input: CandidateInput): boolean {
  return !!(input.firstName && input.surname && input.email && input.phone && input.positionAppliedFor && input.department);
}

export async function registerAction(form: FormData): Promise<void> {
  const { db, user, tenant } = await requirePermission("candidates.manage");
  await requireFeature(tenant, "aptitude_testing");
  const input = parseInput(form);
  if (!validate(input)) redirect("/admin/candidates/new?error=invalid");
  try {
    await registerCandidate(db, input, `user:${user.id}`);
  } catch {
    redirect("/admin/candidates/new?error=duplicate");
  }
  redirect("/admin/candidates?registered=1");
}

export async function editCandidateAction(form: FormData): Promise<void> {
  const { db, user, tenant } = await requirePermission("candidates.manage");
  await requireFeature(tenant, "aptitude_testing");
  const id = field(form, "candidateId");
  const input = parseInput(form);
  if (!id || !validate(input)) redirect(`/admin/candidates/${id}?error=invalid`);
  try {
    await updateCandidate(db, id, input, `user:${user.id}`);
  } catch {
    redirect(`/admin/candidates/${id}?error=1`);
  }
  redirect(`/admin/candidates/${id}?saved=1`);
}
