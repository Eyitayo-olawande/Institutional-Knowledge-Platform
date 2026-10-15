"use server";

import { isWordingKey, setWording } from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../server/session.ts";

export async function saveWording(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("wording.edit");
  const key = String(form.get("key") ?? "");
  const singular = String(form.get("singular") ?? "").trim();
  const plural = String(form.get("plural") ?? "").trim();
  if (!isWordingKey(key) || !singular || !plural) redirect("/admin/wording?error=1");
  await setWording(db, key, { singular, plural }, `user:${user.id}`);
  redirect("/admin/wording?saved=1");
}
