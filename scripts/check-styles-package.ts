#!/usr/bin/env bun
// scripts/check-styles-package.ts
/**
 * Build first. Compile every public Sass entry from the packed tarball, as a
 * consumer does, and assert the partials no entry reaches stay out of it.
 *
 * The public Sass API is the one the README states and the Atlas decision of
 * 2026-11-01 records: the `themes`, `main` and `elements` entries, and the
 * eight M3 scheme-variant theme files a theme builder reads by path. A file
 * any of them loads has to ship, and a partial none of them loads does not.
 */
import assert from "node:assert/strict";
import { join } from "node:path";
import * as sass from "sass";
import { createPackageFixture } from "./package-fixture";

// A specifier a consumer writes, against the README's load path.
const ENTRIES = [
  "material/src/styles/main",
  "material/src/styles/themes",
  "material/src/styles/elements",
  // The M3 scheme variants, read by path: the themes entry forwards the twelve
  // built-in themes, not these, and md3.io loads them this way.
  ...["neutral", "vibrant", "expressive", "fidelity", "content", "monochrome", "rainbow", "fruit-salad"]
    .map(name => `material/src/styles/themes/${name}`),
];

// Loaded by no public entry: internal, and not packed (1,091 B unpacked).
const INTERNAL = [
  "src/styles/abstract/_config.scss",
  "src/styles/base/_foundation.scss",
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
  for (const specifier of ENTRIES) {
    try {
      sass.compileString(`@use "${specifier}";`, { loadPaths, logger: sass.Logger.silent });
    } catch (error) {
      throw new Error(`${specifier} does not compile from the packed tarball: ${(error as Error).message}`, { cause: error });
    }
  }
  console.log(`Passed styles package: ${ENTRIES.length} public Sass entries compile from the packed tarball, and ${INTERNAL.length} internal partials are absent.`);
} finally {
  await fixture.cleanup();
}
