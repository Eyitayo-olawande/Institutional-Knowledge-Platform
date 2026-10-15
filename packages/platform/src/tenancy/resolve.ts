// Tenant resolution by domain (Product Architecture v1, section 4): every
// request is mapped to exactly one tenant from its domain before any data
// is read. The lookup itself reads the control database, which arrives in
// a later work package; here it is an interface so the rules can be tested.

export type TenantTier = "shared" | "dedicated";

// The control database fields needed to route a request. No personal data.
export interface TenantRecord {
  readonly id: string;
  // Organisation name, not personal data.
  readonly name: string;
  readonly domain: string;
  readonly tier: TenantTier;
  readonly status: string;
}

export interface TenantDirectory {
  findByDomain(domain: string): Promise<TenantRecord | undefined>;
}

export type Resolution =
  | { readonly ok: true; readonly tenant: TenantRecord }
  | { readonly ok: false; readonly reason: "invalid_host" | "reserved_domain" | "unknown_domain" };

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

// Lower case, without port or trailing dot. Returns undefined for anything
// that is not a plain domain name, including IP addresses.
export function normalizeHost(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  const domain = host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  if (domain.length === 0 || domain.length > 253) return undefined;
  const labels = domain.split(".");
  if (labels.length < 2 || !labels.every((label) => LABEL.test(label))) return undefined;
  if (/^\d+$/.test(labels[labels.length - 1] ?? "")) return undefined;
  return domain;
}

// reservedDomains holds Design Streams domains, such as the admin console,
// which must never be served as a customer tenant.
export async function resolveTenant(
  host: string | null | undefined,
  directory: TenantDirectory,
  reservedDomains: readonly string[] = [],
): Promise<Resolution> {
  const domain = normalizeHost(host);
  if (!domain) return { ok: false, reason: "invalid_host" };
  if (reservedDomains.some((reserved) => normalizeHost(reserved) === domain)) {
    return { ok: false, reason: "reserved_domain" };
  }
  const tenant = await directory.findByDomain(domain);
  if (!tenant || normalizeHost(tenant.domain) !== domain) {
    return { ok: false, reason: "unknown_domain" };
  }
  return { ok: true, tenant };
}
