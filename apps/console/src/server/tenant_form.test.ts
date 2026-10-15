import { describe, expect, it } from "vitest";
import { readTenantForm } from "./tenant_form.ts";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const valid = { name: " Gamma Cover ", domain: "Gamma.Localhost:3000", tier: "shared", hostingLocation: "local" };

describe("readTenantForm", () => {
  it("accepts and normalises a valid tenant", () => {
    expect(readTenantForm(form(valid))).toEqual({
      ok: true,
      value: { name: "Gamma Cover", domain: "gamma.localhost", tier: "shared", hostingLocation: "local" },
    });
  });

  it.each([
    [{ name: "" }, "name_required"],
    [{ domain: "localhost" }, "domain_invalid"],
    [{ domain: "10.0.0.1" }, "domain_invalid"],
    [{ tier: "premium" }, "tier_invalid"],
    [{ hostingLocation: " " }, "location_required"],
  ])("rejects %o", (change, error) => {
    expect(readTenantForm(form({ ...valid, ...change }))).toEqual({ ok: false, error });
  });
});
