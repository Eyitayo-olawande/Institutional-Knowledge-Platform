import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sofficeConverter } from "./soffice.ts";

// LibreOffice is a local/CI/production requirement for this conversion
// (ADR 0021), the same category as Postgres.app in local development. This
// test is skipped, not failed, where the binary is not installed.
const run = promisify(execFile);
const binary = process.env.MANTLE_SOFFICE_BIN || "soffice";
const available = await run(binary, ["--version"])
  .then(() => true)
  .catch(() => false);

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const docxType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe.skipIf(!available)("sofficeConverter", { timeout: 30_000 }, () => {
  it("converts a DOCX to PDF bytes", async () => {
    const data = await readFile(join(fixtures, "sample.docx"));
    const pdf = await sofficeConverter().convert(new Uint8Array(data), docxType);
    expect(pdf.byteLength).toBeGreaterThan(0);
    expect(String.fromCharCode(...pdf.slice(0, 5))).toBe("%PDF-");
  });

  it("rejects a content type it has no rule for", async () => {
    await expect(sofficeConverter().convert(new Uint8Array([1, 2, 3]), "image/png")).rejects.toThrow("No conversion rule");
  });
});
