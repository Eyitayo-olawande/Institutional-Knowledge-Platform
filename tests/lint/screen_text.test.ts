import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const RULE = "no-restricted-syntax";
const eslint = new ESLint();

async function ruleErrors(source: string, filePath: string): Promise<number> {
  const [result] = await eslint.lintText(source, { filePath });
  return result?.messages.filter((m) => m.ruleId === RULE).length ?? 0;
}

describe("no screen text in code lint rule", { timeout: 30_000 }, () => {
  it("blocks text typed into JSX in an app", async () => {
    expect(await ruleErrors("export const A = () => <p>Hello</p>;\n", "apps/web/src/a.tsx")).toBe(1);
  });

  it("allows text that comes from t()", async () => {
    const source = 'declare const t: (k: string) => string;\nexport const A = () => <p>{t("a.b")}</p>;\n';
    expect(await ruleErrors(source, "apps/web/src/a.tsx")).toBe(0);
  });

  it("blocks text typed into JSX in the design system", async () => {
    expect(await ruleErrors("export const A = () => <span>Save</span>;\n", "packages/ui/src/a.tsx")).toBe(1);
  });
});
