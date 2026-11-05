#!/usr/bin/env bun
// scripts/check-third-party-notice.ts
/**
 * Build first. The package embeds SVG path data from Material Symbols and
 * Material Icons (Apache-2.0, Copyright Google LLC), and npm does not pack a
 * NOTICE on its own: only package.json's `files` can carry it. This checks the
 * packed file list createPackageFixture() builds from the real tarball:
 *
 * - NOTICE is packed, at the package root;
 * - it names Material Symbols, Material Icons, Google LLC and the Apache
 *   License, Version 2.0;
 * - while a shipped file carries Material Symbols' 960-unit grid, NOTICE names
 *   Material Symbols. The grid is the `viewBox` the glyphs are drawn on; a
 *   notice that stops naming the set while the set still ships fails here.
 *
 * A missing NOTICE fails at the first assertion, which is main before the
 * notice ships.
 */
import assert from "node:assert/strict";
import { join } from "node:path";

import { createPackageFixture } from "./package-fixture";

const SYMBOLS_GRID = "0 -960 960 960";

const fixture = await createPackageFixture();
try {
  const files = fixture.pack.files as { path: string }[];
  const packed = files.map(file => file.path);
  assert(
    packed.includes("NOTICE"),
    "The package packs no NOTICE: npm does not include one by itself, so package.json's `files` must",
  );

  const notice = await Bun.file(join(fixture.installed, "NOTICE")).text();
  for (const name of ["Material Symbols", "Material Icons"]) {
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

  console.log(
    `third-party notice: NOTICE is packed among ${packed.length} files; ` +
      `${shipped.length} shipped file${shipped.length === 1 ? "" : "s"} carry the Material Symbols grid`,
  );
} finally {
  await fixture.cleanup();
}
