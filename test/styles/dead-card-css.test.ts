// test/styles/dead-card-css.test.ts
//
// The card's loading, expandable and swipeable members were deprecated in
// 0.10.5 and removed in 3.0.0; their module stopped shipping in 3.3.3. The
// stylesheets kept styling markup nothing produces, in all three shipped
// sheets. The tests job has no dist/, so this compiles the source each of
// them is built from: `main` for dist/styles.css, and `components/card` for
// dist/styles/card.css and dist/elements/css/card.css (the card element's
// `styles: ["card"]` compiles that same source; the direction-arms prelude
// only re-places live logical properties, it cannot reintroduce a rule).
import { describe, expect, test } from "bun:test";
import * as sass from "sass";

const options: sass.StringOptions<"sync"> = {
  loadPaths: ["src/styles"], style: "compressed", logger: sass.Logger.silent,
};

const compiled = (sources: string[]): string =>
  sass.compileString(
    sources.map((source, i) => `@use "${source}" as entry${i};`).join("\n"),
    options,
  ).css;

/** The selectors and the keyframes of the removed card features. */
const REMOVED = [
  ".mtrl-card__loading-overlay",
  ".mtrl-card__loading-spinner",
  ".mtrl-card__expand-button",
  ".mtrl-card__expandable-content",
  ".mtrl-card__swipe-left-action",
  ".mtrl-card__swipe-right-action",
  ".mtrl-card--swipeable",
  ".mtrl-card--state-loading",
  "@keyframes card-spinner",
];

describe("the card's removed features leave no CSS behind", () => {
  const sheets: Record<string, string[]> = {
    // dist/styles.css
    "the full stylesheet": ["main"],
    // dist/styles/card.css and dist/elements/css/card.css
    "the card sheet": ["components/card"],
  };
  for (const [name, sources] of Object.entries(sheets)) {
    test(`${name} carries none of their selectors`, () => {
      const css = compiled(sources);
      expect(REMOVED.filter((selector) => css.includes(selector))).toEqual([]);
    });
  }
});
