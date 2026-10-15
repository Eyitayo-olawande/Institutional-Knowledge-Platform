import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// File storage (ADR 0007): S3 compatible object storage in production, one
// area and key per tenant. Development uses a local folder with the same
// shape: one sub folder per tenant, objects named by random keys.

export interface StoredObject {
  readonly key: string;
  readonly size: number;
  readonly sha256: string;
}

export interface FileStore {
  put(tenantId: string, data: Uint8Array): Promise<StoredObject>;
  get(tenantId: string, key: string): Promise<Uint8Array>;
  remove(tenantId: string, key: string): Promise<void>;
}

const SAFE = /^[a-zA-Z0-9-]{1,64}$/;

function check(part: string, what: string): string {
  if (!SAFE.test(part)) throw new Error(`Unsafe ${what}.`);
  return part;
}

export function localFolderStore(root = process.env.MANTLE_FILES_DIR || ".data/files"): FileStore {
  const base = resolve(root);
  const path = (tenantId: string, key: string) => join(base, check(tenantId, "tenant id"), check(key, "file key"));
  return {
    async put(tenantId, data) {
      if (process.env.NODE_ENV === "production") throw new Error("The local file store is for development only.");
      const key = randomUUID();
      await mkdir(join(base, check(tenantId, "tenant id")), { recursive: true });
      await writeFile(path(tenantId, key), data, { flag: "wx" });
      return { key, size: data.byteLength, sha256: createHash("sha256").update(data).digest("hex") };
    },
    async get(tenantId, key) {
      return new Uint8Array(await readFile(path(tenantId, key)));
    },
    async remove(tenantId, key) {
      await rm(path(tenantId, key), { force: true });
    },
  };
}
