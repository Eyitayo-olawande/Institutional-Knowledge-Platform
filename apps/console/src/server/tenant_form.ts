import { normalizeHost } from "@mantle/platform/tenancy";

export type TenantFormResult =
  | { readonly ok: true; readonly value: { name: string; domain: string; tier: "shared" | "dedicated"; hostingLocation: string } }
  | { readonly ok: false; readonly error: "name_required" | "domain_invalid" | "tier_invalid" | "location_required" };

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
  return { ok: true, value: { name, domain, tier, hostingLocation } };
}
