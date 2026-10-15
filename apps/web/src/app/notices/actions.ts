"use server";

import { markAllRead } from "@mantle/db/tenant";
import { redirect } from "next/navigation";
import { requireSignedIn } from "../../server/session.ts";

export async function markNoticesRead(): Promise<void> {
  const { db, user } = await requireSignedIn();
  await markAllRead(db, user.id);
  redirect("/notices");
}
