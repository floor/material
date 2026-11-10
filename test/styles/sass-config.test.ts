import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import * as sass from "sass";
import baseline from "../../scripts/fixtures/sass-config-baseline.json";

const compile = (source: string) => sass.compileString(source, {
  loadPaths: ["src/styles"], style: "expanded", logger: sass.Logger.silent,
}).css;
const configure = `@use "config" with ($typescale-tokens: true, $spring-tokens: true,
  $direction-arms: true, $contrast-emit: preference, $tag-prefix: "x");`;

describe("public configure-once Sass", () => {
  test("emits zero CSS and exposes only the five configuration switches", () => {
    expect(compile(configure)).toBe("");
    expect(compile(`@use "config";`)).toBe("");
    const css = compile(`${configure} @use "sass:meta"; .probe {
      @each $name, $value in meta.module-variables("config") { --#{$name}: #{meta.inspect($value)}; }
    }`);
    for (const declaration of ["--typescale-tokens: true", "--spring-tokens: true",
      "--direction-arms: true", "--contrast-emit: preference", '--tag-prefix: "x"']) expect(css).toContain(declaration);
    expect((css.match(/--[\w-]+:/g) ?? []).length).toBe(5);
  });

  for (const [entry, digest] of Object.entries(baseline.sources)) {
    test(`${entry}: defaults match frozen main and adding the gateway is neutral`, () => {
      const original = compile(`@use "${entry}";`);
      expect(createHash("sha256").update(original).digest("hex")).toBe(digest);
      expect(compile(`@use "config"; @use "${entry}";`)).toBe(original);
    });
  }

  test("propagates configuration across main, elements and selective sheets", () => {
    const css = compile(`${configure} @use "main"; @use "elements";`);
    expect(css).toContain("x-button:not(:defined)");
    expect(css).not.toContain("m-button:not(:defined)");
    expect(css.includes("[data-theme-contrast=medium]")).toBe(false);
    expect(css.includes("[data-theme-contrast=high]")).toBe(false);
    expect(css).toContain("prefers-contrast");
    expect(css).toContain("[dir=rtl]");
    const selective = compile(`${configure} @use "themes/ocean"; @use "components/button";
      @use "elements/button" as preupgrade-button;`);
    expect(selective).toContain("x-button:not(:defined)");
    expect(selective.includes("[data-theme-contrast=medium]")).toBe(false);
    expect(selective.includes("[data-theme-contrast=high]")).toBe(false);
    // Both feature implementations now consume the shared token flags.
    expect(selective).toContain("var(--mtrl-sys-typescale-label-large-font-size, 14px)");
    expect(selective).toContain("var(--mtrl-sys-motion-spring-fast-spatial-duration, 425ms)");
  });

  for (const entry of ["main", "elements"]) {
    test(`${entry} forwards both new flags before loading their defining module`, () => {
      const existing = entry === "main" ? "$contrast-emit: none" : '$tag-prefix: "x"';
      const css = compile(`@use "${entry}" with (${existing}, $typescale-tokens: true, $spring-tokens: true);
        .probe { --type: #{${entry}.$typescale-tokens}; --spring: #{${entry}.$spring-tokens}; }`);
      expect(css).toContain("--type: true");
      expect(css).toContain("--spring: true");
      if (entry === "main") expect(css).not.toContain("data-theme-contrast");
      else expect(css).toContain("x-button:not(:defined)");
    });
  }

  for (const entry of ["config", "main", "elements"]) {
    for (const [flag, value] of [["typescale-tokens", '"yes"'], ["spring-tokens", "1"]]) {
      test(`${entry} rejects invalid $${flag} with the offending value`, () => {
        expect(() => compile(`@use "${entry}" with ($${flag}: ${value});`))
          .toThrow(`$${flag} must be a boolean (true or false), got ${value}.`);
      });
    }
  }

  test("preserves existing direct contrast and prefix configurations", () => {
    for (const entry of ["main", "themes"]) {
      expect(compile(`@use "${entry}" with ($contrast-emit: none);`))
        .toBe(compile(`@use "config" with ($contrast-emit: none); @use "${entry}";`));
    }
    expect(compile(`@use "elements" with ($tag-prefix: "x");`))
      .toBe(compile(`@use "config" with ($tag-prefix: "x"); @use "elements";`));
  });

  test("preserves the existing direction switch's Sass truthiness", () => {
    expect(compile(`@use "config" with ($direction-arms: "legacy"); @use "components/button";`))
      .toBe(compile(`@use "abstract/emit" with ($direction-arms: "legacy"); @use "components/button";`));
  });

  test("a named component loading the leaf makes later configuration fail", () => {
    expect(() => compile(`@use "components/button"; ${configure}`)).toThrow("already loaded");
    expect(() => compile(`${configure} @use "main" with ($typescale-tokens: true);`)).toThrow("already loaded");
  });

  test("does not establish a public whole-map replacement API", () => {
    for (const name of ["state", "motion", "elevation", "typescale", "shape", "breakpoints",
      "z-index", "card", "chip-config", "button", "text-field"]) {
      expect(() => compile(`@use "config" with ($${name}: ());`)).toThrow("not declared with !default");
    }
  });
});
