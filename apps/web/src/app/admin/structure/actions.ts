"use server";

import {
  archiveStructureEntry,
  createStructureEntry,
  isStructureKind,
  mergeStructure,
  moveRoleLevel,
  renameStructure,
  unarchiveStructureEntry,
} from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../server/session.ts";

const ID = /^[0-9a-f-]{36}$/;

function back(kind: string, query: string): never {
  redirect(`/admin/structure?tab=${kind}&${query}`);
}

function read(form: FormData) {
  const kind = String(form.get("kind") ?? "");
  const id = String(form.get("id") ?? "");
  if (!isStructureKind(kind) || !ID.test(id)) redirect("/admin/structure?error=missing");
  return { kind, id };
}

export async function renameEntry(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("structure.manage");
  const { kind, id } = read(form);
  const name = String(form.get("name") ?? "").trim();
  if (!name) back(kind, "error=empty");
  const result = await renameStructure(db, kind, id, name, `user:${user.id}`);
  back(kind, result === "renamed" || result === "unchanged" ? "done=renamed" : `error=${result}`);
}

export async function mergeEntry(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("structure.manage");
  const { kind, id } = read(form);
  const into = String(form.get("into") ?? "");
  if (!ID.test(into)) back(kind, "error=same");
  const result = await mergeStructure(db, kind, id, into, `user:${user.id}`);
  back(kind, result === "merged" ? "done=merged" : `error=${result}`);
}

export async function moveLevel(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("structure.manage");
  const { id } = read(form);
  const direction = form.get("direction") === "up" ? "up" : "down";
  await moveRoleLevel(db, id, direction, `user:${user.id}`);
  back("role_level", "done=reordered");
}

export async function createEntry(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("structure.manage");
  const kind = String(form.get("kind") ?? "");
  if (!isStructureKind(kind)) redirect("/admin/structure?error=missing");
  const name = String(form.get("name") ?? "").trim();
  if (!name) back(kind, "error=empty");
  const departmentId = String(form.get("departmentId") ?? "") || null;
  const { result } = await createStructureEntry(db, kind, name, departmentId, `user:${user.id}`);
  back(kind, result === "created" ? "done=created" : `error=${result}`);
}

export async function archiveEntry(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("structure.manage");
  const { kind, id } = read(form);
  const result = await archiveStructureEntry(db, kind, id, `user:${user.id}`);
  back(kind, result === "archived" ? "done=archived" : `error=${result}`);
}

export async function unarchiveEntry(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("structure.manage");
  const { kind, id } = read(form);
  const result = await unarchiveStructureEntry(db, kind, id, `user:${user.id}`);
  back(kind, result === "unarchived" ? "done=unarchived" : `error=${result}`);
}
