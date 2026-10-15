import { sql } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { databaseUrl } from "../config.ts";
import { connectControl, controlTenantDirectory, featureStates, isFeatureOn, listTenants, provisionTenant, seedControl, setFeature, type ControlDb } from "./index.ts";
import { migrateControl } from "./migrate.ts";
import { tenants } from "./schema.ts";

// Runs against a real PostgreSQL server; skipped without MANTLE_PG_SERVER_URL.
const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const name = `itest_control_${process.pid}_${Date.now()}`;

async function admin(statement: string) {
  const client = new pg.Client({ connectionString: serverUrl });
  await client.connect();
  try {
    await client.query(statement);
  } finally {
    await client.end();
  }
}

describe.skipIf(!serverUrl)("control database", { timeout: 60_000 }, () => {
  let db: ControlDb;
  let close: () => Promise<void>;

  beforeAll(async () => {
    await admin(`create database ${name}`);
    ({ db, close } = connectControl(databaseUrl(serverUrl ?? "", name)));
    await migrateControl(db);
  });

  afterAll(async () => {
    await close?.();
    await admin(`drop database if exists ${name}`);
  });

  it("migrations are safe to run again", async () => {
    await expect(migrateControl(db)).resolves.toBeUndefined();
  });

  it("seeds the fictional tenants and is safe to run again", async () => {
    await seedControl(db);
    await seedControl(db);
    const rows = await db.select({ domain: tenants.domain }).from(tenants);
    expect(rows.map((r) => r.domain).sort()).toEqual(["alpha.localhost", "beta.localhost"]);
  });

  it("finds each tenant by its own domain only", async () => {
    const directory = controlTenantDirectory(db);
    const alpha = await directory.findByDomain("alpha.localhost");
    const beta = await directory.findByDomain("beta.localhost");
    expect(alpha?.domain).toBe("alpha.localhost");
    expect(beta?.domain).toBe("beta.localhost");
    expect(alpha?.id).not.toBe(beta?.id);
    expect(await directory.findByDomain("gamma.localhost")).toBeUndefined();
  });

  it("rejects upper case domains and unsafe database names", async () => {
    const base = { name: "X", tier: "shared" as const, hostingLocation: "local", changedBy: "test" };
    await expect(
      db.insert(tenants).values({ ...base, domain: "Upper.localhost", databaseName: "mantle_x" }),
    ).rejects.toThrow();
    await expect(
      db.insert(tenants).values({ ...base, domain: "x.localhost", databaseName: "x; drop" }),
    ).rejects.toThrow();
  });

  it("refuses two tenants on one domain", async () => {
    const base = { name: "Dup", tier: "shared" as const, hostingLocation: "local", changedBy: "test" };
    await expect(
      db.insert(tenants).values({ ...base, domain: "alpha.localhost", databaseName: "mantle_dup" }),
    ).rejects.toThrow();
  });

  it("holds no columns for personal data", async () => {
    const result = await db.execute(
      sql`select column_name from information_schema.columns where table_schema = 'public' and column_name ~ '(email|phone|first_name|last_name|password)'`,
    );
    expect(result.rows).toEqual([]);
  });

  it("provisions a tenant with its own database and refuses a second on the same domain", async () => {
    const tenant = { name: "Gamma Cover (fictional)", domain: `gamma${process.pid}.localhost`, tier: "shared" as const, hostingLocation: "local", changedBy: "test" };
    const first = await provisionTenant(db, serverUrl ?? "", tenant);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect((await listTenants(db)).map((t) => t.domain)).toContain(tenant.domain);
      expect(await controlTenantDirectory(db).findByDomain(tenant.domain)).toMatchObject({ name: tenant.name });
      await admin(`drop database if exists ${first.databaseName}`);
    }
    expect(await provisionTenant(db, serverUrl ?? "", tenant)).toEqual({ ok: false, reason: "domain_taken" });
  });

  it("uses feature defaults until a tenant switch is set, per tenant only", async () => {
    const [alpha, beta] = await listTenants(db);
    expect(await featureStates(db, alpha!.id)).toEqual({ people_import: true, knowledge_library: false });
    await setFeature(db, alpha!.id, "knowledge_library", true, "test");
    await setFeature(db, alpha!.id, "knowledge_library", true, "test");
    expect(await isFeatureOn(db, alpha!.id, "knowledge_library")).toBe(true);
    expect(await isFeatureOn(db, beta!.id, "knowledge_library")).toBe(false);
  });
});
