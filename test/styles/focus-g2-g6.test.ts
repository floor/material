import { describe, expect, test } from "bun:test";
import { compileString } from "sass";

const compileComponent = (component: string): string =>
  compileString(`@use "components/${component}";`, {
    loadPaths: ["src/styles"],
  }).css.replace(/\/\*[\s\S]*?\*\//g, "");

const topLevelRules = (css: string) =>
  Array.from(
    css
      .replace(/@media\s*\([^)]*\)\s*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, "")
      .matchAll(/([^{}]+)\{([^{}]*)\}/g)
  );

const forcedColorsBlocks = (css: string): string =>
  Array.from(
    css.matchAll(
      /@media\s*\(forced-colors:\s*active\)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g
    )
  )
    .map(([, inner]) => inner)
    .join("\n");

const declValue = (rulesText: string, selector: string, property: string) =>
  Array.from(rulesText.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter(([, selectors]) =>
      selectors.split(",").some((s) => s.trim() === selector)
    )
    .flatMap(([, , declarations]) =>
      Array.from(declarations.matchAll(/([\w-]+):\s*([^;]+);/g))
    )
    .filter(([, name]) => name === property)
    .map(([, , result]) => result.trim())
    .pop();

describe("G2 — Navigation Drawer keyboard focus", () => {
  const css = compileComponent("drawer");
  const top = topLevelRules(css)
    .map(([m]) => m)
    .join("\n");
  const hc = forcedColorsBlocks(css);

  test("draws a 3px secondary focus ring with 2px offset on .mtrl-drawer__item:focus-visible", () => {
    expect(declValue(top, ".mtrl-drawer__item:focus-visible", "outline")).toBe(
      "3px solid var(--mtrl-sys-color-secondary)"
    );
    expect(
      declValue(top, ".mtrl-drawer__item:focus-visible", "outline-offset")
    ).toBe("2px");
    expect(declValue(top, ".mtrl-drawer__item:focus-visible", "z-index")).toBe(
      "1"
    );
  });

  test("separates active selection from keyboard focus in forced-colors", () => {
    expect(
      declValue(
        hc,
        ".mtrl-drawer__item--active .mtrl-drawer__active-indicator",
        "outline"
      )
    ).toBe("2px solid Highlight");
    expect(
      declValue(
        hc,
        ".mtrl-drawer__item--active .mtrl-drawer__active-indicator",
        "outline-offset"
      )
    ).toBe("-2px");
    expect(declValue(hc, ".mtrl-drawer__item:focus-visible", "outline")).toBe(
      "3px solid CanvasText"
    );
    expect(
      declValue(hc, ".mtrl-drawer__item:focus-visible", "outline-offset")
    ).toBe("2px");
  });
});

describe("G3 — Slider handle keyboard focus", () => {
  const css = compileComponent("slider");
  const top = topLevelRules(css)
    .map(([m]) => m)
    .join("\n");
  const hc = forcedColorsBlocks(css);

  test("draws a 2px secondary focus ring on .mtrl-slider__handle:focus-visible::before while keeping the outer touch box unoutlined", () => {
    expect(declValue(top, ".mtrl-slider__handle:focus", "outline")).toBe("none");
    expect(
      declValue(top, ".mtrl-slider__handle:focus-visible::before", "outline")
    ).toBe("2px solid var(--mtrl-sys-color-secondary)");
    expect(
      declValue(
        top,
        ".mtrl-slider__handle:focus-visible::before",
        "outline-offset"
      )
    ).toBe("2px");
  });

  test("keeps the resting handle bar visible with ButtonText border and highlights focus in forced-colors without forced-color-adjust", () => {
    expect(declValue(hc, ".mtrl-slider__handle::before", "border")).toBe(
      "1px solid ButtonText"
    );
    expect(declValue(hc, ".mtrl-slider__handle::before", "box-sizing")).toBe(
      "border-box"
    );
    expect(
      declValue(hc, ".mtrl-slider__handle:focus-visible::before", "outline")
    ).toBe("2px solid Highlight");
    expect(
      declValue(
        hc,
        ".mtrl-slider__handle:focus-visible::before",
        "outline-offset"
      )
    ).toBe("2px");
    expect(hc).not.toContain("forced-color-adjust");
  });
});

describe("G4 — Search bar container keyboard focus", () => {
  const css = compileComponent("search");
  const top = topLevelRules(css)
    .map(([m]) => m)
    .join("\n");
  const hc = forcedColorsBlocks(css);
  const barFocusSelector =
    ".mtrl-search--bar.mtrl-search--focused:not(.mtrl-search--disabled) .mtrl-search__container";

  test("draws a 3px secondary focus ring and 10% state-layer blend on the collapsed bar container when the input is focused", () => {
    expect(declValue(top, barFocusSelector, "outline")).toBe(
      "3px solid var(--mtrl-sys-color-secondary)"
    );
    expect(declValue(top, barFocusSelector, "outline-offset")).toBe("2px");
    expect(declValue(top, barFocusSelector, "background-color")).toBe(
      "color-mix(in srgb, var(--mtrl-sys-color-on-surface) 10%, var(--mtrl-sys-color-surface-container-high))"
    );
  });

  test("draws a 3px Highlight outline on the collapsed bar container in forced-colors", () => {
    expect(declValue(hc, barFocusSelector, "outline")).toBe(
      "3px solid Highlight"
    );
    expect(declValue(hc, barFocusSelector, "outline-offset")).toBe("2px");
  });
});

describe("G5 — Filled TextField active indicator in forced-colors", () => {
  const css = compileComponent("text-field");
  const hc = forcedColorsBlocks(css);
  const filledFocusBefore =
    ".mtrl-text-field--filled.mtrl-text-field--focused .mtrl-text-field__field::before";

  test("replaces the stripped background-color bar with a 2px solid CanvasText border-top in forced-colors", () => {
    expect(declValue(hc, filledFocusBefore, "opacity")).toBe("1");
    expect(declValue(hc, filledFocusBefore, "background-color")).toMatch(
      /^transparent|rgba\(0,\s*0,\s*0,\s*0\)$/
    );
    expect(declValue(hc, filledFocusBefore, "height")).toBe("0");
    expect(declValue(hc, filledFocusBefore, "border-top")).toBe(
      "2px solid CanvasText"
    );
  });
});

describe("G6 — Navigation Bar & Navigation Rail active item focus in forced-colors", () => {
  for (const [label, component, prefix] of [
    ["Navigation Bar", "navigation-bar", ".mtrl-navigation-bar"],
    ["Navigation Rail", "navigation-rail", ".mtrl-navigation-rail"],
  ] as const) {
    test(`${label}: :focus-visible indicator rule follows --active indicator rule and draws 3px solid CanvasText`, () => {
      const css = compileComponent(component);
      const hc = forcedColorsBlocks(css);
      const activeSelector = `${prefix}__item--active ${prefix}__indicator`;
      const focusSelector = `${prefix}__item:focus-visible ${prefix}__indicator`;
      const activeFocusSelector = `${prefix}__item--active:focus-visible ${prefix}__indicator`;

      expect(declValue(hc, activeSelector, "outline")).toBe(
        "2px solid Highlight"
      );
      expect(declValue(hc, activeSelector, "outline-offset")).toBe("-2px");

      expect(declValue(hc, focusSelector, "outline")).toBe(
        "3px solid CanvasText"
      );
      expect(declValue(hc, focusSelector, "outline-offset")).toBe("2px");
      expect(declValue(hc, activeFocusSelector, "outline")).toBe(
        "3px solid CanvasText"
      );
      expect(declValue(hc, activeFocusSelector, "outline-offset")).toBe("2px");

      const activeIdx = hc.indexOf(activeSelector);
      const activeFocusIdx = hc.indexOf(activeFocusSelector);
      expect(activeIdx).toBeGreaterThanOrEqual(0);
      expect(activeFocusIdx).toBeGreaterThan(activeIdx);
    });
  }
});
