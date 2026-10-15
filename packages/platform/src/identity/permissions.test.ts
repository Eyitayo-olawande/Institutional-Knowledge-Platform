import { describe, expect, it } from "vitest";
import { ACTIONS, can, formatRoles, parseRoles, ROLES } from "./permissions.ts";

// Permission tests: each role tried against each action it must not
// perform (Development Roadmap v1, section 9).
const ALLOWED: Record<string, readonly string[]> = {
  learner: ["library.view"],
  line_manager: ["library.view"],
  content_owner: ["library.view", "library.edit"],
  compliance_reviewer: ["library.view"],
  learning_administrator: ACTIONS,
};

describe.each(ROLES)("role %s", (role) => {
  it.each(ACTIONS)(`is allowed or refused %s as designed`, (action) => {
    expect(can(role, action)).toBe((ALLOWED[role] ?? []).includes(action));
  });
});

describe("roles", () => {
  it("combine, ignoring unknown names", () => {
    expect(can("learner, learning_administrator", "people.import")).toBe(true);
    expect(can("learner,superuser", "people.import")).toBe(false);
    expect(can(undefined, "people.view")).toBe(false);
  });

  it("are stored in a fixed order without duplicates", () => {
    expect(formatRoles(["learning_administrator", "learner", "learner"])).toBe("learner,learning_administrator");
    expect(parseRoles("learner,,bogus,line_manager")).toEqual(["learner", "line_manager"]);
  });
});
