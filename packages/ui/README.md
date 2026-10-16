# packages/ui

Design system shared by the customer application and the admin console. Phone first and light pages. All screen text comes from translation files.

Epics: E1 (design system base), E15 (UX and visual design).

Visual direction v1 from SUNU's brand, approved 16 October 2026: see [ADR 0020](../../docs/adr/0020_visual_direction.md).

## Tokens

`color`, `space`, `font`, `radius`, `shadow`, `touchTarget` and `phoneBreakpoint`, exported as values and, through `cssVariables()`, as CSS variables named `--mantle-<group>-<name>`.

Rules:

* SUNU red (`color.primary`) is for the brand and the one main action on a screen.
* Risk and errors use `color.danger`, never the brand red.
* Status is always a word plus a colour (use `Badge`).
* Every text and background pair meets WCAG AA; `contrastRatio()` and the tests in `ui.test.tsx` check them.

## Components

| Component | Use |
| --- | --- |
| `Button` | `primary` for the main action, `secondary` for others, `ghost` for text link actions; `md` or `sm`, both at least 44px tall |
| `Badge` | Status words: success, info, neutral, warning, danger, brand, strong |
| `Card` | Surfaces; `flat` removes the shadow |
| `ProgressBar` | Progress from 0 to 100 with an accessible label |
| `StatTile` | Summary tiles such as modules completed |
