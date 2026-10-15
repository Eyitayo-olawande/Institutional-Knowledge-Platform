import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Finds packages/db/migrations/<kind> from the working directory, so the
// path also holds when the code is bundled into an app. Override with
// MANTLE_MIGRATIONS_DIR (the folder that holds control/ and tenant/).
export function migrationsDir(kind: "control" | "tenant", start = process.cwd()): string {
  const override = process.env.MANTLE_MIGRATIONS_DIR;
  if (override) return join(override, kind);
  let dir = resolve(start);
  for (;;) {
    for (const candidate of [join(dir, "migrations", kind), join(dir, "packages", "db", "migrations", kind)]) {
      if (existsSync(join(candidate, "meta", "_journal.json"))) return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Could not find the ${kind} migrations folder from ${start}.`);
    dir = parent;
  }
}
