import { createDatabase, dropDatabase } from "@mantle/db";
import { addAdministrator, connectTenant, deliveriesFor, listUsers, markAllRead, noticesFor, unreadCount, type TenantDb } from "@mantle/db/tenant";
import { migrateTenant } from "@mantle/db/tenant/migrate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Mailer } from "../identity/outbox.ts";
import { notify } from "./notify.ts";

const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const name = `itest_notify_${process.pid}_${Date.now()}`;

describe.skipIf(!serverUrl)("notification service", { timeout: 60_000 }, () => {
  let db: TenantDb;
  let close: () => Promise<void>;
  let userId: string;
  const mail: { to: string; subject: string }[] = [];
  const working: Mailer = { send: async (m) => void mail.push({ to: m.to, subject: m.subject }) };
  const broken: Mailer = { send: async () => { throw new Error("provider down"); } };

  beforeAll(async () => {
    await createDatabase(serverUrl ?? "", name);
    await migrateTenant(serverUrl ?? "", name);
    ({ db, close } = connectTenant(serverUrl ?? "", name));
    await addAdministrator(db, { name: "Kemi", email: "kemi@a.test" }, "test");
    userId = (await listUsers(db))[0]!.id;
  });

  afterAll(async () => {
    await close?.();
    await dropDatabase(serverUrl ?? "", name);
  });

  it("sends in app and email from the template and records both deliveries", async () => {
    const result = await notify(db, working, { event: "roles.changed", userIds: [userId], params: { organisation: "Alpha", roles: "Learner" } });
    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(mail).toEqual([{ to: "kemi@a.test", subject: "Your roles have changed" }]);
    expect((await noticesFor(db, userId))[0]?.body).toBe("Hello Kemi, your roles at Alpha are now: Learner.");
    expect((await deliveriesFor(db, "roles.changed")).map((d) => [d.channel, d.status]).sort()).toEqual([
      ["email", "sent"],
      ["in_app", "sent"],
    ]);
  });

  it("records a failed email without losing the in app notice", async () => {
    const result = await notify(db, broken, { event: "roles.changed", userIds: [userId], params: { organisation: "Alpha", roles: "Learner" } });
    expect(result).toEqual({ sent: 1, failed: 1 });
    expect((await deliveriesFor(db, "roles.changed")).find((d) => d.status === "failed")?.error).toBe("provider down");
  });

  it("counts unread notices and marks them read", async () => {
    expect(await unreadCount(db, userId)).toBe(2);
    await markAllRead(db, userId);
    expect(await unreadCount(db, userId)).toBe(0);
  });
});
