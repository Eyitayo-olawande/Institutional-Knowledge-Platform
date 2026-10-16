import type { LearningArea } from "@mantle/db/tenant";
import { t } from "../../i18n.ts";
import { areaName } from "./areas.ts";

interface TypeChoice {
  readonly id: string;
  readonly areaKind: "common" | "department";
  readonly label: string;
}

// Area and content type selects for the new item and item pages. Types are
// grouped by the kind of area they suit; the server refuses a mismatch.
export function PlacementFields({
  areas,
  types,
  areaId,
  contentTypeId,
}: {
  areas: readonly LearningArea[];
  types: readonly TypeChoice[];
  areaId?: string;
  contentTypeId?: string;
}) {
  return (
    <>
      <label className="field">
        {t("library.fields.area")}
        <select className="input" name="areaId" required defaultValue={areaId ?? ""}>
          <option value="" disabled>{t("library.fields.choose")}</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{areaName(a)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        {t("library.fields.content_type")}
        <select className="input" name="contentTypeId" required defaultValue={contentTypeId ?? ""}>
          <option value="" disabled>{t("library.fields.choose")}</option>
          {(["common", "department"] as const).map((kind) => (
            <optgroup key={kind} label={t(`library.areas.types_for.${kind}`)}>
              {types
                .filter((ty) => ty.areaKind === kind)
                .map((ty) => (
                  <option key={ty.id} value={ty.id}>{ty.label}</option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
    </>
  );
}
