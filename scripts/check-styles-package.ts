#!/usr/bin/env bun
// scripts/check-styles-package.ts
/**
 * Build first. Compile every public Sass entry from the packed tarball, as a
 * consumer does, assert the partials no entry reaches stay out of it, and
 * assert the packed sources compile to the same CSS as the checkout's.
 *
 * The public Sass API is the one the README states and the decision of
 * 2026-11-01 (PR #189) records: the `themes`, `main` and `elements` entries,
 * and the eight M3 scheme-variant theme files a theme builder reads by path. A
 * file any of them loads has to ship, and a partial none of them loads does
 * not.
 *
 * The tarball's Sass is normalized before it packs (scripts/package-styles.ts).
 * That is only safe if it is invisible: every entry is compiled from the
 * checkout and from the packed tarball, and the two outputs must be byte for
 * byte equal. A tokenizer that mistakes an SVG's `http://` for a comment, or a
 * loud comment's or a custom property's indentation for formatting, changes one
 * of these outputs and fails here, on every pull request.
 */
import assert from "node:assert/strict";
import { join } from "node:path";
import * as sass from "sass";
import { createPackageFixture } from "./package-fixture";

const VARIANTS = ["neutral", "vibrant", "expressive", "fidelity", "content", "monochrome", "rainbow", "fruit-salad"];

// The entries as the checkout holds them (load path `src/styles`) and as a
// consumer writes them (load path `node_modules`, the README's).
const CHECKOUT_ENTRIES = [
  "main",
  "themes",
  "elements",
  "config",
  // The M3 scheme variants, read by path: the themes entry forwards the twelve
  // built-in themes, not these, and md3.io loads them this way.
  ...VARIANTS.map(name => `themes/${name}`),
];
const ENTRIES = CHECKOUT_ENTRIES.map(entry => `material/src/styles/${entry}`);

// Loaded by no public entry: internal, and not packed (1,091 B unpacked).
// `base/_reduced-motion.scss` is the build's own source for the base-lite
// reduced-motion switch; no consumer entry loads it.
const INTERNAL = [
  "src/styles/abstract/_config.scss",
  "src/styles/base/_foundation.scss",
  "src/styles/base/_reduced-motion.scss",
  "src/styles/base/_typescale.scss",
];

const fixture = await createPackageFixture();
const { directory, pack } = fixture;
try {
  const files = (pack.files as { path: string }[]).map(file => file.path);
  for (const path of INTERNAL) {
    assert(!files.includes(path), `${path} loads from no public Sass entry, and ships in the tarball`);
  }
  const loadPaths = [join(directory, "node_modules")];
  const compile = (specifier: string, paths: string[], from: string): string => {
    try {
      return sass.compileString(`@use "${specifier}";`, { loadPaths: paths, logger: sass.Logger.silent }).css;
    } catch (error) {
      throw new Error(`${specifier} does not compile from ${from}: ${(error as Error).message}`, { cause: error });
    }
  };
  for (const [index, specifier] of ENTRIES.entries()) {
    const packed = compile(specifier, loadPaths, "the packed tarball");
    const checkout = compile(CHECKOUT_ENTRIES[index], ["src/styles"], "the checkout");
    assert.equal(
      packed,
      checkout,
      `${specifier} compiles differently from the checkout's ${CHECKOUT_ENTRIES[index]}: the packed Sass normalization changed what a consumer sees`,
    );
  }
  // The public configuration and all three consumers must work from normalized
  // packed Sass, including the first-use and false/default contracts.
  for (const name of ["main", "elements"]) {
    for (const value of ["true", "false"]) {
      const compileProfile = (prefix: string, paths: string[]) => sass.compileString(
        `@use "${prefix}config" with ($typescale-tokens: ${value}); @use "${prefix}${name}";`,
        { loadPaths: paths, style: "compressed", logger: sass.Logger.silent },
      ).css;
      assert.equal(compileProfile("material/src/styles/", loadPaths), compileProfile("", ["src/styles"]), `${name}/${value}: packed configuration differs`);
    }
  }
  const contract = (source: string, packed: boolean) => sass.compileString(
    source.replaceAll("PUBLIC/", packed ? "material/src/styles/" : ""),
    { loadPaths: packed ? loadPaths : ["src/styles"], style: "compressed", logger: sass.Logger.silent },
  ).css;
  const shared = '@use "PUBLIC/config" with ($typescale-tokens: true, $direction-arms: true, $contrast-emit: none, $tag-prefix: "x");';
  assert.equal(contract(shared, true), "", "configured public entry emits CSS");
  const combined = contract(shared + '@use "PUBLIC/main"; @use "PUBLIC/elements";', true);
  assert.equal(combined, contract(shared + '@use "PUBLIC/main"; @use "PUBLIC/elements";', false));
  assert(combined.includes("x-button:not(:defined)") && !combined.includes("m-button:not(:defined)"), "shared tag prefix did not propagate");
  assert(!combined.includes("data-theme-contrast"), "shared contrast configuration did not propagate");
  assert(combined.includes("var(--mtrl-sys-typescale-label-large-font-size, 14px)"), "shared role emission did not propagate");
  for (const source of [
    '@use "PUBLIC/main" with ($typescale-tokens: true, $contrast-emit: none);',
    '@use "PUBLIC/elements" with ($typescale-tokens: true, $tag-prefix: "x");',
    '@use "PUBLIC/config" with ($state: (hover: 0.123)); @use "PUBLIC/abstract/variables" as v; @use "sass:map"; .probe { opacity: map.get(v.$state, hover); }',
  ]) assert.equal(contract(source, true), contract(source, false), "public forwards differ after packing");
  // The positive control: the packed entries are the normalized copies, not
  // the checkout's own files. The compile above is the safety contract; this
  // fails if the normalization quietly stops running (every shipped source is
  // no larger than its own file, and the tree is smaller).
  let checkoutBytes = 0;
  let packedBytes = 0;
  for (const path of files) {
    if (!path.startsWith("src/styles/") || !path.endsWith(".scss")) continue;
    const source = await Bun.file(path).text();
    const shipped = await Bun.file(join(directory, "node_modules", "material", path)).text();
    assert(shipped.length <= source.length, `${path} is larger in the tarball; its packed copy is not normalized`);
    checkoutBytes += source.length;
    packedBytes += shipped.length;
  }
  assert(packedBytes < checkoutBytes, "The packed Sass is not smaller than the checkout's: the publish-time normalization did not run");
  console.log(`Passed styles package: ${ENTRIES.length} public Sass entries compile from the packed tarball to the checkout's own CSS, and ${INTERNAL.length} internal partials are absent.`);
} finally {
  await fixture.cleanup();
}
