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
  "text-field": 9_600,
  form: 20_500,
  "all-js": 136_270, // The menu in a scrolling container with the select's flipped reveal on the merged tree: 136,251 B packed in CI 45840660595, the next 10 B. Preceding: The menu in a scrolling container: 136,101 B packed in CI 45836472537, the next 10 B. Preceding: The menu inside a positioned host: 135,680 B packed in CI 45711231153, at least 10 B above it. Preceding: The menu and select under a zoomed document: 135,591 B packed in CI 45694334851, the next 10 B. Preceding: The end cap on the merged tree: 135,479 B packed in CI 45678696009, the next 10 B. Preceding: the carousel drag after a click: 135,401 B packed in CI 45671878156, the next 10 B. // The carousel drag after a click: 135,401 B packed in CI 45671878156, the next 10 B. Preceding: The pressed handle's pieces follow it by 1 px: 135,364 B packed in CI 45606734427, the next 10 B. Preceding row: the slider's handle on the track's corner scale and its pressed handle: 135,201 B packed in CI 45501132647, raised to measured + 10 B. Preceding row: a cancelled drag settles on the nearest anchor: 134,859 B packed, rounded up to the next 10 B. The sparse-drag settle: 134,840 B packed, already the next 10 B. The sheet follows the pointer and the peek height shares the spring: 134,830 B packed, already the next 10 B. The shift and the final button merge together: 134,006 B packed measured on the merged tree, rounded up to the next 10 B. The shift with the first button merge: 133,947 B measured, raised to the next 10 B. The list opens on the side with room, with the button items: 133,866 B packed, raised to the next 10 B. List items are buttons, on main after the search fix: 133,537 B packed, raised to the next 10 B. The search fix on main: CI 45137324230 measured 133,461 B packed, raised to the next 10 B (standing rule: a size budget never blocks a PR); Owner decision 2026-11-09: time picker transitions in 3.10.1 and card child actions in 3.11; raised to 131,100, owner decision 2026-11-10; raised to 131,200 for the list control names (#388, 131,165 packed) and the expand-more registry role (131,102 packed) in 3.15.0, owner decision 2026-11-17; raised to 131,320 for #388 together with the icon role, whose stacked measurement is 131,294 packed, owner decision 2026-11-17; raised to 131,400 for the menu's selected item as a checked menuitemradio (#416), whose stacked measurement is 131,365 packed, owner decision 2026-11-18; raised to 131,500 for the divider insets and the bottom sheet corners, measured 131,500 packed, owner decision 2026-11-19; raised to 131,530 after the merge onto main, measured 131,522 packed, owner decision 2026-11-19; raised to 131,570 for the sheet container watch, measured 131,570 packed, owner decision 2026-11-19; raised to 131,750 for the tooltip touch fix, measured 131,748 packed, owner decision 2026-11-19; raised to 131,770 for the closed-state attributes of a never-opened dialog and snackbar, measured 131,769 packed, owner decision 2026-11-19 (standing rule: a size budget never blocks a PR). Drawer links and expandable sections: 133,433 B in CI 44587668285; 133,453 B with live section state in CI 44592311998.
  "base-css": 3_150,
  "base-lite-css": 1_750,
  "button-css": 5_550,
  "select-css": 8_400,
  "slider-css": 5_050,
  "full-css": 63_750,
} as const;

/** check-package-size.ts: the button's initial graph, progress deferred. */
export const BUTTON_INITIAL_GZIP = 7_800;

/** check-package-size.ts: the bundled server-only SSR entry. */
export const SSR_ENTRY = { raw: 311_000, gzip: 113_000 } as const;

/** check-package-size.ts: a server-rendered page of 44 roots, [floor, ceiling]. */
export const SSR_PAGE = {
  // The density scale's rules reach the page's pre-upgrade inline sheet, so the
  // inline page's raw bytes outgrow the old 256,200 ceiling while its gzip row
  // stays inside the unchanged budget. Owner decision 2026-11-09: the raw
  // ceiling is 263,950, the measured row plus 1% rounded up to 50; the floors
  // and the gzip row stay as they are.
  inline: { raw: [251_100, 263_950], gzip: [5_200, 5_450] },
  link: { raw: [42_300, 43_200], gzip: [900, 1_150] },
} as const;

/** check-ssr-comments.ts: each shipped SSR adapter entry, minified by the build (bytes). */
export const SSR_ADAPTER_BYTES = { react: 4_400, svelte: 1_600, vue: 1_500, solid: 600 } as const;

