import "server-only";
import { canSeeArea, fileWithItem } from "@mantle/db/tenant";
import { can } from "@mantle/platform/identity";
import { featureOn, requireSignedIn, viewerAreas } from "./session.ts";

const ID = /^[0-9a-f-]{36}$/;

// Shared checks for both opening a library file in the browser and
// downloading its original (ADR 0021): the item must be in one of the
// viewer's learning areas, and staff only open published items unless they
// can edit the library.
export async function openFile(id: string) {
  if (!ID.test(id)) return null;
  const ctx = await requireSignedIn();
  const { tenant, db, roles } = ctx;
  if (!can(roles, "library.view") || !(await featureOn(tenant, "knowledge_library"))) return null;
  const found = await fileWithItem(db, id);
  if (!found || (found.itemStatus !== "published" && !can(roles, "library.edit"))) return null;
  if (!canSeeArea(await viewerAreas(ctx), found.itemAreaId)) return null;
  return { tenant, roles, found };
}
