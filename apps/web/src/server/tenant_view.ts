import type { Resolution } from "@mantle/platform/tenancy";

export interface TenantView {
  readonly key: string;
  readonly params?: Readonly<Record<string, string>>;
}

// What the home page says for a resolution, as message keys only.
export function tenantView(resolution: Resolution): TenantView {
  if (resolution.ok) return { key: "tenant.welcome", params: { name: resolution.tenant.name } };
  if (resolution.reason === "unknown_domain") return { key: "tenant.unknown" };
  return { key: "tenant.no_domain" };
}
