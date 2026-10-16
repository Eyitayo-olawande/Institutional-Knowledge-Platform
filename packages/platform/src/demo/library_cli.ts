import { databaseUrl, loadConfig } from "@mantle/db";
import { connectControl, DEV_TENANTS } from "@mantle/db/control";
import { connectTenant } from "@mantle/db/tenant";
import { seedDemoLibrary } from "./library_content.ts";

// Adds fictional library items to the fictional development tenants only.
const config = loadConfig();
const control = connectControl(databaseUrl(config.serverUrl, config.controlDatabase));
try {
  for (const tenant of DEV_TENANTS) {
    const { db, close } = connectTenant(config.serverUrl, tenant.databaseName);
    try {
      const { added, skipped } = await seedDemoLibrary(db);
      console.log(`${tenant.domain}: added ${added} fictional library items, ${skipped} already there.`);
    } finally {
      await close();
    }
  }
} finally {
  await control.close();
}
