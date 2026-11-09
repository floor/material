import { describe, expect, test } from "bun:test";
import * as sass from "sass";
import { compileThemeSources } from "../../scripts/build-styles";

const options: sass.StringOptions<"sync"> = { loadPaths: ["src/styles"], style: "compressed", logger: sass.Logger.silent };
const compile = (source: string) => sass.compileString(source, options).css;
const config = (value: string) => `@use "config" with ($typography-tokens: ${value});\n`;
const roleProbe = '@use "abstract/variables" as v; @use "abstract/mixins" as m; @each $role, $spec in v.$typescale { .probe-#{$role} { @include m.typography($role); } }';

describe("opt-in typography consumers", () => {
  test("configuration alone emits no CSS and rejects non-boolean values", () => {
    expect(compile('@use "config";')).toBe("");
    expect(compile(config("false"))).toBe("");
    expect(compile(config("true"))).toBe("");
    expect(() => compile(config('"true"'))).toThrow("must be true or false");
    expect(() => compile(config("1"))).toThrow("must be true or false");
    // Sass treats null configuration as omitted for a !default variable.
    expect(compile(config("null"))).toBe("");
  });

  test("omitted and explicit false preserve the same component and pre-upgrade CSS", () => {
    for (const source of ["components/button", "components/badge", "elements/button-group", "elements/badge"]) {
      expect(compile(config("false") + `@use "${source}";`)).toBe(compile(`@use "${source}";`));
    }
    // The default direction-arms compilation also remains token-free.
    expect(compileThemeSources(["components/button"])).not.toContain("--mtrl-sys-typescale-");
  });

  test("each existing role reads all five properties with its current fallback", () => {
    const normal = compile(roleProbe), selected = compile(config("true") + roleProbe);
    const rule = /\.probe-([\w-]+)\{([^{}]+)\}/g;
    const original = new Map([...normal.matchAll(rule)].map(([, role, body]) => [role, body]));
    const property = { "font-family": "font", "font-size": "font-size", "line-height": "line-height", "letter-spacing": "letter-spacing", "font-weight": "font-weight" };
    let count = 0;
    for (const [, role, body] of selected.matchAll(rule)) {
      const old = original.get(role)!;
      for (const [css, token] of Object.entries(property)) {
        const fallback = new RegExp(`(?:^|;)${css}:([^;]+)`).exec(old)![1].replace(/^(-?)\./, (_, sign) => `${sign}0.`);
        expect(body, `${role}/${css}`).toContain(`${css}:var(--mtrl-sys-typescale-${role}-${token}, ${fallback})`);
      }
      count++;
    }
    expect(count).toBe(original.size);
    expect(count).toBeGreaterThan(0);
  });

  test("configuration must precede any dependent module", () => {
    expect(() => compile('@use "components/button";' + config("true"))).toThrow("already loaded");
    expect(compile(config("true") + '@use "components/button"; @use "elements" with ($tag-prefix: "x");')).toContain("x-button:not(:defined)");
  });

  test("badge text consumes its three existing properties; dots remain zero sized text", () => {
    for (const source of ["components/badge", "elements/badge"]) {
      const css = compile(config("true") + `@use "${source}";`);
      expect(css).toContain("var(--mtrl-sys-typescale-label-small-font-size, 11px)");
      expect(css).toContain("var(--mtrl-sys-typescale-label-small-line-height, 16px)");
      expect(css).toContain("var(--mtrl-sys-typescale-label-small-font-weight, 500)");
      expect(css).toContain("font-size:0");
      expect(css).not.toContain("--mtrl-sys-typescale-label-small-font,");
    }
  });

  test("group pre-upgrade size roles consume the same tracking, weight and face as the owned buttons", () => {
    const css = compile(config("true") + '@use "elements/button-group";');
    expect(css).toContain("var(--mtrl-sys-typescale-title-medium-font-weight, 500)");
    for (const role of ["headline-small", "headline-large"]) {
      expect(css).toContain(`var(--mtrl-sys-typescale-${role}-letter-spacing, 0)`);
      expect(css).toContain(`var(--mtrl-sys-typescale-${role}-font-weight, 400)`);
      expect(css).toContain(`var(--mtrl-sys-typescale-${role}-font, var(--mtrl-ref-typeface-brand, Roboto, sans-serif))`);
    }
  });
});
