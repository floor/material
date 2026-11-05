// test/styles/dead-component-css.test.ts
//
// Dead component CSS rules across the 6 component stylesheets that carried
// selectors no factory, feature, custom element or exported helper in src/
// ever produces. The tests job has no dist/, so this compiles the exact
// sources scripts/build-styles.ts uses for:
//   - dist/styles.css (directionArmsPrelude() + main),
//   - dist/styles/<name>.css (directionArmsPrelude() + components/<name>), and
//   - dist/elements/css/<name>.css (components/<name> with logical properties).
import { describe, expect, test } from "bun:test";
import * as sass from "sass";
import { directionArmsPrelude } from "../../scripts/build-styles";

const options: sass.StringOptions<"sync"> = {
  loadPaths: ["src/styles"],
  style: "compressed",
  logger: sass.Logger.silent,
};

const compileFull = (): string =>
  sass.compileString(`${directionArmsPrelude()}@use "main" as entry0;`, options).css;

const compileComponent = (name: string): string =>
  sass.compileString(`${directionArmsPrelude()}@use "components/${name}" as entry0;`, options).css;

const compileElement = (name: string): string =>
  sass.compileString(`@use "components/${name}";`, options).css;

/**
 * The 14 dead selector groups removed across the 6 component stylesheets,
 * keyed by component name (`src/styles/components/_<name>.scss`).
 */
const REMOVED_BY_COMPONENT: Record<string, string[]> = {
  dialog: [
    ".mtrl-dialog__icon",
    ".mtrl-dialog__icon-content",
    ".mtrl-dialog__icon+.mtrl-dialog__header",
    ".mtrl-dialog__content--scrollable",
    ".mtrl-dialog__content--emphasis",
    ".mtrl-dialog__overlay.mtrl-dialog--fullscreen",
  ],
  menu: [
    ".mtrl-menu--position-top-start",
    ".mtrl-menu--position-top-end",
  ],
  select: [
    ".mtrl-select--open .mtrl-text-field--filled",
    ".mtrl-select--open .mtrl-text-field--outlined",
    ".mtrl-select--disabled",
    ".mtrl-select--error",
    ".mtrl-select--small",
    ".mtrl-select--large",
  ],
  slider: [
    ".mtrl-slider--discrete .mtrl-slider__tick",
  ],
  tabs: [
    ".mtrl-tab--hover",
    ".mtrl-tab--focus",
    ".mtrl-tab--pressed",
    ".mtrl-tabs__scroll-indicator",
    ".mtrl-tabs__scroll-indicator--left",
    ".mtrl-tabs__scroll-indicator--right",
    ".mtrl-tabs__scroll-indicator--shadow",
    ".mtrl-tabs__scroll-button",
    ".mtrl-tabs__scroll-button--left",
    ".mtrl-tabs__scroll-button--right",
  ],
  timepicker: [
    ".mtrl-time-picker__sr-only",
  ],
};

const ALL_REMOVED = Object.values(REMOVED_BY_COMPONENT).flat();

describe("dead component CSS selectors are absent from all shipped sheets", () => {
  test("dist/styles.css carries none of the removed selectors", () => {
    const css = compileFull();
    expect(ALL_REMOVED.filter((selector) => css.includes(selector))).toEqual([]);
  });

  for (const [component, selectors] of Object.entries(REMOVED_BY_COMPONENT)) {
    test(`dist/styles/${component}.css and dist/elements/css/${component}.css carry none of ${component}'s removed selectors`, () => {
      const componentCss = compileComponent(component);
      const elementCss = compileElement(component);
      expect(selectors.filter((selector) => componentCss.includes(selector))).toEqual([]);
      expect(selectors.filter((selector) => elementCss.includes(selector))).toEqual([]);
    });
  }
});
