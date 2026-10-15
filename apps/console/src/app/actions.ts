"use server";

import { provisionTenant } from "@mantle/db/control";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consoleOpen, control, serverUrl } from "../server/control.ts";
import { readTenantForm } from "../server/tenant_form.ts";

export async function createTenant(form: FormData): Promise<void> {
  if (!consoleOpen()) redirect("/");
  const parsed = readTenantForm(form);
  if (!parsed.ok) redirect(`/?error=${parsed.error}`);
  const result = await provisionTenant(control(), serverUrl(), {
    ...parsed.value,
    // Replaced by the signed in Design Streams user once sign in exists.
    changedBy: "console:development",
  });
  revalidatePath("/");
  if (!result.ok) redirect(`/?error=${result.reason}`);
  redirect(`/?created=${encodeURIComponent(parsed.value.domain)}`);
}
