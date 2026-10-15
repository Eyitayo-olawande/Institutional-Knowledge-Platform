import { describe, expect, it } from "vitest";
import {
  currentTenant,
  hasTenant,
  normalizeHost,
  resolveTenant,
  runWithTenant,
  type TenantDirectory,
  type TenantRecord,
} from "./index.ts";

// Two test tenants, as the isolation tests require (Development Roadmap v1, section 9).
const alpha: TenantRecord = { id: "t_alpha", name: "Alpha", domain: "learn.alpha-insurance.test", tier: "dedicated", status: "active" };
const beta: TenantRecord = { id: "t_beta", name: "Beta", domain: "beta.mantle.test", tier: "shared", status: "active" };

const directory: TenantDirectory = {
  async findByDomain(domain) {
    return [alpha, beta].find((t) => t.domain === domain);
  },
};

describe("normalizeHost", () => {
  it.each([
    ["Beta.Mantle.Test", "beta.mantle.test"],
    ["beta.mantle.test:3000", "beta.mantle.test"],
    ["beta.mantle.test.", "beta.mantle.test"],
  ])("normalises %s", (input, expected) => {
    expect(normalizeHost(input)).toBe(expected);
  });

  it.each([undefined, null, "", "localhost", "127.0.0.1", "10.0.0.1:443", "bad_host.test", "-a.test", "a..test"])(
    "rejects %s",
    (input) => {
      expect(normalizeHost(input)).toBeUndefined();
    },
  );
});

describe("resolveTenant", () => {
  it("maps each domain to its own tenant only", async () => {
    expect(await resolveTenant("learn.alpha-insurance.test", directory)).toEqual({ ok: true, tenant: alpha });
    expect(await resolveTenant("BETA.mantle.test:443", directory)).toEqual({ ok: true, tenant: beta });
  });

  it("rejects unknown domains", async () => {
    expect(await resolveTenant("gamma.mantle.test", directory)).toEqual({ ok: false, reason: "unknown_domain" });
  });

  it("rejects invalid hosts before any lookup", async () => {
    let lookups = 0;
    const counting: TenantDirectory = { findByDomain: async () => (lookups++, alpha) };
    expect(await resolveTenant("127.0.0.1", counting)).toEqual({ ok: false, reason: "invalid_host" });
    expect(lookups).toBe(0);
  });

  it("never serves a reserved Design Streams domain as a tenant", async () => {
    const result = await resolveTenant("console.mantle.test", { findByDomain: async () => beta }, ["Console.Mantle.Test"]);
    expect(result).toEqual({ ok: false, reason: "reserved_domain" });
  });

  it("rejects a directory answer for a different domain", async () => {
    const wrong: TenantDirectory = { findByDomain: async () => alpha };
    expect(await resolveTenant("beta.mantle.test", wrong)).toEqual({ ok: false, reason: "unknown_domain" });
  });
});

describe("tenant context", () => {
  it("is empty outside a request", () => {
    expect(hasTenant()).toBe(false);
    expect(() => currentTenant()).toThrow("No tenant context");
  });

  it("carries the tenant through async work", async () => {
    const seen = await runWithTenant(alpha, async () => {
      await new Promise((r) => setTimeout(r, 1));
      return currentTenant().id;
    });
    expect(seen).toBe("t_alpha");
  });

  it("keeps concurrent requests apart", async () => {
    const read = (t: TenantRecord) =>
      runWithTenant(t, async () => {
        await new Promise((r) => setTimeout(r, Math.random() * 5));
        return currentTenant().id;
      });
    expect(await Promise.all([read(alpha), read(beta), read(alpha)])).toEqual(["t_alpha", "t_beta", "t_alpha"]);
  });

  it("refuses to switch tenant inside an active context", () => {
    expect(() => runWithTenant(alpha, () => runWithTenant(beta, () => 1))).toThrow("different tenant");
  });
});
