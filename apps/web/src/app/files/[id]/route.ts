import { fileWithItem } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { fileStore } from "../../../server/files.ts";
import { featureOn, requireSignedIn } from "../../../server/session.ts";

// Opens a library file for someone allowed to see its item: staff only for
// published items, editors for any item in their own organisation.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const { tenant, db, roles } = await requireSignedIn();
  if (!/^[0-9a-f-]{36}$/.test(id) || !can(roles, "library.view") || !(await featureOn(tenant, "knowledge_library"))) {
    return new Response(null, { status: 404 });
  }
  const found = await fileWithItem(db, id);
  if (!found || (found.itemStatus !== "published" && !can(roles, "library.edit"))) return new Response(null, { status: 404 });
  const data = await fileStore.get(tenant.id, found.file.storageKey).catch(() => null);
  if (!data) return new Response(null, { status: 404 });
  return new Response(new Blob([new Uint8Array(data)]), {
    headers: {
      "content-type": found.file.contentType,
      "content-length": String(data.byteLength),
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(found.file.name)}`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}
