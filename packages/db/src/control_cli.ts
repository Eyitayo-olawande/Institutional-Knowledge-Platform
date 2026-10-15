import { databaseUrl, loadConfig } from "./config.ts";
import { connectControl, seedControl, tenantDatabaseNames } from "./control/index.ts";
import { migrateControl } from "./control/migrate.ts";
import { migrateTenant } from "./tenant/migrate.ts";

// Usage: control_cli.ts migrate | seed
// migrate: the control database, then every tenant database it lists
// (CLAUDE.md: migrations run against every tenant database).
const command = process.argv[2];
const config = loadConfig();
const { db, close } = connectControl(databaseUrl(config.serverUrl, config.controlDatabase));

async function migrateAll() {
  await migrateControl(db);
  const names = await tenantDatabaseNames(db);
  for (const name of names) await migrateTenant(config.serverUrl, name);
  console.log(`Control database and ${names.length} tenant databases are up to date.`);
}

try {
  if (command === "migrate") {
    await migrateAll();
  } else if (command === "seed") {
    await migrateControl(db);
    await seedControl(db);
    await migrateAll();
    console.log("Fictional development tenants are in place: alpha.localhost, beta.localhost.");
  } else {
    console.error("Usage: control_cli.ts migrate | seed");
    process.exitCode = 1;
  }
} finally {
  await close();
}
