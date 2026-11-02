import { describe, expect, it } from "vitest";
import { addDays, computePathStatus, isStageUnlocked } from "./paths.ts";

describe("addDays", () => {
  it("adds whole days to a YYYY-MM-DD date", () => {
    expect(addDays("2026-01-01", 14).toISOString().slice(0, 10)).toBe("2026-01-15");
  });

  it("crosses a month end correctly", () => {
    expect(addDays("2026-01-20", 42).toISOString().slice(0, 10)).toBe("2026-03-03");
  });
});

const stage = (kind: "common" | "department" | "role" | "certificate", dueInDays: number, complete: boolean, today: Date) => ({
  kind,
  dueDate: new Date(today.getTime() + dueInDays * 86_400_000),
  complete,
});

describe("computePathStatus", () => {
  const today = new Date("2026-06-01T00:00:00Z");

  it("is completed once every stage is complete", () => {
    const stages = (["common", "department", "role", "certificate"] as const).map((k) => stage(k, -5, true, today));
    expect(computePathStatus({ stages, anyModuleComplete: true, today })).toBe("completed");
  });

  it("is overdue once the current stage's due date has passed", () => {
    const stages = [stage("common", -1, false, today)];
    expect(computePathStatus({ stages, anyModuleComplete: false, today })).toBe("overdue");
  });

  it("is due soon within 7 days of the current stage", () => {
    const stages = [stage("common", 5, false, today)];
    expect(computePathStatus({ stages, anyModuleComplete: false, today })).toBe("due_soon");
  });

  it("is not started with no progress and no urgency", () => {
    const stages = [stage("common", 14, false, today)];
    expect(computePathStatus({ stages, anyModuleComplete: false, today })).toBe("not_started");
  });

  it("is in progress once something is complete but the path is not", () => {
    const stages = [stage("common", 14, false, today)];
    expect(computePathStatus({ stages, anyModuleComplete: true, today })).toBe("in_progress");
  });
});

describe("isStageUnlocked", () => {
  it("common is always unlocked", () => {
    expect(isStageUnlocked([], "common")).toBe(true);
  });

  it("department stays locked until common is complete", () => {
    const stages = [{ kind: "common" as const, complete: false }];
    expect(isStageUnlocked(stages, "department")).toBe(false);
  });

  it("department unlocks once common is complete", () => {
    const stages = [{ kind: "common" as const, complete: true }];
    expect(isStageUnlocked(stages, "department")).toBe(true);
  });

  it("a stage with no modules yet does not block the one after it", () => {
    // every() on an empty array is true, so an empty stage counts as complete.
    const stages = [{ kind: "common" as const, complete: true }];
    expect(isStageUnlocked(stages, "department")).toBe(true);
  });
});
