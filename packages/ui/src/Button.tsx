import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { color, font, radius, space, touchTarget } from "./tokens.ts";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const base: CSSProperties = {
  minHeight: touchTarget,
  padding: `${space.sm} ${space.md}`,
  borderRadius: radius.md,
  fontFamily: font.family,
  fontSize: font.sizeMd,
  cursor: "pointer",
};

const variants: Record<ButtonVariant, CSSProperties> = {
  primary: { background: color.primary, color: color.primaryText, border: "none" },
  secondary: { background: color.background, color: color.text, border: `1px solid ${color.border}` },
};

// Labels always come from the caller, so screen text stays in translation files.
export function Button({ variant = "primary", type = "button", style, ...rest }: ButtonProps) {
  return <button type={type} style={{ ...base, ...variants[variant], ...style }} {...rest} />;
}
