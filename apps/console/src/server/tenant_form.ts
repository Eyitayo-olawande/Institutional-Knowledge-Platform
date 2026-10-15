import { normalizeHost } from "@mantle/platform/tenancy";

export type TenantFormResult =
  | {
      readonly ok: true;
      readonly value: { name: string; domain: string; tier: "shared" | "dedicated"; hostingLocation: string };
      readonly admin: AdminFields;
    }
  | { readonly ok: false; readonly error: TenantFormError };

export type TenantFormError = "name_required" | "domain_invalid" | "tier_invalid" | "location_required" | AdminFormError;
export type AdminFormError = "admin_name_required" | "admin_email_invalid";
export interface AdminFields {
  readonly name: string;
  readonly email: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Checks the first administrator fields. Returns message keys, never text.
export function readAdminFields(form: FormData): { ok: true; value: AdminFields } | { ok: false; error: AdminFormError } {
  const name = String(form.get("adminName") ?? "").trim();
  const email = String(form.get("adminEmail") ?? "").trim().toLowerCase();
  if (!name) return { ok: false, error: "admin_name_required" };
  if (!EMAIL.test(email)) return { ok: false, error: "admin_email_invalid" };
  return { ok: true, value: { name, email } };
}

// Checks the create tenant form. Returns message keys, never text.
export function readTenantForm(form: FormData): TenantFormResult {
  const name = String(form.get("name") ?? "").trim();
  const domain = normalizeHost(String(form.get("domain") ?? ""));
  const tier = String(form.get("tier") ?? "");
  const hostingLocation = String(form.get("hostingLocation") ?? "").trim();
  if (!name) return { ok: false, error: "name_required" };
  if (!domain) return { ok: false, error: "domain_invalid" };
  if (tier !== "shared" && tier !== "dedicated") return { ok: false, error: "tier_invalid" };
  if (!hostingLocation) return { ok: false, error: "location_required" };
  const admin = readAdminFields(form);
  if (!admin.ok) return admin;
  return { ok: true, value: { name, domain, tier, hostingLocation }, admin: admin.value };
}
