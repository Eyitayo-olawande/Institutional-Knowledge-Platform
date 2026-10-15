import { describe, expect, it } from "vitest";
import { migrationsDir } from "./migrations_dir.ts";

describe("migrationsDir", () => {
  it("finds the migrations from the repository root and from inside packages/db", () => {
    expect(migrationsDir("tenant")).toMatch(/packages\/db\/migrations\/tenant$/);
    expect(migrationsDir("control", "packages/db/src")).toMatch(/packages\/db\/migrations\/control$/);
  });

  it("explains when there are none", () => {
    expect(() => migrationsDir("tenant", "/")).toThrow("Could not find the tenant migrations folder");
  });
});
