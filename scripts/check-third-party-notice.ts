#!/usr/bin/env bun
// scripts/check-third-party-notice.ts
/**
 * Build first. The package embeds SVG path data from Material Symbols and
 * Material Icons (Apache-2.0, Copyright Google LLC), and npm does not pack a
 * NOTICE on its own: only package.json's `files` can carry it. This checks the
 * packed file list createPackageFixture() builds from the real tarball:
 *
 * - NOTICE is packed, at the package root;
 * - it names Material Symbols, Material Icons, material-color-utilities,
 *   Google LLC and the Apache License, Version 2.0;
 * - while a shipped file carries Material Symbols' 960-unit grid, NOTICE names
 *   Material Symbols. The grid is the `viewBox` the glyphs are drawn on; a
 *   notice that stops naming the set while the set still ships fails here;
 * - every packed `dist/theme/vendor/**/*.js` file carries the one-line
 *   `@license` pointer to `NOTICE` with the exact copyright year from its
 *   `src/theme/vendor/**/*.js` source.
 *
 * A missing NOTICE fails at the first assertion, which is main before the
 * notice ships.
 */
import assert from "node:assert/strict";
import { join } from "node:path";

import { createPackageFixture } from "./package-fixture";

const ROOT = join(import.meta.dir, "..");
const SYMBOLS_GRID = "0 -960 960 960";
const VENDOR_POINTER_RE = /^\/\*! @license Copyright (20\d\d) Google LLC \| Apache-2\.0 \(see NOTICE\) \*\/\n/;

const fixture = await createPackageFixture();
try {
  const files = fixture.pack.files as { path: string }[];
  const packed = files.map(file => file.path);
  assert(
    packed.includes("NOTICE"),
    "The package packs no NOTICE: npm does not include one by itself, so package.json's `files` must",
  );

  const notice = await Bun.file(join(fixture.installed, "NOTICE")).text();
  for (const name of ["Material Symbols", "Material Icons", "material-color-utilities"]) {
    assert(notice.includes(name), `NOTICE does not name ${name}`);
  }
  for (const term of ["Google LLC", "Apache License, Version 2.0"]) {
    assert(notice.includes(term), `NOTICE does not state ${term}`);
  }

  const shipped: string[] = [];
  for (const file of files) {
    if (!/\.(?:js|css)$/.test(file.path)) continue;
    const text = await Bun.file(join(fixture.installed, file.path)).text();
    if (text.includes(SYMBOLS_GRID)) shipped.push(file.path);
  }
  assert(
    !shipped.length || notice.includes("Material Symbols"),
    `Material Symbols path data ships (${shipped.slice(0, 3).join(", ")}${shipped.length > 3 ? ", …" : ""}), but NOTICE does not name Material Symbols`,
  );

  const packedVendor = packed
    .filter(path => path.startsWith("dist/theme/vendor/") && path.endsWith(".js"))
    .sort();
  assert(
    packedVendor.length >= 20,
    `Expected at least 20 packed dist/theme/vendor/**/*.js files, found ${packedVendor.length}`,
  );
  for (const packedPath of packedVendor) {
    const distText = await Bun.file(join(fixture.installed, packedPath)).text();
    const match = VENDOR_POINTER_RE.exec(distText);
    assert(
      match !== null,
      `${packedPath}: missing or malformed Apache-2.0 NOTICE pointer banner on line 1`,
    );
    const srcPath = packedPath.replace(/^dist\//, "src/");
    const srcText = await Bun.file(join(ROOT, srcPath)).text();
    const srcYear = /Copyright (20\d\d) Google LLC/.exec(srcText)?.[1];
    assert.equal(
      match[1],
      srcYear,
      `${packedPath}: pointer copyright year (${match[1]}) does not match ${srcPath} (${srcYear})`,
    );
  }

  console.log(
    `third-party notice: NOTICE is packed among ${packed.length} files; ` +
      `${shipped.length} shipped file${shipped.length === 1 ? "" : "s"} carry the Material Symbols grid; ` +
      `${packedVendor.length} vendored theme files carry the NOTICE pointer`,
  );
} finally {
  await fixture.cleanup();
}
