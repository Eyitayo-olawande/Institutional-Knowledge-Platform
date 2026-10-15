import { databaseUrl, loadConfig } from "@mantle/db";
import { connectControl, DEV_TENANTS } from "@mantle/db/control";
import { connectTenant } from "@mantle/db/tenant";
import { seedTestPerson } from "./seed.ts";

// Fictional people for the fictional development tenants, so sign in can be
// tried locally. Never run against real tenants.
export const DEV_PASSWORD = "mantle development";

const config = loadConfig();
const control = connectControl(databaseUrl(config.serverUrl, config.controlDatabase));
try {
  for (const tenant of DEV_TENANTS) {
    const prefix = tenant.domain.split(".")[0];
    const { db, close } = connectTenant(config.serverUrl, tenant.databaseName);
    try {
      await seedTestPerson(db, { name: `Ada ${prefix} (fictional)`, email: `ada@${prefix}.test`, password: DEV_PASSWORD });
      console.log(`Fictional person ada@${prefix}.test can sign in on ${tenant.domain}.`);
    } finally {
      await close();
    }
  }
} finally {
  await control.close();
}
