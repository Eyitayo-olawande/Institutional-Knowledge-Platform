import { describe, expect, it } from "vitest";
import { cleanName, isStructureKind, nameKey } from "./structure.ts";

describe("structure names", () => {
  it("match ignoring case and extra spaces", () => {
    expect(nameKey("  Claims   DEPT ")).toBe(nameKey("claims dept"));
    expect(nameKey("Claims")).not.toBe(nameKey("Claims Dept"));
  });

  it("are shown trimmed with single spaces, keeping their case", () => {
    expect(cleanName("  Motor\t claims ")).toBe("Motor claims");
  });

  it("only accept the four kinds", () => {
    expect(isStructureKind("role_level")).toBe(true);
    expect(isStructureKind("team")).toBe(false);
  });
});
