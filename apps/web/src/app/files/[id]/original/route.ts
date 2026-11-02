import { can } from "@mantle/platform/identity";
import { fileStore } from "../../../../server/files.ts";
import { openFile } from "../../../../server/library_file_access.ts";

// Downloads the original file exactly as uploaded, so a content owner can
// re-edit it in its native application. A learner never reaches this route
// (ADR 0021): the same checks as the viewer apply, plus library.edit.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const opened = await openFile(id);
  if (!opened || !can(opened.roles, "library.edit")) return new Response(null, { status: 404 });
  const { tenant, found } = opened;
  const { file } = found;
  const data = await fileStore.get(tenant.id, file.storageKey).catch(() => null);
  if (!data) return new Response(null, { status: 404 });
  return new Response(new Blob([new Uint8Array(data)]), {
    headers: {
      "content-type": file.contentType,
      "content-length": String(data.byteLength),
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}
