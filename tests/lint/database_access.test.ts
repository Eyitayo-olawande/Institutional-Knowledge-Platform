import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const RULE = "no-restricted-imports";
const SOURCE = 'import { Pool } from "pg";\nexport const pool = new Pool();\n';

// Loading the ESLint config is slow on first use, so share one instance.
const eslint = new ESLint();

async function ruleErrors(filePath: string): Promise<number> {
  const [result] = await eslint.lintText(SOURCE, { filePath });
  return result?.messages.filter((m) => m.ruleId === RULE).length ?? 0;
}

describe("direct database access lint rule", { timeout: 30_000 }, () => {
  it("blocks database drivers in an app", async () => {
    expect(await ruleErrors("apps/web/src/example.ts")).toBe(1);
  });

  it("blocks database drivers in a shared package", async () => {
    expect(await ruleErrors("packages/core/src/example.ts")).toBe(1);
  });

  it("allows database drivers inside packages/db", async () => {
    expect(await ruleErrors("packages/db/src/example.ts")).toBe(0);
  });
});
