import { describe, expect, it } from "vitest";
import { createRegistry, type Job } from "./jobs.ts";

const job = (name: string): Job => ({ name, run: async () => {} });

describe("job registry", () => {
  it("starts empty", () => {
    expect(createRegistry().size).toBe(0);
  });

  it("registers jobs by name", () => {
    expect([...createRegistry([job("a"), job("b")]).keys()]).toEqual(["a", "b"]);
  });

  it("rejects duplicate job names", () => {
    expect(() => createRegistry([job("a"), job("a")])).toThrow("Duplicate job name: a");
  });
});
