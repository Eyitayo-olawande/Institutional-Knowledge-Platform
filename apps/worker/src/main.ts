import { createRegistry } from "./jobs.ts";

const registry = createRegistry();

console.log(`Mantle worker started with ${registry.size} jobs registered.`);
