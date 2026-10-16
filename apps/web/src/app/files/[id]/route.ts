import { canSeeArea, fileWithItem } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { fileStore } from "../../../server/files.ts";
import { featureOn, requireSignedIn, viewerAreas } from "../../../server/session.ts";

// Opens a library file for someone allowed to see its item: the item must
// be in one of their learning areas, and staff only open published items.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const ctx = await requireSignedIn();
  const { tenant, db, roles } = ctx;
  if (!/^[0-9a-f-]{36}$/.test(id) || !can(roles, "library.view") || !(await featureOn(tenant, "knowledge_library"))) {
    return new Response(null, { status: 404 });
  }
  const found = await fileWithItem(db, id);
  if (!found || (found.itemStatus !== "published" && !can(roles, "library.edit"))) return new Response(null, { status: 404 });
  if (!canSeeArea(await viewerAreas(ctx), found.itemAreaId)) return new Response(null, { status: 404 });
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
