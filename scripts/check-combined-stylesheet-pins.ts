// scripts/check-combined-stylesheet-pins.ts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as sass from "sass";

import baseline from "./fixtures/sass-config-baseline.json";
import { combinedStylesheetPayloads, stylesheetPayloadDigest } from "./stylesheet-pins";

assert.equal(Bun.version, baseline.bun, "The frozen baseline uses the CI Bun version");
assert.equal(sass.info, baseline.sass, "The frozen baseline uses the locked Sass compiler");

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
const compileMain = (style: "expanded" | "compressed"): string =>
  sass.compileString('@use "main";', {
    loadPaths: baseline.sourceOptions.loadPaths, style, logger: sass.Logger.silent,
  }).css;

// The contrast pin measures the compressed Sass entry before the build adds its banner.
const contrast = compileMain("compressed");
const measured = {
  sources: { main: sha256(compileMain("expanded")) },
  payloads: Object.fromEntries(await Promise.all(combinedStylesheetPayloads.map(async path =>
    [path, stylesheetPayloadDigest(await readFile(`dist/${path}`, "utf8"))] as const))),
  contrastSplit: { sha256: sha256(contrast), length: contrast.length },
};
const pinned = {
  sources: { main: baseline.sources.main },
  payloads: Object.fromEntries(combinedStylesheetPayloads.map(path => [path, baseline.payloads[path]])),
  contrastSplit: baseline.contrastSplit,
};
console.log(`Combined stylesheet measurements (CI ${process.env.GITHUB_RUN_ID ?? "local"})\n${JSON.stringify(measured, null, 2)}`);
assert.deepEqual(measured, pinned, "Combined stylesheet pins differ from the baseline");
console.log("All four combined stylesheet pins match.");
