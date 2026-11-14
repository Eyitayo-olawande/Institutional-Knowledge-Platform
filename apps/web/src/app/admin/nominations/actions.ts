"use server";

import {
  approveNomination,
  createNomination,
  getNomination,
  NOMINATION_REASONS,
  notifyNominationDecision,
  rejectNomination,
  type NominationReason,
} from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { requireFeature, requirePermission } from "../../../server/session.ts";
import { can } from "@mantle/platform/identity";

const ID = /^[0-9a-f-]{36}$/;

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

function optionalField(form: FormData, name: string): string | null {
  const v = field(form, name);
  return v === "" ? null : v;
}

export async function nominateAction(form: FormData): Promise<void> {
  const { db, user, tenant } = await requirePermission("nominations.manage");
  await requireFeature(tenant, "learning_paths");

  const personId = field(form, "personId");
  const pathId = field(form, "pathId");
  const reason = field(form, "reason");
  const reasonDetail = optionalField(form, "reasonDetail");
  const suggestedStartDate = optionalField(form, "suggestedStartDate");

  if (!ID.test(personId) || !ID.test(pathId) || !(NOMINATION_REASONS as readonly string[]).includes(reason)) {
    redirect("/admin/nominations/new?error=invalid");
  }

  await createNomination(
    db,
    { personId, pathId, reason: reason as NominationReason, reasonDetail, suggestedStartDate },
    `user:${user.id}`,
  );
  redirect("/admin/nominations?submitted=1");
}

export async function approveAction(form: FormData): Promise<void> {
  const { db, user, tenant, roles } = await requirePermission("nominations.manage");
  await requireFeature(tenant, "learning_paths");

  // Only learning administrators can approve.
  if (!can(roles, "activity.view")) redirect("/admin/nominations?error=unauthorized");

  const id = field(form, "nominationId");
  const startDate = field(form, "startDate");
  const reviewNote = optionalField(form, "reviewNote");

  if (!ID.test(id) || !startDate) redirect(`/admin/nominations/${id}?error=invalid`);

  try {
    await approveNomination(db, id, startDate, reviewNote, `user:${user.id}`);
    const nom = await getNomination(db, id);
    if (nom) await notifyNominationDecision(db, nom, true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "duplicate") redirect(`/admin/nominations/${id}?error=duplicate`);
    redirect(`/admin/nominations/${id}?error=1`);
  }
  redirect("/admin/nominations?approved=1");
}

export async function rejectAction(form: FormData): Promise<void> {
  const { db, user, tenant, roles } = await requirePermission("nominations.manage");
  await requireFeature(tenant, "learning_paths");

  if (!can(roles, "activity.view")) redirect("/admin/nominations?error=unauthorized");

  const id = field(form, "nominationId");
  const reviewNote = optionalField(form, "reviewNote");

  if (!ID.test(id)) redirect("/admin/nominations");

  try {
    await rejectNomination(db, id, reviewNote, `user:${user.id}`);
    const nom = await getNomination(db, id);
    if (nom) await notifyNominationDecision(db, nom, false);
  } catch {
    redirect(`/admin/nominations/${id}?error=1`);
  }
  redirect("/admin/nominations?rejected=1");
}
