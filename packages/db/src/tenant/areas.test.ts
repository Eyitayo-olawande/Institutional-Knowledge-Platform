import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migrationsDir } from "../migrations_dir.ts";
import { DEFAULT_CONTENT_TYPES } from "./areas.ts";

describe("default content types", () => {
  it("match the Blueprint lists, each ending with an other type", () => {
    expect(DEFAULT_CONTENT_TYPES.common).toHaveLength(10);
    expect(DEFAULT_CONTENT_TYPES.department).toHaveLength(5);
    for (const list of Object.values(DEFAULT_CONTENT_TYPES)) {
      expect(new Set(list.map((t) => t.key)).size).toBe(list.length);
      expect(list.at(-1)?.key).toBe("other");
    }
  });

  it("are the same list the migration loads", () => {
    const sql = readFileSync(join(migrationsDir("tenant"), "0008_learning_areas.sql"), "utf8");
    const loaded = [...sql.matchAll(/\('(common|department)', '([a-z_]+)', '([^']+)', (\d+), 'system:migration'\)/g)].map((m) => ({
      kind: m[1],
      key: m[2],
      label: m[3],
      rank: Number(m[4]),
    }));
    const expected = (["common", "department"] as const).flatMap((kind) =>
      DEFAULT_CONTENT_TYPES[kind].map((t, i) => ({ kind, key: t.key, label: t.label, rank: i + 1 })),
    );
    expect(loaded).toEqual(expected);
  });
});
