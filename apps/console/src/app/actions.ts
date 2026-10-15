"use server";

import { isFeature, listTenants, provisionTenant, setFeature } from "@mantle/db/control";
import { addAdministrator } from "@mantle/db/tenant";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consoleOpen, control, serverUrl, tenantDbByName } from "../server/control.ts";
import { readAdminFields, readTenantForm } from "../server/tenant_form.ts";

export async function createTenant(form: FormData): Promise<void> {
  if (!consoleOpen()) redirect("/");
  const parsed = readTenantForm(form);
  if (!parsed.ok) redirect(`/?error=${parsed.error}`);
  const result = await provisionTenant(control(), serverUrl(), {
    ...parsed.value,
    // Replaced by the signed in Design Streams user once sign in exists.
    changedBy: "console:development",
  });
  if (!result.ok) redirect(`/?error=${result.reason}`);
  await addAdministrator(tenantDbByName(result.databaseName), parsed.admin);
  revalidatePath("/");
  redirect(`/?created=${encodeURIComponent(parsed.value.domain)}`);
}

export async function addTenantAdministrator(form: FormData): Promise<void> {
  if (!consoleOpen()) redirect("/");
  const tenantId = String(form.get("tenantId") ?? "");
  const tenant = (await listTenants(control())).find((t) => t.id === tenantId);
  if (!tenant) redirect("/?error=tenant_unknown");
  const admin = readAdminFields(form);
  if (!admin.ok) redirect(`/?error=${admin.error}`);
  await addAdministrator(tenantDbByName(tenant.databaseName), admin.value);
  redirect(`/?admin_added=${encodeURIComponent(tenant.domain)}`);
}

export async function toggleFeature(form: FormData): Promise<void> {
  if (!consoleOpen()) redirect("/");
  const tenantId = String(form.get("tenantId") ?? "");
  const feature = String(form.get("feature") ?? "");
  const tenant = (await listTenants(control())).find((t) => t.id === tenantId);
  if (!tenant || !isFeature(feature)) redirect("/?error=tenant_unknown");
  await setFeature(control(), tenant.id, feature, form.get("enabled") === "true", "console:development");
  revalidatePath("/");
  redirect("/#features");
}
