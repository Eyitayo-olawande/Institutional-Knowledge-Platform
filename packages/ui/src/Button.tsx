import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { color, font, radius, space, touchTarget } from "./tokens.ts";

// primary: the one main action on a screen (SUNU red).
// secondary: other actions. ghost: a text link styled action.
export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const base: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: space.sm,
  minHeight: touchTarget,
  padding: `0 ${space.md}`,
  borderRadius: radius.md,
  fontFamily: font.family,
  fontSize: font.sizeMd,
  fontWeight: font.weightSemibold,
  cursor: "pointer",
};

const variants: Record<ButtonVariant, CSSProperties> = {
  primary: { background: color.primary, color: color.primaryText, border: "1px solid transparent" },
  secondary: { background: color.surface, color: color.text, border: `1px solid ${color.border}` },
  ghost: { background: "transparent", color: color.primary, border: "1px solid transparent", padding: `0 ${space.sm}` },
};

// The small size is for dense tables only; it stays at the phone touch target height.
const sizes: Record<ButtonSize, CSSProperties> = {
  md: {},
  sm: { fontSize: font.sizeSm, padding: `0 ${space.md}` },
};

// The same look for a link that navigates (a link must not wrap a button).
export function buttonStyle(variant: ButtonVariant = "primary", size: ButtonSize = "md"): CSSProperties {
  return { ...base, ...variants[variant], ...sizes[size], textDecoration: "none" };
}

// Labels always come from the caller, so screen text stays in translation files.
export function Button({ variant = "primary", size = "md", type = "button", style, ...rest }: ButtonProps) {
  return <button type={type} style={{ ...base, ...variants[variant], ...sizes[size], ...style }} {...rest} />;
}
