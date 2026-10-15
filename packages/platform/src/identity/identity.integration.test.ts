import { connectTenant, recentActivity, type TenantDb } from "@mantle/db/tenant";
import { migrateTenant } from "@mantle/db/tenant/migrate";
import { createDatabase, dropDatabase } from "@mantle/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTenantAuth, type Mailer } from "./index.ts";
import { seedTestPerson } from "./seed.ts";

// Two test tenants, each with its own database, as the isolation tests
// require (Development Roadmap v1, section 9). Skipped without
// MANTLE_PG_SERVER_URL.
const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const suffix = `${process.pid}_${Date.now()}`;
const names = { a: `itest_auth_a_${suffix}`, b: `itest_auth_b_${suffix}` };
const PASSWORD = "correct horse battery";

const sent: { to: string; text: string }[] = [];
const mailer: Mailer = { send: async (m) => void sent.push({ to: m.to, text: m.text }) };

describe.skipIf(!serverUrl)("sign in per tenant", { timeout: 60_000 }, () => {
  const conns: { db: TenantDb; close: () => Promise<void> }[] = [];
  let authA: ReturnType<typeof createTenantAuth>;
  let authB: ReturnType<typeof createTenantAuth>;

  beforeAll(async () => {
    for (const name of Object.values(names)) {
      await createDatabase(serverUrl ?? "", name);
      await migrateTenant(serverUrl ?? "", name);
    }
    const a = connectTenant(serverUrl ?? "", names.a);
    const b = connectTenant(serverUrl ?? "", names.b);
    conns.push(a, b);
    const common = { serverUrl: serverUrl ?? "", secret: "x".repeat(32), mailer };
    authA = createTenantAuth(a.db, { ...common, tenantId: "a", databaseName: names.a, baseUrl: "http://a.localhost:3000" });
    authB = createTenantAuth(b.db, { ...common, tenantId: "b", databaseName: names.b, baseUrl: "http://b.localhost:3000" });
    await seedTestPerson(a.db, { name: "Ada Test", email: "ada@a.test", password: PASSWORD });
  });

  afterAll(async () => {
    for (const c of conns) await c.close();
    for (const name of Object.values(names)) await dropDatabase(serverUrl ?? "", name);
  });

  it("signs a person in on their own tenant with the right password", async () => {
    const result = await authA.api.signInEmail({ body: { email: "ada@a.test", password: PASSWORD } });
    expect(result.user.email).toBe("ada@a.test");
    expect(result.token).toBeTruthy();
    const entries = await recentActivity(conns[0]!.db, 5);
    expect(entries.some((e) => e.action === "auth.signed_in" && e.entityId === result.user.id)).toBe(true);
  });

  it("refuses a wrong password", async () => {
    await expect(authA.api.signInEmail({ body: { email: "ada@a.test", password: "wrong password here" } })).rejects.toThrow();
  });

  it("refuses the same person on another tenant", async () => {
    await expect(authB.api.signInEmail({ body: { email: "ada@a.test", password: PASSWORD } })).rejects.toThrow();
  });

  it("does not let anyone sign up", async () => {
    await expect(
      authA.api.signUpEmail({ body: { name: "New", email: "new@a.test", password: "another long password" } }),
    ).rejects.toThrow();
  });

  it("signs in with an emailed code", async () => {
    await authA.api.sendVerificationOTP({ body: { email: "ada@a.test", type: "sign-in" } });
    const code = sent.at(-1)?.text.match(/\d{6}/)?.[0];
    expect(sent.at(-1)?.to).toBe("ada@a.test");
    expect(code).toBeDefined();
    const result = await authA.api.signInEmailOTP({ body: { email: "ada@a.test", otp: code ?? "" } });
    expect(result.user.email).toBe("ada@a.test");
  });

  it("does not accept another tenant's session", async () => {
    const response = await authA.api.signInEmail({ body: { email: "ada@a.test", password: PASSWORD }, asResponse: true });
    const cookie = (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
    expect(cookie).toContain("session_token=");
    // The same cookie works on its own tenant and nowhere else.
    expect((await authA.api.getSession({ headers: new Headers({ cookie }) }))?.user.email).toBe("ada@a.test");
    expect(await authB.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
  });
});
