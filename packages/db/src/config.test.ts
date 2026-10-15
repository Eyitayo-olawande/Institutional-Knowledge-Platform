import { describe, expect, it } from "vitest";
import { databaseUrl, DEFAULT_SERVER_URL, loadConfig } from "./config.ts";

describe("loadConfig", () => {
  it("defaults to a local server and the fictional development tenants", () => {
    expect(loadConfig({})).toEqual({
      serverUrl: DEFAULT_SERVER_URL,
      controlDatabase: "mantle_control",
      devTenantDatabases: ["mantle_tenant_alpha", "mantle_tenant_beta"],
    });
  });

  it("reads overrides from the environment", () => {
    const config = loadConfig({
      MANTLE_PG_SERVER_URL: "postgres://u:p@db:5432/postgres",
      MANTLE_PG_CONTROL_DB: "test_control",
      MANTLE_PG_DEV_TENANT_DBS: "test_a, test_b",
    });
    expect(config.controlDatabase).toBe("test_control");
    expect(config.devTenantDatabases).toEqual(["test_a", "test_b"]);
  });
});

describe("databaseUrl", () => {
  it("swaps only the database name", () => {
    expect(databaseUrl("postgres://u:p@db:5432/postgres", "mantle_control")).toBe(
      "postgres://u:p@db:5432/mantle_control",
    );
  });
});
