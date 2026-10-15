import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, dropDatabase } from "../setup.ts";
import { recentActivity } from "./activity.ts";
import { connectTenant, type TenantDb } from "./client.ts";
import { migrateTenant } from "./migrate.ts";
import { setWording, wording } from "./wording.ts";

const serverUrl = process.env.MANTLE_PG_SERVER_URL;
const name = `itest_wording_${process.pid}_${Date.now()}`;

describe.skipIf(!serverUrl)("wording labels", { timeout: 60_000 }, () => {
  let db: TenantDb;
  let close: () => Promise<void>;

  beforeAll(async () => {
    await createDatabase(serverUrl ?? "", name);
    await migrateTenant(serverUrl ?? "", name);
    ({ db, close } = connectTenant(serverUrl ?? "", name));
  });

  afterAll(async () => {
    await close?.();
    await dropDatabase(serverUrl ?? "", name);
  });

  it("uses defaults until the organisation changes a label", async () => {
    expect((await wording(db)).department).toEqual({ singular: "Department", plural: "Departments" });
    await setWording(db, "department", { singular: " Ward ", plural: "Wards" }, "user:admin");
    expect((await wording(db)).department).toEqual({ singular: "Ward", plural: "Wards" });
    expect((await wording(db)).unit.singular).toBe("Unit");
  });

  it("records the change in the activity log", async () => {
    expect((await recentActivity(db, 1))[0]).toMatchObject({ action: "wording.changed", entityId: "department" });
  });

  it("refuses an empty label", async () => {
    await expect(setWording(db, "unit", { singular: "", plural: "Units" }, "user:admin")).rejects.toThrow();
  });
});
