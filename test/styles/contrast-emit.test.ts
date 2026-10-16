// test/styles/contrast-emit.test.ts
import { describe, expect, test } from "bun:test";
import * as sass from "sass";
import { standaloneThemes } from "../../scripts/style-manifest";

const compile = (source: string) => sass.compileString(source, {
  loadPaths: ["node_modules", ".", "src/styles"], style: "compressed", logger: sass.Logger.silent,
}).css;

for (const entry of ["themes", "main"]) describe(`public Sass ${entry} contrast emission`, () => {
  const original = compile(`@use "src/styles/${entry}";`);
  test("defaults to all", () => {
    expect(compile(`@use "src/styles/${entry}" with ($contrast-emit: all);`)).toBe(original);
  });
  for (const emit of ["all", "explicit", "preference", "none"]) {
    test(`${emit} keeps standard roles and emits only its contrast families`, () => {
      const css = compile(`@use "src/styles/${entry}" with ($contrast-emit: ${emit});`);
      expect(css.includes("[data-theme-contrast=medium]")).toBe(emit === "all" || emit === "explicit");
      expect(css.includes("[data-theme-contrast=high]")).toBe(emit === "all" || emit === "explicit");
      expect(css.includes("prefers-contrast")).toBe(emit === "all" || emit === "preference");
      expect(css.includes("data-theme-contrast")).toBe(emit !== "none");
      // Removing the contrast blocks must leave every standard declaration intact.
      const standard = (sheet: string) => [...sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter(([, selector]) => !selector.includes("data-theme-contrast"))
        .map(([, selector, declarations]) => [selector, declarations]);
      expect(standard(css)).toEqual(standard(original));
    });
  }
  test("rejects invalid values", () => {
    expect(() => compile(`@use "src/styles/${entry}" with ($contrast-emit: invalid);`)).toThrow("$contrast-emit");
  });
});

test("one public configuration also controls subsequently loaded standalone themes", () => {
  for (const name of standaloneThemes) {
    const css = compile(`@use "src/styles/themes" with ($contrast-emit: none); @use "themes/${name}";`);
    expect(css).toContain(`[data-theme=${name}]`);
    expect(css).not.toContain("data-theme-contrast");
    expect(css).not.toContain("prefers-contrast");
  }
});
