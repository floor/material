#!/usr/bin/env bun
/**
 * scripts/budgets.ts
 *
 * The single home of every size ceiling the checks assert: the packed package
 * fixtures, the SSR entry and pages, what an install downloads and unpacks,
 * the button's initial graph, the slider harness's own build, and the packed
 * consumer builds. A raise edits one constant here; no check restates a
 * number, so a copy cannot be missed again.
 *
 * How a ceiling is set is unchanged and stays in scripts/size.ts's header:
 * `kb(n)` in the per-component tables, and for an explicit byte ceiling the
 * measured gzip plus 1% or 100 bytes, whichever is more, rounded up to the
 * next multiple of 50 (1,000 for the SSR entry's raw ceiling, the npm tarball
 * and the unpacked size).
 */

/** check-package-size.ts: the packed package fixture gzip ceilings, by fixture. */
export const PACKAGE_GZIP = {
  addClass: 550,
  button: 14_100,
  slider: 13_600,
  "navigation-rail": 7_168,
  "navigation-rail-css": 5_400,
  "text-field": 9_550,
  form: 20_400,
  "all-js": 128_550,
  "base-css": 3_050,
  "button-css": 5_300,
  "select-css": 8_400,
  "slider-css": 4_850,
  "full-css": 63_750,
} as const;

/** check-package-size.ts: the button's initial graph, progress deferred. */
export const BUTTON_INITIAL_GZIP = 7_800;

/** check-package-size.ts: the bundled server-only SSR entry. */
export const SSR_ENTRY = { raw: 311_000, gzip: 113_000 } as const;

/** check-package-size.ts: a server-rendered page of 44 roots, [floor, ceiling]. */
export const SSR_PAGE = {
  inline: { raw: [693_900, 707_200], gzip: [11_050, 11_300] },
  link: { raw: [42_300, 43_200], gzip: [900, 1_150] },
} as const;

/** check-package-size.ts: what an install downloads, and what it unpacks to. */
export const TARBALL_BYTES = 1_034_000;
// The root reset for a nested LTR instance, measured under CI's Node 22 / npm 10 packer.
// Lowered by the build's declaration prune; the row and the rule figure are in check-package-size.ts.
export const UNPACKED_BYTES = 5_640_000;

/** check-slider.ts: its own build of the slider element entry. */
export const SLIDER_INLINE_GZIP = 13_400;

/** check-consumer.ts: the packed Vite app's initial gzip, by consumer import. */
export const CONSUMER_INITIAL_GZIP = {
  addClass: 750,
  "text-field": 10_000,
  button: 8_700,
} as const;
