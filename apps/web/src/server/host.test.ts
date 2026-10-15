import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { requestHostFrom } = await import("./tenant.ts");

describe("requestHostFrom", () => {
  it("prefers the forwarded host Next.js keeps after a form action", () => {
    expect(requestHostFrom(new Headers({ host: "localhost:3000", "x-forwarded-host": "alpha.localhost:3000" }))).toBe(
      "alpha.localhost:3000",
    );
  });

  it("falls back to host", () => {
    expect(requestHostFrom(new Headers({ host: "beta.localhost:3000" }))).toBe("beta.localhost:3000");
  });
});
