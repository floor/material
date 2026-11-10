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
import { optionalStyleFiles, validateOptionalStyleProfiles } from "./optional-style-profiles";

const VARIANTS = ["neutral", "vibrant", "expressive", "fidelity", "content", "monochrome", "rainbow", "fruit-salad"];

// The entries as the checkout holds them (load path `src/styles`) and as a
// consumer writes them (load path `node_modules`, the README's).
const CHECKOUT_ENTRIES = [
  "config",
  "main",
  "themes",
  "elements",
  "element-styles",
  "preupgrade",
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
    if (entry in baseline.sources) {
      assert.equal(digest(packed), baseline.sources[entry as keyof typeof baseline.sources],
        `${specifier}: default source output differs from the frozen baseline ${baseline.tested} (CI ${baseline.ci}); the packed entry compiled to ${digest(packed)}`);
    }
    if (entry !== "config") {
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

  // The payload identity is taken from a CI artifact, never from a local
  // build: baseline.tested names the head and baseline.ci the run whose package
  // job packed this branch — its merge ref, main included — and hashed the
  // installed dist. The components and styles groups therefore hold this
  // branch's additive entry files; the opt-in sheet pair is validated
  // independently below. When a run reports a drift, its failure prints the
  // identity that artifact actually produced; that printed value, together with
  // the run number and head, is the pin, so the next test re-verifies those
  // bytes against the same declared source.
  const optionalFiles = new Set(optionalStyleFiles);
  const profileInputs = new Map<string, string>();
  for (const path of files.filter(path => /^dist\/styles\/[^/]+\.(?:css|js)$/.test(path))) {
    profileInputs.set(path.slice("dist/".length), await readFile(join(fixture.installed, path), "utf8"));
  }
  validateOptionalStyleProfiles(profileInputs);
  const groups = new Map<string, string[]>();
  const walk = async (relative = ""): Promise<void> => {
    for (const entry of await readdir(join(fixture.installed, "dist", relative), { withFileTypes: true })) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:js|css)$/.test(path)) {
        if (optionalFiles.has(path)) continue;
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
  const { renderElement } = await import(pathToFileURL(join(fixture.installed, "dist/ssr/index.js")).href) as typeof import("../src/ssr");
  const random = Math.random;
  Math.random = () => 0.123456;
  const ssrModes: Record<string, string> = {};
  try {
    for (const mode of ["inline", "link"] as const) {
      const hash = createHash("sha256");
      for (const row of baseline.ssr.rows) hash.update(row.tag + "\0").update(renderElement(row.tag, row.attributes, row.children,
        mode === "link" ? { styles: "link", cssBase: "/assets/css" } : {})).update("\0");
      ssrModes[mode] = hash.digest("hex");
    }
  } finally { Math.random = random; }
  const identity = JSON.stringify({ payloads, ssr: { modes: ssrModes } });
  assert.deepEqual(payloads, baseline.payloads,
    `Published default JS/CSS differs from the frozen baseline ${baseline.tested} (${baseline.branch}, CI ${baseline.ci}); the checked artifact produced ${identity}`);
  for (const mode of ["inline", "link"] as const) {
    assert.equal(ssrModes[mode], baseline.ssr.modes[mode],
      `${mode}: published default SSR HTML changed from the frozen baseline ${baseline.tested} (CI ${baseline.ci}); the checked artifact produced ${identity}`);
  }
  console.log(`Default identity: ${Object.values(payloads).reduce((sum, group) => sum + group.count, 0)} JS/CSS files and inline/link SSR match the frozen baseline ${baseline.tested} (${baseline.branch}, CI ${baseline.ci}).`);
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
  const typographyCombined = contract(shared + '@use "PUBLIC/main"; @use "PUBLIC/elements";', true);
  assert.equal(typographyCombined, contract(shared + '@use "PUBLIC/main"; @use "PUBLIC/elements";', false));
  assert(typographyCombined.includes("x-button:not(:defined)") && !typographyCombined.includes("m-button:not(:defined)"), "shared tag prefix did not propagate");
  assert(!typographyCombined.includes("data-theme-contrast"), "shared contrast configuration did not propagate");
  assert(typographyCombined.includes("var(--mtrl-sys-typescale-label-large-font-size, 14px)"), "shared role emission did not propagate");
  for (const source of [
    '@use "PUBLIC/main" with ($typescale-tokens: true, $contrast-emit: none);',
    '@use "PUBLIC/elements" with ($typescale-tokens: true, $tag-prefix: "x");',
  ]) assert.equal(contract(source, true), contract(source, false), "public forwards differ after packing");
  for (const key of ["button", "progress", "ripple", "text-field", "badge", "button-group", "icon-button", "card", "tabs"]) {
    const source = `@use "PUBLIC/config" with ($typescale-tokens: true); @use "PUBLIC/element-styles" with ($name: "${key}");`;
    assert.equal(contract(source, true), contract(source, false), `${key}: app stylesheet differs after packing`);
  }
  const layered = '@use "PUBLIC/preupgrade" with ($typescale-tokens: true, $tag-prefix: "x");';
  assert.equal(contract(layered, true), contract(layered, false), "layered app preupgrade differs after packing");
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
