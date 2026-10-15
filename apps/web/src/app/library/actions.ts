"use server";

import { createLibraryItem, getLibraryItem, publishDraft, saveDraft } from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { requireFeature, requirePermission } from "../../server/session.ts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function read(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const reviewDate = String(form.get("reviewDate") ?? "").trim();
  const changeNote = String(form.get("changeNote") ?? "").trim();
  return { title, body, reviewDate: DATE.test(reviewDate) ? reviewDate : null, changeNote: changeNote || null };
}

async function editor() {
  const ctx = await requirePermission("library.edit");
  await requireFeature(ctx.tenant, "knowledge_library");
  return ctx;
}

export async function createItem(form: FormData): Promise<void> {
  const { db, user } = await editor();
  const { title, body, reviewDate } = read(form);
  if (!title || !body) redirect("/library/new?error=missing");
  const id = await createLibraryItem(db, { title, body, reviewDate, ownerUserId: user.id }, `user:${user.id}`);
  redirect(`/library/${id}`);
}

export async function saveItemDraft(form: FormData): Promise<void> {
  const { db, user } = await editor();
  const id = String(form.get("id") ?? "");
  const found = await getLibraryItem(db, id);
  if (!found) redirect("/library");
  const { title, body, reviewDate, changeNote } = read(form);
  if (!title || !body) redirect(`/library/${id}?error=missing`);
  await saveDraft(db, id, { title, body, changeNote, reviewDate, ownerUserId: found.item.ownerUserId ?? user.id }, `user:${user.id}`);
  redirect(`/library/${id}?saved=1`);
}

export async function publishItem(form: FormData): Promise<void> {
  const { db, user } = await editor();
  const id = String(form.get("id") ?? "");
  const version = await publishDraft(db, id, `user:${user.id}`);
  redirect(`/library/${id}?${version ? "published=1" : "error=no_draft"}`);
}
