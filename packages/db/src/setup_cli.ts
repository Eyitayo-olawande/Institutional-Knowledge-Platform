import { loadConfig } from "./config.ts";
import { setupDatabases } from "./setup.ts";

const config = loadConfig();
const { created, existing } = await setupDatabases(config);
for (const name of created) console.log(`Created ${name}`);
for (const name of existing) console.log(`Already there: ${name}`);
