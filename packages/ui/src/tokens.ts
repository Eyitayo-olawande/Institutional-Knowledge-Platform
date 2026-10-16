// Design tokens shared by the customer app and the admin console.
// Phone first and light pages (Product Architecture v1.1, principle 06).
// Visual direction v1 from SUNU's brand, approved 16 October 2026 (ADR 0020).
// Brand values become tenant settings later; these are the defaults.

export const color = {
  // Text and surfaces
  text: "#1F2430",
  textMuted: "#5E6472",
  background: "#F6F7F9",
  surface: "#FFFFFF",
  surfaceRaised: "#FAFBFC",
  border: "#E4E6EB",
  borderSubtle: "#EEF0F3",
  // Brand: used for the brand and the one main action on a screen
  primary: "#BA0C2F",
  primaryHover: "#9A0A27",
  primaryTint: "#FBEAEE",
  primaryText: "#FFFFFF",
  accent: "#FF4255",
  // Status: always shown with a word as well as a colour
  success: "#1E7B4E",
  successTint: "#E7F4EC",
  warning: "#8F5500",
  warningTint: "#FFF4E0",
  danger: "#B23A0A",
  dangerTint: "#FDEDE4",
  info: "#2457A6",
  infoTint: "#E8EFFA",
  neutral: "#4A5060",
  neutralTint: "#EEF0F3",
  strong: "#14573A",
  strongTint: "#CFEBDB",
  // Module covers by path stage
  stageCommon: "#BA0C2F",
  stageDepartment: "#272B36",
  stageRole: "#2457A6",
  stageCertificate: "#8F5500",
} as const;

export const space = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
} as const;

export const font = {
  family: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  sizeXs: "13px",
  sizeSm: "14px",
  sizeMd: "16px",
  sizeLg: "18px",
  sizeXl: "24px",
  weightRegular: "400",
  weightMedium: "500",
  weightSemibold: "600",
  weightBold: "700",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  pill: "999px",
} as const;

export const shadow = {
  card: "0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08)",
} as const;

// Smallest touch target for phone screens.
export const touchTarget = "44px";

// Screens narrower than this use one column and bottom navigation.
export const phoneBreakpoint = "860px";

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
    ...toVars("shadow", shadow),
    `--mantle-touch_target: ${touchTarget};`,
  ].join("\n");
}

// WCAG contrast ratio between two hex colours. Tests use it to keep every
// text and background pair at AA (4.5 to 1) or better.
export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string): number => {
    const value = hex.replace("#", "");
    const weights = [0.2126, 0.7152, 0.0722];
    return weights.reduce((sum, weight, i) => {
      const c = parseInt(value.slice(i * 2, i * 2 + 2), 16) / 255;
      const linear = c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      return sum + weight * linear;
    }, 0);
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
