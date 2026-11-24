// test/styles/theme-roles.test.ts
// Every theme declares the same color-role set as the baseline theme, in
// light and dark. A hand-written theme that omits a role does not fail
// visibly — the base layer's :where(:root) defaults fill the gap — so the
// drift is guarded here, where it shows.
import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import * as sass from "sass";

const loadPaths = [resolve(import.meta.dir, "../../src/styles"), resolve(import.meta.dir, "../..")];
const options: sass.StringOptions<"sync"> = {
  loadPaths, style: "compressed", logger: sass.Logger.silent,
};

/** The custom properties a compiled theme block declares. */
const roles = (css: string, selector: string): string[] => {
  const start = css.indexOf(`${selector}{`);
  if (start === -1) return [];
  const open = css.indexOf("{", start);
  let depth = 1, end = open;
  while (depth > 0 && end < css.length) {
    end++;
    if (css[end] === "{") depth++;
    if (css[end] === "}") depth--;
  }
  const block = css.slice(open, end);
  return [...new Set([...block.matchAll(/(--mtrl-sys-color-[\w-]+)\s*:/g)].map((m) => m[1]!))].sort();
};

const themeFiles = readdirSync("src/styles/themes")
  .filter((file) => /^_.+\.scss$/.test(file) && !["config", "index", "base-theme"].includes(file.replace(/\.scss$/, "").slice(1)))
  .map((file) => file.replace(/\.scss$/, "").slice(1));

describe("theme color-role parity", () => {
  const baselineCss = sass.compileString('@use "themes/baseline";', options).css;
  const baselineLight = roles(baselineCss, '[data-theme=baseline]');
  const baselineDark = roles(baselineCss, '[data-theme=baseline][data-theme-mode=dark]');

  test("the baseline theme declares a role set", () => {
    expect(baselineLight.length).toBeGreaterThan(20);
    expect(baselineDark.length).toBeGreaterThan(20);
  });

  for (const theme of themeFiles) {
    const css = sass.compileString(`@use "themes/${theme}";`, options).css;
    test(`${theme}: light declares every role the baseline declares`, () => {
      expect(roles(css, `[data-theme=${theme}]`)).toEqual(baselineLight);
    });
    test(`${theme}: dark resolves every role the baseline declares`, () => {
      // The dark block overrides the roles that differ; the ones it omits
      // cascade from the theme's own light block, so the resolved set is
      // light ∪ dark.
      const light = roles(css, `[data-theme=${theme}]`);
      const dark = roles(css, `[data-theme=${theme}][data-theme-mode=dark]`);
      expect([...new Set([...light, ...dark])].sort()).toEqual(baselineDark);
    });
  }
});
