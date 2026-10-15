import { describe, expect, it } from "vitest";
import { tenantView } from "./tenant_view.ts";

const tenant = { id: "t1", name: "Alpha Insurance", domain: "alpha.localhost", tier: "dedicated" as const, status: "active", databaseName: "t1" };

describe("tenantView", () => {
  it("welcomes a resolved tenant by name", () => {
    expect(tenantView({ ok: true, tenant })).toEqual({ key: "tenant.welcome", params: { name: "Alpha Insurance" } });
  });

  it("explains an unknown domain", () => {
    expect(tenantView({ ok: false, reason: "unknown_domain" })).toEqual({ key: "tenant.unknown" });
  });

  it("asks for a tenant domain when there is none", () => {
    expect(tenantView({ ok: false, reason: "invalid_host" })).toEqual({ key: "tenant.no_domain" });
    expect(tenantView({ ok: false, reason: "reserved_domain" })).toEqual({ key: "tenant.no_domain" });
  });
});
