// Upload rules (Product Architecture v1, section 9): file types and sizes
// limited, and every file scanned for malware before anyone can open it.

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 10;

// Type allowed by extension and by the first bytes of the file, so a
// renamed executable is refused.
const TYPES: Record<string, { contentType: string; magic: number[][] }> = {
  pdf:  { contentType: "application/pdf", magic: [[0x25, 0x50, 0x44, 0x46]] },
  docx: { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: [[0x50, 0x4b, 0x03, 0x04]] },
  xlsx: { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", magic: [[0x50, 0x4b, 0x03, 0x04]] },
  pptx: { contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", magic: [[0x50, 0x4b, 0x03, 0x04]] },
  // Legacy binary PowerPoint format — OLE2 Compound Document magic (same container as .doc/.xls)
  ppt:  { contentType: "application/vnd.ms-powerpoint", magic: [[0xd0, 0xcf, 0x11, 0xe0]] },
  png:  { contentType: "image/png", magic: [[0x89, 0x50, 0x4e, 0x47]] },
  jpg:  { contentType: "image/jpeg", magic: [[0xff, 0xd8, 0xff]] },
  jpeg: { contentType: "image/jpeg", magic: [[0xff, 0xd8, 0xff]] },
  mp4:  { contentType: "video/mp4", magic: [] },
};

// Single source of truth for the browser file-input accept attribute and any
// server-side display of supported formats.
export const ACCEPT_ATTR = Object.keys(TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

export type FileCheck =
  | { readonly ok: true; readonly contentType: string; readonly name: string }
  | { readonly ok: false; readonly reason: "empty" | "too_large" | "type_not_allowed" | "content_mismatch" };

export function checkUpload(name: string, data: Uint8Array): FileCheck {
  const clean = name.replace(/[\\/]/g, "_").replace(/[^\p{L}\p{N} ._()-]/gu, "").trim().slice(0, 200) || "file";
  if (data.byteLength === 0) return { ok: false, reason: "empty" };
  if (data.byteLength > MAX_FILE_BYTES) return { ok: false, reason: "too_large" };
  const ext = clean.toLowerCase().split(".").pop() ?? "";
  const type = TYPES[ext];
  if (!type) return { ok: false, reason: "type_not_allowed" };
  if (ext === "mp4") {
    // ISO media files carry "ftyp" at byte 4.
    const ftyp = String.fromCharCode(...data.slice(4, 8));
    if (ftyp !== "ftyp") return { ok: false, reason: "content_mismatch" };
  } else if (!type.magic.some((m) => m.every((byte, i) => data[i] === byte))) {
    return { ok: false, reason: "content_mismatch" };
  }
  return { ok: true, contentType: type.contentType, name: clean };
}

// Malware scanning. The scanner is not chosen yet (see docs/adr); until it
// is, development skips the scan and production refuses uploads.
export interface Scanner {
  scan(data: Uint8Array): Promise<"clean" | "infected">;
}

export function developmentScanner(): Scanner {
  return {
    async scan() {
      if (process.env.NODE_ENV === "production") throw new Error("No malware scanner configured.");
      return "clean";
    },
  };
}
