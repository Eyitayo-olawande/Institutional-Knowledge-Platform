/**
 * Adds the Leadership Foundations and Communication & Business Etiquette
 * modules to Funke's existing "Claims Officer path".
 *
 * Run once from packages/db:
 *   npx tsx src/tenant/seed_funke_modules.ts
 */
import { connectTenant } from "./client.ts";
import { addItemToModule, addModuleToStage, createModule } from "./paths.ts";

const ACTOR = "system:sunu_elearning_seed";
const DB_URL = process.env.MANTLE_PG_SERVER_URL ?? "postgres://localhost:5432/postgres";
const DB_NAME = "mantle_tenant_alpha";

const { db, close } = connectTenant(DB_URL, DB_NAME);

// IDs from the seed run
const LEADERSHIP_ITEM_ID   = "23e41ae5-a1d8-43fc-83b4-876aee9c7ffe";
const LEADERSHIP_CHECK_ID  = "818030d9-7013-44fe-91e1-083e378a460b";
const ETIQUETTE_ITEM_ID    = "f944a0e4-0ff5-4947-918d-4932a1785b39";
const ETIQUETTE_CHECK_ID   = "acdc591c-5297-42d3-8aca-6c17bdcb40e7";

// Common stage of Funke's Claims Officer path
const COMMON_STAGE_ID = "fbfc6a39-6066-4224-9516-7b10cc3c5701";

const leadershipModId = await createModule(db, "Leadership Foundations", ACTOR);
await addModuleToStage(db, COMMON_STAGE_ID, leadershipModId, ACTOR);
await addItemToModule(db, leadershipModId, LEADERSHIP_ITEM_ID, ACTOR);
await addItemToModule(db, leadershipModId, LEADERSHIP_CHECK_ID, ACTOR);
console.log("Added Leadership Foundations module:", leadershipModId);

const etiquetteModId = await createModule(db, "Communication & Business Etiquette", ACTOR);
await addModuleToStage(db, COMMON_STAGE_ID, etiquetteModId, ACTOR);
await addItemToModule(db, etiquetteModId, ETIQUETTE_ITEM_ID, ACTOR);
await addItemToModule(db, etiquetteModId, ETIQUETTE_CHECK_ID, ACTOR);
console.log("Added Communication & Business Etiquette module:", etiquetteModId);

await close();
console.log("Done. Both modules are now in Funke's Claims Officer path (common stage).");
