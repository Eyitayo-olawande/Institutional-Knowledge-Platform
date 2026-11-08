import type { CSSProperties, ReactNode } from "react";
import { colorVar, font } from "./tokens.ts";

export interface ProgressRingProps {
  // Percentage complete, 0 to 100. Values outside the range are clamped.
  value: number;
  // Accessible name, from the caller's translation files.
  label: string;
  // Text shown in the centre of the ring, such as "75%" — from the caller,
  // so wording and number formatting stay in translation files.
  caption?: ReactNode;
  tone?: "success" | "primary";
  size?: number;
}

const STROKE = 8;

const wrap = (size: number): CSSProperties => ({
  position: "relative",
  display: "inline-flex",
  width: size,
  height: size,
});

const captionStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: font.sizeLg,
  fontWeight: font.weightBold,
  color: colorVar("text"),
};

export function ProgressRing({ value, label, caption, tone = "success", size = 96 }: ProgressRingProps) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const center = size / 2;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      style={wrap(size)}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={colorVar("borderSubtle")} strokeWidth={STROKE} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={tone === "primary" ? colorVar("primary") : colorVar("success")}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {caption === undefined ? null : <span style={captionStyle}>{caption}</span>}
    </div>
  );
}
