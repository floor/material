#!/usr/bin/env bun
// scripts/check-styles-package.ts
/**
 * Build first. Compile every public Sass entry from the packed tarball, as a
 * consumer does, assert the partials no entry reaches stay out of it, and
 * assert the packed sources compile to the same CSS as the checkout's.
 *
 * The public Sass API is the one the README states and the decision of
 * 2026-11-01 (PR #189) records, plus the zero-CSS `config` gateway:
 * the `themes`, `main` and `elements` entries,
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
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import * as sass from "sass";
import { createPackageFixture } from "./package-fixture";
import baseline from "./fixtures/sass-config-baseline.json";

const VARIANTS = ["neutral", "vibrant", "expressive", "fidelity", "content", "monochrome", "rainbow", "fruit-salad"];

// The entries as the checkout holds them (load path `src/styles`) and as a
// consumer writes them (load path `node_modules`, the README's).
const CHECKOUT_ENTRIES = [
  "config",
  "main",
  "themes",
  "elements",
  // The M3 scheme variants, read by path: the themes entry forwards the twelve
  // built-in themes, not these, and md3.io loads them this way.
  ...VARIANTS.map(name => `themes/${name}`),
];
const ENTRIES = CHECKOUT_ENTRIES.map(entry => `material/src/styles/${entry}`);

// Loaded by no public entry: internal, and not packed.
// `base/_reduced-motion.scss` is the build's own source for the base-lite
// reduced-motion switch; no consumer entry loads it.
const INTERNAL = [
  "src/styles/base/_foundation.scss",
  "src/styles/base/_reduced-motion.scss",
  "src/styles/base/_typescale.scss",
];

const fixture = await createPackageFixture();
const { directory, pack } = fixture;
try {
  const digest = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
  assert.equal(Bun.version, baseline.bun, "The frozen baseline uses the CI Bun version");
  assert.equal(sass.info, baseline.sass, "The frozen baseline uses the locked Sass compiler");
  for (const [path, expected] of Object.entries(baseline.buildInputs)) {
    assert.equal(digest(await readFile(path)), expected, `${path}: baseline build inputs changed; re-establish the independent baseline`);
  }
  const files = (pack.files as { path: string }[]).map(file => file.path);
  assert(files.includes("src/styles/_config.scss"), "The public gateway must ship");
  assert(!files.includes("src/styles/abstract/_config.scss"), "The retired configuration partial must not ship");
  assert(!(await Bun.file("src/styles/abstract/_config.scss").exists()), "The broken, unshipped configuration partial is retired");
  for (const path of INTERNAL) {
    assert(!files.includes(path), `${path} loads from no public Sass entry, and ships in the tarball`);
  }
  const loadPaths = [join(directory, "node_modules")];
  const compileSource = (source: string, paths = loadPaths) => sass.compileString(source, {
    loadPaths: paths, style: "expanded", logger: sass.Logger.silent,
  }).css;
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
    const entry = CHECKOUT_ENTRIES[index];
    if (entry !== "config") {
      assert.equal(digest(packed), baseline.sources[entry as keyof typeof baseline.sources],
        `${specifier}: default source output differs from frozen main ${baseline.main}`);
      assert.equal(compileSource(`@use "material/src/styles/config"; @use "${specifier}";`), packed,
        `${specifier}: loading the default gateway changes CSS`);
    }
  }

  const config = `@use "material/src/styles/config" with (
    $typescale-tokens: true, $spring-tokens: true, $direction-arms: true,
    $contrast-emit: preference, $tag-prefix: "x");`;
  assert.equal(compileSource(config), "", "Configured gateway emits zero CSS, including expanded comments");
  assert.equal(compileSource(`@use "material/src/styles/config";`), "", "Default gateway emits zero CSS");
  const probe = `.probe { --type: #{config.$typescale-tokens}; --spring: #{config.$spring-tokens};
    --direction: #{config.$direction-arms}; --contrast: #{config.$contrast-emit}; --prefix: #{config.$tag-prefix}; }`;
  const combined = compileSource(`${config} @use "material/src/styles/main"; @use "material/src/styles/elements"; ${probe}`);
  for (const value of ["--type: true", "--spring: true", "--direction: true", "--contrast: preference", "--prefix: x",
    "x-button:not(:defined)", "prefers-contrast", "[dir=rtl]"]) assert(combined.includes(value), `Configuration did not propagate: ${value}`);
  for (const value of ["m-button:not(:defined)", "[data-theme-contrast=medium]", "[data-theme-contrast=high]"]) {
    assert(!combined.includes(value), `Configuration retained an excluded selector: ${value}`);
  }
  const defaults = compileSource(`@use "material/src/styles/config"; ${probe}`);
  assert(defaults.includes("--type: false") && defaults.includes("--spring: false") && defaults.includes("--direction: false"));
  const members = compileSource(`@use "sass:meta"; @use "material/src/styles/config";
    .probe { @each $name, $value in meta.module-variables("config") { --#{$name}: #{meta.inspect($value)}; } }`);
  assert.equal((members.match(/--[\w-]+:/g) ?? []).length, 5, "Only the five switches are public; maps are deferred");
  const selective = compileSource(`${config} @use "material/src/styles/themes/ocean";
    @use "material/src/styles/components/button"; @use "material/src/styles/elements/button" as preupgrade-button; ${probe}`);
  assert(selective.includes("x-button:not(:defined)") && selective.includes("--type: true") && selective.includes("--spring: true"));
  assert(!selective.includes("[data-theme-contrast=medium]") && !selective.includes("[data-theme-contrast=high]"));

  for (const entry of ["main", "elements"]) {
    const existing = entry === "main" ? "$contrast-emit: none" : '$tag-prefix: "x"';
    const css = compileSource(`@use "material/src/styles/${entry}" with (${existing}, $typescale-tokens: true, $spring-tokens: true);
      .probe { --type: #{${entry}.$typescale-tokens}; --spring: #{${entry}.$spring-tokens}; }`);
    assert(css.includes("--type: true") && css.includes("--spring: true"), `${entry} convenience forwards`);
    assert(entry === "main" ? !css.includes("data-theme-contrast") : css.includes("x-button:not(:defined)"));
  }
  for (const entry of ["main", "themes"]) {
    for (const value of ["all", "explicit", "preference", "none"]) {
      assert.equal(compileSource(`@use "material/src/styles/${entry}" with ($contrast-emit: ${value});`),
        compileSource(`@use "material/src/styles/config" with ($contrast-emit: ${value}); @use "material/src/styles/${entry}";`),
        `${entry}: existing direct contrast configuration changed`);
    }
  }
  assert.equal(compileSource(`@use "material/src/styles/elements" with ($tag-prefix: "x");`),
    compileSource(`@use "material/src/styles/config" with ($tag-prefix: "x"); @use "material/src/styles/elements";`));
  for (const entry of ["config", "main", "elements"]) {
    for (const [flag, value] of [["typescale-tokens", '"yes"'], ["spring-tokens", "1"]]) {
      assert.throws(() => compileSource(`@use "material/src/styles/${entry}" with ($${flag}: ${value});`),
        error => error instanceof Error && error.message.includes(`$${flag} must be a boolean (true or false), got ${value}.`));
    }
  }
  assert.throws(() => compileSource(`@use "material/src/styles/components/button"; ${config}`), /already loaded/);
  assert.throws(() => compileSource(`${config} @use "material/src/styles/main" with ($typescale-tokens: true);`), /already loaded/);

  // Independent pre-change payloads from main's CI artifact, not candidate-vs-
  // candidate comparisons. The inventory is exact: added default files fail too.
  const groups = new Map<string, string[]>();
  const walk = async (relative = ""): Promise<void> => {
    for (const entry of await readdir(join(fixture.installed, "dist", relative), { withFileTypes: true })) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:js|css)$/.test(path)) {
        const group = path.includes("/") ? path.split("/")[0] : ".";
        const paths = groups.get(group) ?? [];
        paths.push(path);
        groups.set(group, paths);
      }
    }
  };
  await walk();
  const payloads: Record<string, { count: number; sha256: string }> = {};
  for (const [group, paths] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const hash = createHash("sha256");
    for (const path of paths.sort()) hash.update(path + "\0")
      .update((await readFile(join(fixture.installed, "dist", path), "utf8")).replace(/^\/\*! material v[^\n]*\*\/\n?/, ""))
      .update("\0");
    payloads[group] = { count: paths.length, sha256: hash.digest("hex") };
  }
  assert.deepEqual(payloads, baseline.payloads, `Published default JS/CSS differs from main ${baseline.main}, CI ${baseline.ci}`);
  const { renderElement } = await import(pathToFileURL(join(fixture.installed, "dist/ssr/index.js")).href) as typeof import("../src/ssr");
  const random = Math.random;
  Math.random = () => 0.123456;
  try {
    for (const mode of ["inline", "link"] as const) {
      const hash = createHash("sha256");
      for (const row of baseline.ssr.rows) hash.update(row.tag + "\0").update(renderElement(row.tag, row.attributes, row.children,
        mode === "link" ? { styles: "link", cssBase: "/assets/css" } : {})).update("\0");
      assert.equal(hash.digest("hex"), baseline.ssr.modes[mode], `${mode}: published default SSR HTML changed`);
    }
  } finally { Math.random = random; }
  console.log(`Default identity: ${Object.values(payloads).reduce((sum, group) => sum + group.count, 0)} JS/CSS files and inline/link SSR match ${baseline.main} (CI ${baseline.ci}).`);
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
