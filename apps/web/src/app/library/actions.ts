"use server";

import { attachFileToItem, canSeeArea, createLibraryItem, getLibraryItem, PlacementError, placeItem, publishDraft, saveDraft } from "@mantle/db/tenant";
import { checkUpload, MAX_FILES_PER_UPLOAD } from "@mantle/platform/files";
import { fileStore, scanner } from "../../server/files.ts";
import { redirect } from "next/navigation";
import { requireFeature, requirePermission, viewerAreas } from "../../server/session.ts";

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

const ID = /^[0-9a-f-]{36}$/;

// The chosen area and type, refused unless the editor can see that area.
async function readPlacement(ctx: Awaited<ReturnType<typeof editor>>, form: FormData) {
  const areaId = String(form.get("areaId") ?? "");
  const contentTypeId = String(form.get("contentTypeId") ?? "");
  if (!ID.test(areaId) || !ID.test(contentTypeId)) return null;
  if (!canSeeArea(await viewerAreas(ctx), areaId)) return null;
  return { areaId, contentTypeId };
}

// An editor may only change items in areas they can see.
async function editableItem(ctx: Awaited<ReturnType<typeof editor>>, id: string) {
  const found = ID.test(id) ? await getLibraryItem(ctx.db, id) : null;
  if (!found || !canSeeArea(await viewerAreas(ctx), found.item.areaId)) redirect("/library");
  return found;
}

export async function createItem(form: FormData): Promise<void> {
  const ctx = await editor();
  const { db, user } = ctx;
  const { title, body, reviewDate } = read(form);
  const placement = await readPlacement(ctx, form);
  if (!title || !body || !placement) redirect("/library/new?error=missing");
  let id: string;
  try {
    id = await createLibraryItem(db, { title, body, reviewDate, ownerUserId: user.id, ...placement }, `user:${user.id}`);
  } catch (e) {
    if (e instanceof PlacementError) redirect("/library/new?error=placement");
    throw e;
  }
  redirect(`/library/${id}`);
}

export async function placeLibraryItem(form: FormData): Promise<void> {
  const ctx = await editor();
  const id = String(form.get("id") ?? "");
  await editableItem(ctx, id);
  const placement = await readPlacement(ctx, form);
  if (!placement) redirect(`/library/${id}?error=missing`);
  try {
    await placeItem(ctx.db, id, placement, `user:${ctx.user.id}`);
  } catch (e) {
    if (e instanceof PlacementError) redirect(`/library/${id}?error=placement`);
    throw e;
  }
  redirect(`/library/${id}?placed=1`);
}

export async function saveItemDraft(form: FormData): Promise<void> {
  const ctx = await editor();
  const { db, user } = ctx;
  const id = String(form.get("id") ?? "");
  const found = await editableItem(ctx, id);
  const { title, body, reviewDate, changeNote } = read(form);
  if (!title || !body) redirect(`/library/${id}?error=missing`);
  await saveDraft(db, id, { title, body, changeNote, reviewDate, ownerUserId: found.item.ownerUserId ?? user.id }, `user:${user.id}`);
  redirect(`/library/${id}?saved=1`);
}

export async function publishItem(form: FormData): Promise<void> {
  const ctx = await editor();
  const { db, user } = ctx;
  const id = String(form.get("id") ?? "");
  await editableItem(ctx, id);
  const version = await publishDraft(db, id, `user:${user.id}`);
  redirect(`/library/${id}?${version ? "published=1" : "error=no_draft"}`);
}

// Attaches one or more files in one go. Every file is checked and scanned
// before any is stored, so a batch is either attached whole or refused.
export async function uploadItemFile(form: FormData): Promise<void> {
  const ctx = await editor();
  const { db, user, tenant } = ctx;
  const id = String(form.get("id") ?? "");
  await editableItem(ctx, id);
  const chosen = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (chosen.length === 0) redirect(`/library/${id}?file_error=empty`);
  if (chosen.length > MAX_FILES_PER_UPLOAD) redirect(`/library/${id}?file_error=too_many`);
  const ready = [];
  for (const file of chosen) {
    const data = new Uint8Array(await file.arrayBuffer());
    const checked = checkUpload(file.name, data);
    if (!checked.ok) redirect(`/library/${id}?file_error=${checked.reason}`);
    if ((await scanner.scan(data)) !== "clean") redirect(`/library/${id}?file_error=infected`);
    ready.push({ data, checked });
  }
  for (const { data, checked } of ready) {
    const stored = await fileStore.put(tenant.id, data);
    await attachFileToItem(db, id, { storageKey: stored.key, name: checked.name, contentType: checked.contentType, size: stored.size, sha256: stored.sha256 }, `user:${user.id}`);
  }
  redirect(`/library/${id}?file_added=${ready.length}`);
}
