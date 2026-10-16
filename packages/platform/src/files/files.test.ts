import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { checkUpload, MAX_FILE_BYTES } from "./rules.ts";
import { localFolderStore } from "./store.ts";

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

describe("checkUpload", () => {
  it("accepts a real PDF and cleans the name", () => {
    expect(checkUpload("../Claims SOP<v2>.pdf", pdf)).toEqual({ ok: true, contentType: "application/pdf", name: ".._Claims SOPv2.pdf" });
  });

  it.each([
    ["empty.pdf", new Uint8Array(), "empty"],
    ["virus.exe", pdf, "type_not_allowed"],
    ["renamed.pdf", new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), "content_mismatch"],
    ["fake.mp4", new Uint8Array(12), "content_mismatch"],
  ])("refuses %s", (name, data, reason) => {
    expect(checkUpload(name, data)).toEqual({ ok: false, reason });
  });

  it("refuses files over the size limit", () => {
    expect(checkUpload("big.pdf", new Uint8Array(MAX_FILE_BYTES + 1))).toEqual({ ok: false, reason: "too_large" });
  });
});

describe("localFolderStore", () => {
  let root = "";
  afterAll(async () => root && rm(root, { recursive: true, force: true }));

  it("keeps each tenant's files in its own area", async () => {
    root = await mkdtemp(join(tmpdir(), "mantle-files-"));
    const store = localFolderStore(root);
    const a = await store.put("tenant-a", pdf);
    const b = await store.put("tenant-b", pdf);
    expect(a.sha256).toBe(b.sha256);
    expect(await store.get("tenant-a", a.key)).toEqual(pdf);
    await expect(store.get("tenant-b", a.key)).rejects.toThrow();
    expect((await readdir(root)).sort()).toEqual(["tenant-a", "tenant-b"]);
  });

  it("refuses path tricks in tenant ids and keys", async () => {
    const store = localFolderStore(root);
    await expect(store.get("../tenant-a", "x")).rejects.toThrow("Unsafe tenant id");
    await expect(store.get("tenant-a", "../../etc/passwd")).rejects.toThrow("Unsafe file key");
  });
});
