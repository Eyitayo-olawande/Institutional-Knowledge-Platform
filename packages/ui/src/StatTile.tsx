import type { CSSProperties, ReactNode } from "react";
import { Card } from "./Card.tsx";
import { colorVar, font } from "./tokens.ts";

// A summary tile such as "Modules completed: 12 of 19" on My Learning or the team view.
// All text comes from the caller.
export interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
}

const labelStyle: CSSProperties = { display: "block", fontSize: font.sizeXs, color: colorVar("textMuted") };
const valueStyle: CSSProperties = { display: "block", fontSize: "26px", fontWeight: font.weightBold, color: colorVar("text"), marginTop: "2px" };
const detailStyle: CSSProperties = { display: "block", fontSize: font.sizeXs, color: colorVar("textMuted") };

export function StatTile({ label, value, detail }: StatTileProps) {
  return (
    <Card style={{ padding: "20px" }}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
      {detail === undefined ? null : <span style={detailStyle}>{detail}</span>}
    </Card>
  );
}
