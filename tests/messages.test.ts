import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { messageKeys, type Messages } from "../packages/platform/src/translation.ts";

// Every app keeps its screen text in messages/<locale>.json. English is the
// reference; every other locale must have exactly the same keys.
const APPS = ["apps/web", "apps/console"];

function load(file: string): Messages {
  return JSON.parse(readFileSync(file, "utf8")) as Messages;
}

describe.each(APPS)("%s message files", (app) => {
  const dir = join(app, "messages");
  const english = messageKeys(load(join(dir, "en.json"))).sort();

  it("has English messages", () => {
    expect(english.length).toBeGreaterThan(0);
  });

  const others = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json");
  it.each(others.length ? others : ["(none yet)"])("%s matches the English keys", (file) => {
    if (file === "(none yet)") return;
    expect(messageKeys(load(join(dir, file))).sort()).toEqual(english);
  });
});
