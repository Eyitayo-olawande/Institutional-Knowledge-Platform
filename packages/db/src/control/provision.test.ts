import { describe, expect, it } from "vitest";
import { databaseNameFor } from "./provision.ts";

describe("databaseNameFor", () => {
  it("derives a safe database name from the domain", () => {
    expect(databaseNameFor("learn.sunu-assurances.ng")).toBe("mantle_t_learn_sunu_assurances_ng");
    expect(databaseNameFor("alpha.localhost")).toBe("mantle_t_alpha_localhost");
  });

  it("stays within PostgreSQL's name length and the control database rule", () => {
    const name = databaseNameFor(`${"a".repeat(80)}.test`);
    expect(name.length).toBeLessThanOrEqual(63);
    expect(name).toMatch(/^[a-z][a-z0-9_]{0,62}$/);
  });
});
