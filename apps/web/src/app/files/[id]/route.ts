import { needsConversion } from "@mantle/documents/convert";
import { fileStore } from "../../../server/files.ts";
import { openFile } from "../../../server/library_file_access.ts";

// Opens a library file in the browser, not as a download (ADR 0021): a PDF,
// PNG, JPG or MP4 is viewed from the original; a converted DOCX, PPTX or
// XLSX is viewed from its PDF rendition, never the original. A file still
// converting, or one that failed, has nothing to view yet. A file attached
// before this package shipped may have no conversionStatus recorded even
// though its type needs one; needsConversion is the source of truth, not
// conversionStatus alone, so that old data is never sent to the browser as
// a raw, unreadable Office file.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const opened = await openFile(id);
  if (!opened) return new Response(null, { status: 404 });
  const { tenant, found } = opened;
  const { file } = found;
  let viewable: { key: string; contentType: string } | null = null;
  if (!needsConversion(file.contentType)) {
    viewable = { key: file.storageKey, contentType: file.contentType };
  } else if (file.conversionStatus === "ready" && file.renditionKey) {
    viewable = { key: file.renditionKey, contentType: "application/pdf" };
  }
  if (!viewable) return new Response(null, { status: 404 });
  const data = await fileStore.get(tenant.id, viewable.key).catch(() => null);
  if (!data) return new Response(null, { status: 404 });
  return new Response(new Blob([new Uint8Array(data)]), {
    headers: {
      "content-type": viewable.contentType,
      "content-length": String(data.byteLength),
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}
