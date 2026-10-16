"use server";

import { grantAreaAccess, revokeAreaAccess } from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../server/session.ts";

const ID = /^[0-9a-f-]{36}$/;

function read(form: FormData) {
  const areaId = String(form.get("areaId") ?? "");
  const personId = String(form.get("personId") ?? "");
  if (!ID.test(areaId) || !ID.test(personId)) redirect("/admin/areas?error=1");
  return { areaId, personId };
}

export async function grantAccess(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("areas.manage");
  const { areaId, personId } = read(form);
  const ok = await grantAreaAccess(db, areaId, personId, `user:${user.id}`);
  redirect(ok ? "/admin/areas?done=granted" : "/admin/areas?error=1");
}

export async function revokeAccess(form: FormData): Promise<void> {
  const { db, user } = await requirePermission("areas.manage");
  const { areaId, personId } = read(form);
  await revokeAreaAccess(db, areaId, personId, `user:${user.id}`);
  redirect("/admin/areas?done=revoked");
}
