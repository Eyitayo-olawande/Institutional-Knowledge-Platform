import { describe, expect, it } from "vitest";
import { needsConversion } from "./rules.ts";

describe("needsConversion", () => {
  it("is true for the three Office formats", () => {
    expect(needsConversion("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
    expect(needsConversion("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(true);
    expect(needsConversion("application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe(true);
  });

  it("is false for formats viewed from the original", () => {
    expect(needsConversion("application/pdf")).toBe(false);
    expect(needsConversion("image/png")).toBe(false);
    expect(needsConversion("image/jpeg")).toBe(false);
    expect(needsConversion("video/mp4")).toBe(false);
  });

  it("is false for an unknown content type", () => {
    expect(needsConversion("application/octet-stream")).toBe(false);
  });
});
