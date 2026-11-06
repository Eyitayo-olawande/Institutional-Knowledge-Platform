import type { CSSProperties, HTMLAttributes } from "react";
import { colorVar, radius, shadow, space } from "./tokens.ts";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  // flat: no shadow, for cards inside other cards or dense lists.
  flat?: boolean;
}

const base: CSSProperties = {
  background: colorVar("surface"),
  border: `1px solid ${colorVar("border")}`,
  borderRadius: radius.lg,
  padding: space.lg,
};

export function Card({ flat = false, style, ...rest }: CardProps) {
  return <div style={{ ...base, boxShadow: flat ? "none" : shadow.card, ...style }} {...rest} />;
}