/** check-package-size.ts: what an install downloads, and what it unpacks to. */
// The readable, comment-stripped dist: at the 865,000 ceiling the package job
// measured 863,703 B packed (1,297 B spare) where the base packed 882,799, as
// 883,000 had carried 1,432 B over 881,568. Owner decision 2026-11-05: 920,000.
// The bottom sheet drag: 920,016 B packed with Node 22.23.5 / npm 10.9.11.
// Owner decision 2026-11-24: 920,020, the next 10 B.
export const TARBALL_BYTES = 922_980; // The menu in a scrolling container with the select's flipped reveal on the merged tree: 922,967 B packed in CI 45840660595, the next 10 B. Preceding: The menu in a scrolling container: 922,730 B packed in CI 45836472537, the next 10 B. Preceding: The dialog's small-window scrolling on main with the icon button: 921,829 B packed in CI 45806151101, the next 10 B. Preceding: The dialog's small-window scrolling: 921,815 B packed in CI 45801675134, the next 10 B. Preceding: The time picker seconds width, narrow viewports: 921,651 B packed in CI 45781814803, at least 10 B above it. Preceding: The time picker seconds width: 921,472 B packed in CI 45779924120, at least 10 B above it. Preceding: The shared zoom helper on the merged tree: 921,393 B packed in CI 45703373289, at least 10 B above it. Preceding: The menu and select under a zoomed document: 921,304 B packed in CI 45694334851, the next 10 B. Preceding: The tie-loop scoping on the end cap: 921,146 B packed measured on d3528d00 (CI 45681319901), the next 10 B. Preceding: the carousel drag after a click: 921,011 B packed in CI 45671878156, the next 10 B. // The carousel drag after a click: 921,011 B packed in CI 45671878156 and 921,009 in the review run, the next 10 B above both. Preceding: The carousel drag after a click: 921,009 B packed in CI 45671878156, the next 10 B. Preceding: The pressed handle's pieces follow it by 1 px: 920,949 B packed in CI 45606734427, the next 10 B. Preceding row: the drawer reveal merged with main: the exact-head tarball is 920,693 B packed, raised to the next 10 B (the earlier rows 920,709 B dated from the pre-merge head). Preceding row: CI 45550113003 measured 920,709 B packed, rounded up to the next 10 B. Main's own slider-press narrowing: CI 45543910093 (920,583). Preceding: the list sheet (CI 45536771794, 920,561), the theme roles (CI 45376317783, 920,027). Preceding row: the list sheet on the slider main: CI 45536771794 measured 920,561 B packed, the next 10 B. Owner rule: measured + 10 B. The list conformance sheet alone: CI 45528212987 measured 920,502 B packed, the next 10 B. The theme shadow/scrim roles: 920,027 B measured in CI 45376317783, rounded up to the next 10 B. Owner decision 2026-11-24.
// The root reset for a nested LTR instance, measured under CI's Node 22 / npm 10 packer.
// Lowered by the build's declaration prune and the prose-free declarations; the row
// and the rule figure are in check-package-size.ts. The lean listbox entry's six
// files measure 5,127,470 B in CI, 1,265 files; measured + 1%, up to the next 1,000,
// is 5,179,000. Owner decision 2026-11-10: the unpacked package cap is 5,179,000.
export const UNPACKED_BYTES = 5_255_550; // The menu in a scrolling container with the select's flipped reveal on the merged tree: 5,255,538 B unpacked in CI 45840660595, the next 10 B. Preceding: The menu in a scrolling container: 5,254,764 B unpacked in CI 45836472537, the next 10 B. Preceding: The dialog's small-window scrolling on main with the icon button: 5,251,059 B unpacked in CI 45806151101, the next 10 B. Preceding: The dialog's small-window scrolling: 5,251,032 B unpacked in CI 45801675134, the next 10 B. Preceding: The time picker seconds width, narrow viewports: 5,249,831 B unpacked in CI 45781814803, at least 10 B above it. Preceding: The time picker seconds width: 5,248,083 B unpacked in CI 45779924120, at least 10 B above it. Preceding: The shared zoom helper on the merged tree: 5,247,607 B unpacked in CI 45703373289, at least 10 B above it. Preceding: The menu and select under a zoomed document: 5,247,456 B unpacked in CI 45694334851, the next 10 B. Preceding: CI 45682614955 measured 5,246,966 B unpacked; raised to 5,246,980 per the round (numbers only, no names). Preceding: the carousel drag after a click: 5,246,453 B unpacked in CI 45671878156, the next 10 B. // The carousel drag after a click: 5,246,453 B unpacked in CI 45671878156, the next 10 B. Preceding: The pressed handle's pieces follow it by 1 px: 5,246,018 B unpacked in CI 45606734427, the next 10 B. Preceding row: the drawer reveal merged with main: 5,244,361 B unpacked measured in CI 45551068234, rounded up to the next 10 B. Earlier: the slider's container press rule (CI 45545597229, 5,244,154). Preceding row: The shift and the final button merge together: 5,244,133 B unpacked measured on the merged tree, rounded up to the next 10 B. The shift with the first button merge: 5,243,731 B measured, raised to the next 10 B. The list opens on the side with room, with the button items: 5,242,694 B unpacked, raised to the next 10 B. List items are buttons, on main after the search fix: 5,239,103 B unpacked, raised to the next 10 B. The search fix on main: CI 45148821634 measured 5,238,150 B unpacked, rounded up to the next 10 B.

/** check-slider.ts: its own build of the slider element entry. */
export const SLIDER_INLINE_GZIP = 13_400;

/** check-consumer.ts: the packed Vite app's initial gzip, by consumer import. */
export const CONSUMER_INITIAL_GZIP = {
  addClass: 750,
  "text-field": 10_000,
  button: 8_700,
  // Runtime colour, 3.8.0. Both rows are the first CI measurement plus
  // max(1%, 100 B), rounded up to the next 50; the ceilings, 20,500 B for the
  // scheme and 24,000 B with the image path, stay above them.
  theme: 17_450,
  "theme-image": 21_050,
  // The opt-in 2025 spec has its own entry and keeps its existing rows:
  // first green CI measurement 20,569 / 24,143 B plus max(1%, 100 B),
  // rounded up to the next 50 (owner-side ruling, 2026-11-05).
  // The default entries retain main's current ceilings above.
  "theme-2025": 20_800,
  "theme-2025-image": 24_400,
} as const;
