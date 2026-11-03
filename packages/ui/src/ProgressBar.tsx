import type { CSSProperties } from "react";
import { colorVar, radius } from "./tokens.ts";

export interface ProgressBarProps {
  // Percentage complete, 0 to 100. Values outside the range are clamped.
  value: number;
  // Accessible name, from the caller's translation files.
  label: string;
  tone?: "success" | "primary";
}

const track: CSSProperties = {
  height: "8px",
  background: colorVar("borderSubtle"),
  borderRadius: radius.pill,
  overflow: "hidden",
};

export function ProgressBar({ value, label, tone = "success" }: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  const fill: CSSProperties = {
    width: `${percent}%`,
    height: "100%",
    background: tone === "primary" ? colorVar("primary") : colorVar("success"),
    borderRadius: radius.pill,
  };
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} style={track}>
      <div style={fill} />
    </div>
  );
}
