import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Badge,
  badgeColors,
  Button,
  buttonStyle,
  Card,
  color,
  colorVar,
  contrastRatio,
  cssVariables,
  ProgressBar,
  ProgressRing,
  StatTile,
  touchTarget,
} from "./index.ts";

const AA = 4.5;

describe("Button", () => {
  it("renders the caller's label and defaults to a non submitting button", () => {
    const html = renderToStaticMarkup(<Button>Save</Button>);
    expect(html).toContain(">Save</button>");
    expect(html).toContain('type="button"');
  });

  it("meets the phone touch target size in every size", () => {
    expect(renderToStaticMarkup(<Button>Go</Button>)).toContain(`min-height:${touchTarget}`);
    expect(renderToStaticMarkup(<Button size="sm">Go</Button>)).toContain(`min-height:${touchTarget}`);
  });

  it("uses the brand colour for the primary action", () => {
    expect(renderToStaticMarkup(<Button>Go</Button>)).toContain(`background:${colorVar("primary")}`);
  });

  it("repaints from the shared CSS variable, not a hardcoded hex, so a tenant theme reaches it", () => {
    const html = renderToStaticMarkup(<Button>Go</Button>);
    expect(html).toContain("var(--mantle-color-primary)");
    expect(html).not.toContain(color.primary);
  });
});

describe("buttonStyle", () => {
  it("gives a link the button look and touch target", () => {
    expect(buttonStyle().minHeight).toBe(touchTarget);
    expect(buttonStyle("secondary").background).toBe(colorVar("surface"));
    expect(buttonStyle().textDecoration).toBe("none");
  });
});

describe("Badge", () => {
  it("shows the caller's word, not colour alone", () => {
    const html = renderToStaticMarkup(<Badge tone="success">Completed</Badge>);
    expect(html).toContain("Completed");
    expect(html).toContain(`color:${colorVar("success")}`);
  });
});

describe("Card", () => {
  it("drops the shadow when flat", () => {
    expect(renderToStaticMarkup(<Card flat />)).toContain("box-shadow:none");
  });
});

describe("ProgressBar", () => {
  it("clamps the value and exposes it to assistive technology", () => {
    const html = renderToStaticMarkup(<ProgressBar value={140} label="Path progress" />);
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('aria-label="Path progress"');
    expect(html).toContain("width:100%");
  });
});

describe("ProgressRing", () => {
  it("clamps the value and exposes it to assistive technology", () => {
    const html = renderToStaticMarkup(<ProgressRing value={140} label="Path progress" />);
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('aria-label="Path progress"');
  });

  it("shows the caller's caption, not a hardcoded percent sign", () => {
    const withCaption = renderToStaticMarkup(<ProgressRing value={75} label="Path progress" caption="75%" />);
    expect(withCaption).toContain("75%");
    const withoutCaption = renderToStaticMarkup(<ProgressRing value={75} label="Path progress" />);
    expect(withoutCaption).not.toContain("<span");
  });
});

describe("StatTile", () => {
  it("renders label, value and optional detail from the caller", () => {
    const html = renderToStaticMarkup(<StatTile label="Modules completed" value="12" detail="of 19" />);
    expect(html).toContain("Modules completed");
    expect(html).toContain("of 19");
    expect(renderToStaticMarkup(<StatTile label="A" value="1" />)).not.toContain("undefined");
  });
});

describe("tokens", () => {
  it("exposes every token as a CSS variable", () => {
    const css = cssVariables();
    expect(css).toContain(`--mantle-color-primary: ${color.primary};`);
    expect(css).toContain("--mantle-color-primary_text: #FFFFFF;");
    expect(css).toContain("--mantle-shadow-card:");
    expect(css).toContain("--mantle-touch_target: 44px;");
  });

  it("uses SUNU's brand red as the primary colour", () => {
    expect(color.primary).toBe("#BA0C2F");
  });

  it("points colorVar at the same variable name cssVariables() defines", () => {
    expect(colorVar("primaryHover")).toBe("var(--mantle-color-primary_hover)");
    expect(cssVariables()).toContain(`--mantle-color-primary_hover: ${color.primaryHover};`);
  });

  it("keeps risk and errors visibly different from the brand red", () => {
    expect(color.danger).not.toBe(color.primary);
  });
});

describe("contrast (WCAG AA)", () => {
  it("calculates known ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it.each([
    ["body text on page", color.text, color.background],
    ["body text on cards", color.text, color.surface],
    ["muted text on page", color.textMuted, color.background],
    ["muted text on cards", color.textMuted, color.surface],
    ["primary button text", color.primaryText, color.primary],
    ["primary button text on hover", color.primaryText, color.primaryHover],
    ["brand links on cards", color.primary, color.surface],
    ["brand text on brand tint", color.primary, color.primaryTint],
    ["text on common stage cover", color.primaryText, color.stageCommon],
    ["text on department stage cover", color.primaryText, color.stageDepartment],
    ["text on role stage cover", color.primaryText, color.stageRole],
    ["text on certificate stage cover", color.primaryText, color.stageCertificate],
  ])("%s passes AA", (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA);
  });

  it.each(Object.entries(badgeColors))("%s badge text passes AA", (_tone, colors) => {
    expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(AA);
  });
});
