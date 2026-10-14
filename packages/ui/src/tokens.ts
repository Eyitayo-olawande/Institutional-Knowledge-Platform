// Design tokens shared by the customer app and the admin console.
// Phone first and light pages (Product Architecture v1, principle 06).
// Visual direction is set by the designer in weeks 1 and 2; these values
// are neutral placeholders until then.

export const color = {
  text: "#1a1a1a",
  textMuted: "#5c5c5c",
  background: "#ffffff",
  surface: "#f5f5f5",
  border: "#d9d9d9",
  primary: "#1f4e79",
  primaryText: "#ffffff",
  danger: "#b42318",
  success: "#027a48",
} as const;

export const space = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
} as const;

export const font = {
  family: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  sizeSm: "14px",
  sizeMd: "16px",
  sizeLg: "20px",
  sizeXl: "24px",
} as const;

export const radius = {
  sm: "4px",
  md: "8px",
} as const;

// Smallest touch target for phone screens.
export const touchTarget = "44px";

type TokenGroup = Record<string, string>;

function toVars(prefix: string, group: TokenGroup): string[] {
  return Object.entries(group).map(
    ([key, value]) => `--mantle-${prefix}-${key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}: ${value};`,
  );
}

export function cssVariables(): string {
  return [
    ...toVars("color", color),
    ...toVars("space", space),
    ...toVars("font", font),
    ...toVars("radius", radius),
    `--mantle-touch_target: ${touchTarget};`,
  ].join("\n");
}
