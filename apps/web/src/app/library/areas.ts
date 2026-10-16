import "server-only";
import { canSeeArea, listAreas, listContentTypes, type LearningArea, type TenantDb, type VisibleAreas } from "@mantle/db/tenant";
import { t } from "../../i18n.ts";

// The areas and content types a viewer can choose from or filter by.
export async function areaChoices(db: TenantDb, visible: VisibleAreas) {
  const [areas, types] = await Promise.all([listAreas(db), listContentTypes(db)]);
  return { areas: areas.filter((a) => canSeeArea(visible, a.id)), types };
}

// Common Staff Learning has a fixed name; a department area takes the
// department's name, so renaming the department renames its area.
export function areaName(area: Pick<LearningArea, "kind" | "departmentName">): string {
  return area.kind === "common" ? t("library.areas.common") : (area.departmentName ?? "");
}
