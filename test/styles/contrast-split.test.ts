// test/styles/contrast-split.test.ts
// FLO-540. Today's resolved colours are test/styles/fixtures/contrast-states.json,
// generated from origin/next at ORIGIN_COMMIT (emit "all", byte-identical to
// that build). With the contrast sheet loaded, every state matches the fixture.
// Without it, standard and OS-preference states still match; an explicit
// attribute on a root or a themed element resolves to the standard palette,
// because the prefers-contrast rule is guarded by :not([data-theme-contrast]).
// An unthemed element that is not the root has no selector for its own
// attribute: it stays equal to today (inherited, or .dark-theme's standard dark).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import * as sass from "sass";
import { THEME_ROLES } from "../../src/core/theme/tokens";
import { standaloneThemes, themeStyles } from "../../scripts/style-manifest";
import { selectorSpec, unsupportedColorSelectors } from "./contrast-cascade";
import {
  ORIGIN_COMMIT, STATE_COUNT, compileAll, compileExplicit, compilePreference,
  grid, inBaseLayer, primaryOf, roleColors, sheets, splitEnabled, stateKey, styleLayerOrder,
} from "./contrast-sheets";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/contrast-states.json", import.meta.url), "utf8")) as {
  commit: string;
  roles: string[];
  states: number;
  ocean: Record<string, string[]>;
  desert: Record<string, string[]>;
};

const themes = ["ocean", "desert"] as const;
type ThemeName = (typeof themes)[number];
const themeAxes: Record<ThemeName, (string | null)[]> = {
  ocean: [null, "baseline", "ocean"],
  desert: [null, "baseline", "desert"],
};

function mismatches(theme: ThemeName, mode: "today" | "with" | "without", contrastFirst = false) {
  const sheetList = sheets(theme, mode, contrastFirst);
  const expected = fixture[theme];
  const parents = new Map<string, Record<string, string>>();
  const sample: string[] = [];
  let total = 0;
  for (const state of grid(themeAxes[theme])) {
    const key = stateKey(state);
    const actual = roleColors(sheetList, state, parents);
    const explicit = state.el.contrast === "medium" || state.el.contrast === "high";
    const unthemedChild = state.target === "element" && state.el.theme === null;
    const wantKey = mode === "without" && explicit && !unthemedChild
      ? stateKey({ ...state, el: { ...state.el, contrast: "standard" } })
      : key;
    const want = expected[wantKey];
    if (!want) throw new Error(`fixture has no ${theme} ${wantKey}`);
    if (actual.join(",") !== want.join(",")) {
      total++;
      if (sample.length < 12) {
        const index = actual.findIndex((hex, i) => hex !== want[i]);
        sample.push(`${key} ${THEME_ROLES[index]} ${actual[index]} != ${want[index]} (${wantKey})`);
      }
    }
  }
  return { total, sample };
}

