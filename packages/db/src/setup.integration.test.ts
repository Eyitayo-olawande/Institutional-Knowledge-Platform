import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { canConnect, databaseExists, setupDatabases } from "./setup.ts";

// Runs against a real PostgreSQL server (Development Roadmap v1, section 9).
// Set MANTLE_PG_SERVER_URL to run; CI provides one. Skipped otherwise.
const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const suffix = `${process.pid}_${Date.now()}`;
const config = {
  serverUrl: serverUrl ?? "",
  controlDatabase: `itest_control_${suffix}`,
  devTenantDatabases: [`itest_tenant_a_${suffix}`, `itest_tenant_b_${suffix}`],
};

describe.skipIf(!serverUrl)("setupDatabases against PostgreSQL", { timeout: 30_000 }, () => {
  afterAll(async () => {
    const client = new pg.Client({ connectionString: config.serverUrl });
    await client.connect();
    for (const name of [config.controlDatabase, ...config.devTenantDatabases]) {
      await client.query(`drop database if exists ${name}`);
    }
    await client.end();
  });

  it("creates the control database and one database per tenant", async () => {
    const result = await setupDatabases(config);
    expect(result.created).toEqual([config.controlDatabase, ...config.devTenantDatabases]);
    for (const name of result.created) expect(await canConnect(config.serverUrl, name)).toBe(true);
  });

  it("is safe to run again", async () => {
    const result = await setupDatabases(config);
    expect(result.created).toEqual([]);
    expect(result.existing).toHaveLength(3);
  });

  it("refuses unsafe database names", async () => {
    await expect(setupDatabases({ ...config, controlDatabase: "x; drop database y" })).rejects.toThrow(
      "Unsafe database name",
    );
    const client = new pg.Client({ connectionString: config.serverUrl });
    await client.connect();
    expect(await databaseExists(client, "x; drop database y")).toBe(false);
    await client.end();
  });
});
