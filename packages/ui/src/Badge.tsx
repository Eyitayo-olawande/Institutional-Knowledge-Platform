import type { CSSProperties, HTMLAttributes } from "react";
import { color, font, radius, space } from "./tokens.ts";

// Status is always a word plus a colour, never colour alone (ADR 0020).
// success: Completed, Certified. info: In progress. neutral: Not started.
// warning: Due soon. danger: Overdue, risk. brand: Updated.
// The four knowledge levels use danger, warning, success and strong.
export type BadgeTone = "success" | "info" | "neutral" | "warning" | "danger" | "brand" | "strong";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export const badgeColors: Record<BadgeTone, { foreground: string; background: string }> = {
  success: { foreground: color.success, background: color.successTint },
  info: { foreground: color.info, background: color.infoTint },
  neutral: { foreground: color.neutral, background: color.neutralTint },
  warning: { foreground: color.warning, background: color.warningTint },
  danger: { foreground: color.danger, background: color.dangerTint },
  brand: { foreground: color.primary, background: color.primaryTint },
  strong: { foreground: color.strong, background: color.strongTint },
};

const base: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: space.xs,
  padding: `2px 10px`,
  borderRadius: radius.pill,
  fontFamily: font.family,
  fontSize: font.sizeXs,
  fontWeight: font.weightSemibold,
  whiteSpace: "nowrap",
};

const dot: CSSProperties = { width: "7px", height: "7px", borderRadius: "50%", background: "currentColor" };

export function Badge({ tone = "neutral", style, children, ...rest }: BadgeProps) {
  const colors = badgeColors[tone];
  return (
    <span style={{ ...base, color: colors.foreground, background: colors.background, ...style }} {...rest}>
      <span aria-hidden="true" style={dot} />
      {children}
    </span>
  );
}
