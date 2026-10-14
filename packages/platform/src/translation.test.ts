import { describe, expect, it } from "vitest";
import { createTranslator, messageKeys } from "./translation.ts";

const en = { app: { title: "Mantle", greeting: "Hello {name}" }, only: { english: "Yes" } };
const fr = { app: { title: "Mantle FR", greeting: "Bonjour {name}" } };

describe("createTranslator", () => {
  it("looks up nested keys", () => {
    expect(createTranslator(en)("app.title")).toBe("Mantle");
  });

  it("fills in parameters", () => {
    expect(createTranslator(en)("app.greeting", { name: "Ada" })).toBe("Hello Ada");
  });

  it("leaves unknown parameters visible", () => {
    expect(createTranslator(en)("app.greeting")).toBe("Hello {name}");
  });

  it("falls back to English when a locale lacks a key", () => {
    const t = createTranslator(fr, en);
    expect(t("app.title")).toBe("Mantle FR");
    expect(t("only.english")).toBe("Yes");
  });

  it("returns the key when no message exists", () => {
    expect(createTranslator(en)("app.missing")).toBe("app.missing");
  });
});

describe("messageKeys", () => {
  it("lists every dotted key", () => {
    expect(messageKeys(en)).toEqual(["app.title", "app.greeting", "only.english"]);
  });
});
