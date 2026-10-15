import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { hasRole } = await import("./session.ts");

describe("hasRole", () => {
  it("matches a whole role name in the list", () => {
    expect(hasRole("learner, learning_administrator", "learning_administrator")).toBe(true);
    expect(hasRole("learner", "learning_administrator")).toBe(false);
    expect(hasRole("learning_administrator_x", "learning_administrator")).toBe(false);
    expect(hasRole(undefined, "learner")).toBe(false);
  });
});
