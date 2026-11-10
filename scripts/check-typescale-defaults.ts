#!/usr/bin/env bun
// Freeze typography role defaults, not unrelated JS, CSS or SSR documents.
import assert from "node:assert/strict";
import * as sass from "sass";
import expected from "./fixtures/typescale-defaults.json";

const probe = '@use "abstract/variables" as v; @use "abstract/mixins" as m;' +
  '@each $role, $spec in v.$typescale { .probe-#{$role} { @include m.typography($role); } }';

function expectedCss(selected: boolean): string {
  return Object.entries(expected.roles).map(([role, properties]) => {
    const declarations = Object.entries(properties).map(([property, literal]) => {
      const token = property === "font-family" ? "font" : property;
      // Interpolated fallbacks retain the leading zero Sass compresses out of
      // ordinary numeric declarations. Preserve the value in both forms.
      const fallback = literal.replace(/^(-?)\./, (_, sign) => `${sign}0.`);
      const value = selected ? `var(--mtrl-sys-typescale-${role}-${token}, ${fallback})` : literal;
      return `${property}:${value}`;
    });
    return `.probe-${role}{${declarations.join(";")}}`;
  }).join("");
}

export function checkTypographyDefaults(stylesRoot = "src/styles"): void {
  for (const mode of ["omitted", "false", "true"] as const) {
    const config = mode === "omitted" ? "" : `@use "config" with ($typescale-tokens: ${mode});`;
    const css = sass.compileString(config + probe, {
      loadPaths: [stylesRoot], style: "compressed", logger: sass.Logger.silent,
    }).css;
    assert.equal(css, expectedCss(mode === "true"),
      `${mode}: typography role defaults or fallbacks changed from ${expected.baseline}`);
  }
}

if (import.meta.main) {
  checkTypographyDefaults();
  console.log(`Typography defaults: ${Object.keys(expected.roles).length} roles × five properties match ${expected.baseline}; omitted, false and opt-in fallbacks checked`);
}
