#!/usr/bin/env bun
// scripts/check-theme-root-scope.ts
// A blank-page browser check; no website or build needed.
//
// Baseline's defaults are the fallback for a page that selected no theme, so
// they must never override one that was selected. `:root` and
// `[data-theme="ocean"]` both carry specificity (0,1,0): whichever rule comes
// later wins. The shipped `themes/_index.scss` forwards baseline first, but an
// app that compiles several theme partials and imports baseline after them got
// baseline's colours on `<html data-theme="ocean">` — in light mode and, under
// a dark OS preference, baseline's dark ones too. The same happened with a
// stray `dark-theme` class next to a `data-theme`.
//
// The check compiles baseline, ocean and desert in both import orders, sets
// `data-theme` on `<html>`, and compares the computed `--mtrl-sys-color-primary`
// against a reference element that carries the theme attribute itself (immune
// to what `:root` does), under light and dark `prefers-color-scheme`, with and
// without `data-theme-mode="dark"`, and with a stray `dark-theme` class. It
// also checks that a page with no `data-theme` still gets baseline, light and
// dark.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import * as sass from "sass";

const options = { loadPaths: ["src/styles"], style: "compressed", logger: sass.Logger.silent } as const;

/** Both orders must behave identically; baseline last is the order that broke. */
const ORDERS: Record<string, string> = {
  "baseline first": '@use "themes/baseline";\n@use "themes/ocean";\n@use "themes/desert";',
  "baseline last": '@use "themes/ocean";\n@use "themes/desert";\n@use "themes/baseline";',
};

const THEMES = ["ocean", "desert"] as const;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [order, source] of Object.entries(ORDERS)) {
    const css = sass.compileString(source, options).css;
    await page.setContent(`<style>${css}</style><div id="ref"></div>`);

    /** The theme's own value: a reference element carrying the attributes itself. */
    const reference = (theme: string, mode: "light" | "dark"): Promise<string> =>
      page.evaluate(({ theme, mode }) => {
        const ref = document.getElementById("ref")!;
        ref.setAttribute("data-theme", theme);
        ref.setAttribute("data-theme-mode", mode);
        return getComputedStyle(ref).getPropertyValue("--mtrl-sys-color-primary").trim();
      }, { theme, mode });

    /** `<html>`'s computed value of any custom property under the given attributes. */
    const rootValue = (attrs: { theme?: string; mode?: string; darkClass?: boolean }, property: string): Promise<string> =>
      page.evaluate(({ theme, mode, darkClass, property }) => {
        const root = document.documentElement;
        delete root.dataset.theme;
        delete root.dataset.themeMode;
        root.classList.remove("dark-theme");
        if (theme) root.dataset.theme = theme;
        if (mode) root.dataset.themeMode = mode;
        if (darkClass) root.classList.add("dark-theme");
        return getComputedStyle(root).getPropertyValue(property).trim();
      }, { ...attrs, property });

    /** `<html>`'s computed primary under the given attributes. */
    const rootPrimary = (attrs: { theme?: string; mode?: string; darkClass?: boolean }): Promise<string> =>
      rootValue(attrs, "--mtrl-sys-color-primary");

    // Baseline's default for a role a theme may not declare (ocean has none):
    // scoping must never strand a property on a themed page.
    await page.emulateMedia({ colorScheme: "light" });
    const baselineShadow = await rootValue({}, "--mtrl-sys-color-shadow");
    assert.equal(baselineShadow, "#000000", `${order}: unthemed shadow`);

    for (const theme of THEMES) {
      const light = await reference(theme, "light");
      const dark = await reference(theme, "dark");
      assert.notEqual(light, dark, `${order} ${theme}: light and dark differ`);

      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        // A selected theme follows its attributes, not the OS scheme or a
        // leftover dark-theme class, whichever order the partials compiled in.
        assert.equal(await rootPrimary({ theme }), light, `${order} ${theme}: OS ${colorScheme}`);
        assert.equal(await rootPrimary({ theme, mode: "dark" }), dark, `${order} ${theme}: OS ${colorScheme}, mode dark`);
        assert.equal(await rootPrimary({ theme, darkClass: true }), light, `${order} ${theme}: OS ${colorScheme}, stray dark-theme class`);
        assert.equal(await rootValue({ theme }, "--mtrl-sys-color-shadow"), baselineShadow,
          `${order} ${theme}: OS ${colorScheme}, shadow still resolves`);
      }
    }

    // No theme selected: baseline, following the OS scheme or the manual class.
    const baselineLight = await reference("baseline", "light");
    const baselineDark = await reference("baseline", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    assert.equal(await rootPrimary({}), baselineLight, `${order}: unthemed, OS light`);
    assert.equal(await rootPrimary({ darkClass: true }), baselineDark, `${order}: unthemed, dark-theme class`);
    await page.emulateMedia({ colorScheme: "dark" });
    assert.equal(await rootPrimary({}), baselineDark, `${order}: unthemed, OS dark`);
    console.log(`${order}: a selected theme wins in every state; unthemed pages keep baseline`);
  }
} finally {
  await browser.close();
}
console.log("Theme root scope: baseline's defaults never override a selected theme");
