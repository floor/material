// test/components/timepicker-tokens.test.ts
//
// The token half of the time picker audit (N25). Every assertion names the
// token it comes from, because the audit's own wording said only "colour roles
// differ" and the source is what settles which role each element should take:
//
//   androidx compose material3 tokens/TimePickerTokens.kt
//   https://github.com/androidx/androidx/blob/androidx-main/compose/material3/
//     material3/src/commonMain/kotlin/androidx/compose/material3/tokens/
//     TimePickerTokens.kt
//
//   HeadlineColor                          = OnSurfaceVariant
//   HeadlineFont                           = LabelMedium
//   PeriodSelectorOutlineColor             = Outline
//   PeriodSelectorSelectedContainerColor   = TertiaryContainer
//   PeriodSelectorSelectedLabelTextColor   = OnTertiaryContainer
//   PeriodSelectorUnselectedLabelTextColor = OnSurfaceVariant
//   TimeSelectorSelectedContainerColor     = PrimaryContainer
//   TimeSelectorSelectedLabelTextColor     = OnPrimaryContainer
//   TimeSelectorUnselectedContainerColor   = SurfaceContainerHighest
//   TimeSelectorUnselectedLabelTextColor   = OnSurface
//   ClockDialColor                         = SurfaceContainerHighest
//   ClockDialSelectedLabelTextColor        = OnPrimary
//   ClockDialSelectorHandleContainerColor  = Primary
//
// The dial's tokens are checked in the compiled CSS, like the rest (FLO-279).

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileString } from "sass";

const root = join(import.meta.dir, "../..");

/** The component's stylesheet, compiled with the theme it depends on. */
const css = (() => {
  const source = `
    @use "${root}/src/styles/abstract/base" as base;
    @use "${root}/src/styles/components/timepicker";
  `;
  return compileString(source, { loadPaths: [root, join(root, "src/styles")] }).css;
})();

/**
 * The declarations of the rule whose selector is exactly `selector`.
 *
 * Exactly, because several of these class names are also prefixes of others
 * and appear again inside media queries — a loose match picks up a mobile
 * override rather than the rule that carries the token.
 */
const ruleFor = (selector: string): string => {
  const pattern = new RegExp(`(?:^|[},])\\s*${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\{([^}]*)\\}`, "m");
  return pattern.exec(css)?.[1] ?? "";
};


describe("time picker headline", () => {
  test("HeadlineColor is OnSurfaceVariant", () => {
    expect(ruleFor(".mtrl-time-picker__title")).toContain("on-surface-variant");
  });

  // The one the audit named: it was title-small.
  test("HeadlineFont is LabelMedium", () => {
    const rule = ruleFor(".mtrl-time-picker__title");
    // label-medium compiles to 12px/16px, 0.5px tracking, weight 500.
    // title-small, which it was, is 14px/20px at 0.1px.
    expect(rule).toContain("font-size: 12px");
    expect(rule).toContain("letter-spacing: 0.5px");
    expect(rule).not.toContain("font-size: 14px");
  });
});

describe("period selector colour roles", () => {
  test("PeriodSelectorOutlineColor is Outline, not OutlineVariant", () => {
    const rule = ruleFor(".mtrl-time-picker__period");
    expect(rule).toContain("color-outline)");
    expect(rule).not.toContain("outline-variant");
  });

  test("PeriodSelectorSelectedContainerColor is TertiaryContainer", () => {
    expect(ruleFor(".mtrl-time-picker__period--selected")).toContain("tertiary-container");
  });

  test("PeriodSelectorSelectedLabelTextColor is OnTertiaryContainer", () => {
    expect(ruleFor(".mtrl-time-picker__period--selected")).toContain("on-tertiary-container");
  });

  // Primary-container is the time selector's pair. Using it here is what made
  // AM/PM and the hour field look like the same control.
  test("the selected period does not borrow the time selector's colours", () => {
    const rule = ruleFor(".mtrl-time-picker__period--selected");
    expect(rule).not.toMatch(/on-primary-container|sys-color-primary-container/);
  });
});

describe("time selector colour roles", () => {
  test("TimeSelectorUnselectedContainerColor is SurfaceContainerHighest", () => {
    expect(css).toContain("surface-container-highest");
  });

  // It was a text-colour change only, so the active field was signalled by a
  // tint rather than the filled container the token describes.
  test("TimeSelectorSelectedContainerColor is PrimaryContainer", () => {
    expect(css).toContain("primary-container");
  });

  test("no selected state is drawn as a 10% primary tint", () => {
    expect(css).not.toMatch(/rgba\(var\(--mtrl-sys-color-primary-rgb[^)]*\),\s*0\.1\)/);
  });
});

describe("clock dial colour roles, now styled (FLO-279: the canvas is gone)", () => {
  test("ClockDialColor is SurfaceContainerHighest", () => {
    expect(ruleFor(".mtrl-time-picker__dial-face")).toContain("surface-container-highest");
  });

  test("ClockDialSelectorHandleContainerColor is Primary, a solid disc; the track and centre too", () => {
    for (const part of ["dial-handle", "dial-track", "dial-centre"]) expect(ruleFor(`.mtrl-time-picker__${part}`)).toContain("var(--mtrl-sys-color-primary)");
  });

  test("ClockDialSelectedLabelTextColor is OnPrimary, clipped to the handle", () => {
    const rule = ruleFor(".mtrl-time-picker__dial-numbers--selected");
    expect(rule).toContain("var(--mtrl-sys-color-on-primary)");
    expect(rule).toContain("clip-path: circle(24px");
  });

  test("the handle is 48dp, the track 2dp, the centre dot 8dp", () => {
    expect(ruleFor(".mtrl-time-picker__dial-handle")).toContain("width: 48px");
    expect(ruleFor(".mtrl-time-picker__dial-track")).toContain("width: 2px");
    // The centre dot is inset 4px either side of the middle: 8dp across.
    expect(ruleFor(".mtrl-time-picker__dial-centre")).toContain("inset: calc(50% - 4px)");
  });
});
