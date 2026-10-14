import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, cssVariables, touchTarget } from "./index.ts";

describe("Button", () => {
  it("renders the caller's label and defaults to a non submitting button", () => {
    const html = renderToStaticMarkup(<Button>Save</Button>);
    expect(html).toContain(">Save</button>");
    expect(html).toContain('type="button"');
  });

  it("meets the phone touch target size", () => {
    expect(renderToStaticMarkup(<Button>Go</Button>)).toContain(`min-height:${touchTarget}`);
  });
});

describe("tokens", () => {
  it("exposes every token as a CSS variable", () => {
    const css = cssVariables();
    expect(css).toContain("--mantle-color-primary: #1f4e79;");
    expect(css).toContain("--mantle-color-primary_text: #ffffff;");
    expect(css).toContain("--mantle-touch_target: 44px;");
  });
});
