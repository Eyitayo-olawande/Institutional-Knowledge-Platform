import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { CONVERTIBLE_EXTENSIONS } from "./rules.ts";

const run = promisify(execFile);
const TIMEOUT_MS = 30_000;

export interface Converter {
  // Converts an uploaded file to PDF bytes, so it can be viewed the same way
  // as a native PDF (ADR 0021). Throws if the content type has no
  // conversion rule, or if the conversion itself fails or times out.
  convert(data: Uint8Array, contentType: string): Promise<Uint8Array>;
}

// Shells out to LibreOffice in headless mode. LibreOffice must be installed
// wherever this runs (development, CI and production), the same category of
// requirement as Postgres.app in local development.
export function sofficeConverter(binary = process.env.MANTLE_SOFFICE_BIN || "soffice"): Converter {
  return {
    async convert(data, contentType) {
      const extension = CONVERTIBLE_EXTENSIONS[contentType];
      if (!extension) throw new Error(`No conversion rule for content type: ${contentType}.`);
      const dir = await mkdtemp(join(tmpdir(), "mantle-convert-"));
      try {
        const input = join(dir, `${randomUUID()}.${extension}`);
        await writeFile(input, data);
        await run(binary, ["--headless", "--convert-to", "pdf", "--outdir", dir, input], { timeout: TIMEOUT_MS });
        const output = input.slice(0, -extension.length) + "pdf";
        return new Uint8Array(await readFile(output));
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  };
}