describe("explicit contrast levels are opt-in", () => {
  test("the fixture is origin/next's resolved colours", () => {
    expect(fixture.commit).toBe(ORIGIN_COMMIT);
    expect(fixture.roles).toEqual([...THEME_ROLES]);
    expect(fixture.states).toBe(STATE_COUNT);
    expect(grid([null, "baseline", "ocean"])).toHaveLength(STATE_COUNT);
  });

  test("specificity of the baseline contrast scope is static", () => {
    // :root:not([data-theme]) is (0,2,0) and wins inside :is, whether or not it matches.
    expect(selectorSpec(':is([data-theme="baseline"], :root:not([data-theme]))')).toEqual([0, 2, 0]);
    expect(selectorSpec(".dark-theme")).toEqual([0, 1, 0]);
  });

  test("no theme name collides with the -contrast suffix", () => {
    const names = [...themeStyles, ...standaloneThemes];
    expect(names).toContain("highcontrast");
    for (const name of names) {
      expect(name.endsWith("-contrast")).toBe(false);
      expect(names).not.toContain(`${name}-contrast`);
    }
  });

  test("golden primary colours, from the unsplit sheet", () => {
    const today = sheets("ocean", "today");
    const root = { root: true, theme: null, mode: null, contrast: null, dark: false };
    const light = { scheme: "light", contrast: "no-preference" } as const;
    const more = { scheme: "light", contrast: "more" } as const;
    expect(primaryOf(today, root, light)).toBe("#6750a4");
    expect(primaryOf(today, root, { scheme: "dark", contrast: "no-preference" })).toBe("#d0bcff");
    expect(primaryOf(today, { ...root, dark: true }, light)).toBe("#d0bcff");
    expect(primaryOf(today, root, more)).toBe("#312259");
    expect(primaryOf(today, { ...root, contrast: "high" }, more)).toBe("#312259");
    expect(primaryOf(today, { ...root, contrast: "standard" }, more)).toBe("#6750a4");
    // .dark-theme on the root follows the OS high palette. On a child it does not:
    // the high rule is :root only, so the child keeps .dark-theme's standard dark.
    expect(primaryOf(today, { ...root, dark: true }, more)).toBe("#f5edff");
    expect(primaryOf(today, { root: false, theme: null, mode: null, contrast: null, dark: true }, more)).toBe("#d0bcff");
    expect(unsupportedColorSelectors(today[0]!)).toEqual([]);
    // The theme sheet, not only the base. Split sheets are asserted below.
    expect(unsupportedColorSelectors(today[1]!)).toEqual([]);
  });

  test("the full stylesheet's selectors and declarations are unchanged", () => {
    const css = sass.compileString('@use "main";', {
      loadPaths: ["src/styles"], style: "compressed", logger: sass.Logger.silent,
    }).css;
    // `@use "main"` compressed, before the banner the build adds.
    // The hash is this sheet with the text field's layout at the M3 measurements (FLO-299),
    // its insets mirrored by one block (FLO-562), the unlabelled checkbox's centring
    // (styles/components/_checkbox.scss), the icon button's inner padding
    // (styles/components/_icon-button.scss), the unlabelled switch's 52 x 48 box
    // (styles/components/_switch.scss), the close target of the side sheet and the
    // dialog (styles/components/_side-sheet.scss, styles/components/_dialog.scss),
    // a radio row that grows with its label
    // with an unlabelled radio centred (styles/components/_radios.scss), the select
    // menu's width, mark and selected colours (styles/components/_select.scss,
    // styles/components/_menu.scss), and the chip's secondary-action floor
    // (styles/components/_chips.scss).
    expect(createHash("sha256").update(css).digest("hex"))
      .toBe("71418abd3442c9e74e886fd4cefd101b56f4d36074c7132acf74b053b6650e5e");
    expect(css.length).toBe(524986);
  });

  test("today's sheets still resolve to the fixture", () => {
    for (const theme of themes) {
      expect(unsupportedColorSelectors(sheets(theme, "today")[1]!)).toEqual([]);
      expect(mismatches(theme, "today")).toEqual({ total: 0, sample: [] });
    }
  });

  test("preference keeps the media guard and explicit keeps only the attribute", () => {
    expect(splitEnabled()).toBe(true);
    const preference = compilePreference(["themes/baseline"]);
    const explicit = compileExplicit("baseline");
    expect(preference).not.toContain("[data-theme-contrast=medium]");
    expect(preference).toContain("prefers-contrast: more");
    expect(preference).toContain(":not([data-theme-contrast])");
    expect(explicit).toContain("[data-theme-contrast=medium]");
    expect(explicit).toContain("[data-theme-contrast=high]");
    expect(explicit).not.toContain("prefers-contrast");
    expect(unsupportedColorSelectors(preference)).toEqual([]);
    expect(unsupportedColorSelectors(explicit)).toEqual([]);
    // Same layer as the base's theme rules, so load order cannot reorder the layers.
    expect(inBaseLayer(explicit)).toContain(`${styleLayerOrder()}@layer mtrl.base{`);
    expect(inBaseLayer(explicit)).not.toContain("@layer mtrl.contrast");
  });

  test("with the contrast sheet, both load orders match today", () => {
    expect(splitEnabled()).toBe(true);
    for (const theme of themes) {
      for (const sheet of sheets(theme, "with")) expect(unsupportedColorSelectors(sheet)).toEqual([]);
      expect(mismatches(theme, "with", false)).toEqual({ total: 0, sample: [] });
      expect(mismatches(theme, "with", true)).toEqual({ total: 0, sample: [] });
    }
  });

  test("without the contrast sheet, an explicit attribute resolves to standard", () => {
    for (const theme of themes) expect(mismatches(theme, "without")).toEqual({ total: 0, sample: [] });
    // The guard. Root, no theme, OS asks for more, attribute high: the media
    // rule does not match, so the standard :root rule wins (#6750a4, not high #312259).
    const without = sheets("ocean", "without");
    const root = { root: true, theme: null, mode: null, contrast: "high" as const, dark: false };
    const more = { scheme: "light" as const, contrast: "more" as const };
    expect(primaryOf(without, root, more)).toBe("#6750a4");
    // The deciding selector, compressed as the sheet emits it:
    expect(compilePreference(["themes/baseline"])).toContain(
      ":is([data-theme=baseline],:root:not([data-theme])):not([data-theme-contrast])",
    );
    // A themed element is the same: [data-theme=ocean]:not([data-theme-contrast]) does not match.
    expect(primaryOf(without, { root: false, theme: "ocean", mode: null, contrast: "high", dark: false }, more)).toBe("#006493");
    // An unthemed child is not that case. Nothing selects its attribute, so it
    // inherits the root, which is still high when the OS asks for more.
    expect(primaryOf(without, { root: false, theme: null, mode: null, contrast: "high", dark: false }, more)).toBe("#312259");
  });
});
