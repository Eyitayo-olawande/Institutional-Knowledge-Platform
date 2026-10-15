import { databaseUrl, loadConfig } from "./config.ts";
import { connectControl, migrateControl, seedControl } from "./control/index.ts";

// Usage: control_cli.ts migrate | seed
const command = process.argv[2];
const config = loadConfig();
const { db, close } = connectControl(databaseUrl(config.serverUrl, config.controlDatabase));
try {
  if (command === "migrate") {
    await migrateControl(db);
    console.log(`Control database ${config.controlDatabase} is up to date.`);
  } else if (command === "seed") {
    await migrateControl(db);
    await seedControl(db);
    console.log("Fictional development tenants are in place: alpha.localhost, beta.localhost.");
  } else {
    console.error("Usage: control_cli.ts migrate | seed");
    process.exitCode = 1;
  }
} finally {
  await close();
}
