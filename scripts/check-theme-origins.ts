#!/usr/bin/env bun
// scripts/check-theme-origins.ts
//
// The theme-origin metadata on material/core/theme, in a browser and in a
// packed consumer. The metadata is data about the built-in themes' standard
// palettes; it is not a recipe to regenerate one, not an active-theme
// detector, and not a contrast API.
//
//   bun run theme-origins:check
//
// Browser: the bundled core/theme namespace renders every origin record, the
// displayed values equal the API's, authored provenance is labelled honestly
// (autumn reads "not recorded", never its fallback primary), and the theme
// stylesheets the package ships still compute the same colours as named main
// in light and dark at standard contrast, and for baseline at medium and high.
//
// Packed: from the npm tarball, a metadata-only import retains no colour
// engine, CSS or Node-only dependency (a retained engine is ~15 KB gzipped;
// the metadata is a few hundred bytes), the existing schemeToTokens import and
// a root import acquire no metadata through export-star or side effects, the
// declarations name the new exports, and plain Node and Bun import the entry
// unbundled with no document and no JSON import attributes.

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import { chromium } from "playwright";
import { createPackageFixture } from "./package-fixture";
import * as coreTheme from "../src/core/theme";

/** The colours main computes (read from its committed theme sources, unchanged by this feature). */
const MAIN = {
  baseline: { light: "#6750a4", dark: "#d0bcff", mediumLight: "#3c2d63", highLight: "#312259" },
  desert: { light: "#7a580c", dark: "#edc06c" },
  highcontrast: { light: "#312259", dark: "#f5edff" },
  ocean: { light: "#006493", dark: "#8dcdff" },
} as const;

const bundle = await Bun.build({
  entrypoints: ["scripts/fixtures/theme-origins.ts"],
  target: "browser",
  minify: false,
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/theme-origins.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    const theme = path.match(/^\/themes\/([\w-]+)\.css$/)?.[1];
    if (theme) return new Response(Bun.file(`dist/themes/${theme}.css`), { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/themes/baseline.css"><link rel="stylesheet" href="/themes/baseline-contrast.css">
<link rel="stylesheet" href="/themes/desert.css"><link rel="stylesheet" href="/themes/highcontrast.css">
<link rel="stylesheet" href="/themes/ocean.css">
<style>body{margin:0;font-family:sans-serif;padding:16px}table{border-collapse:collapse;margin-bottom:16px}th,td{border:1px solid #888;padding:2px 8px;text-align:left}
div[data-theme]{padding:8px 16px;margin:4px 0;border-radius:8px;background:var(--mtrl-sys-color-surface);color:var(--mtrl-sys-color-on-surface)}</style>
</head><body><script type="module" src="/theme-origins.js"></script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  },
});

const browser = await chromium.launch({ headless: true });
let checks = 0;
let fixture: Awaited<ReturnType<typeof createPackageFixture>> | undefined;

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.locator('body[data-ready="true"]').waitFor();

  // The displayed provenance comes from the API: every row equals the record
  // the check itself imports, and the page rendered all twenty.
  const shown = await page.evaluate(() => (window as unknown as { themeOrigins: { rows: Record<string, string>[]; baselineSeed: string; exports: string[] } }).themeOrigins);
  const expectedRows = Object.entries(coreTheme.THEME_ORIGINS as Record<string, { kind: string; seed: string | null; variant: string | null; contrast: number | null; secondary?: string }>).map(([name, record]) => ({
    name,
    kind: record.kind,
    seed: record.seed === null ? "not recorded" : record.seed,
    variant: record.variant === null ? "no verified recipe" : record.variant,
    contrast: record.contrast === null ? "—" : String(record.contrast),
    ...(record.secondary ? { secondary: record.secondary } : {}),
  }));
  assert.deepEqual(shown.rows, expectedRows, "the displayed rows differ from the API's records");
  assert.equal(shown.rows.length, 20, "the page did not render twenty themes");
  assert.equal(shown.baselineSeed, "#6750a4");
  checks += 3;
  const autumn = shown.rows.find((row) => row.name === "autumn");
  assert.equal(autumn?.seed, "not recorded", "autumn's seed is displayed as not recorded");
  assert.equal(autumn?.seed !== "#795548", true, "autumn must not display its fallback primary as a seed");
  const desert = shown.rows.find((row) => row.name === "desert");
  assert.equal(desert?.secondary, "#4a87c4", "desert carries its custom secondary seed");
  const highcontrast = shown.rows.find((row) => row.name === "highcontrast");
  assert.equal(highcontrast?.contrast, "1", "highcontrast carries contrast 1, not normalized to 0");
  checks += 4;
  for (const name of ["schemeToTokens", "THEME_ROLES", "cornerToken", "BASELINE_SEED", "THEME_ORIGINS"]) {
    assert.ok(shown.exports.includes(name), `the entry still exports ${name}`);
  }
  checks += 5;

  // The shipped stylesheets still compute main's colours: light and dark at
  // standard contrast for all four loaded themes, medium and high for baseline.
  const primaryOf = (name: string) =>
    page.evaluate((theme) => getComputedStyle(document.getElementById(`probe-${theme}`)!).getPropertyValue("--mtrl-sys-color-primary").trim(), name);
  for (const [name, expected] of Object.entries(MAIN) as [string, { light: string; dark: string; mediumLight?: string; highLight?: string }][]) {
    const probe = page.locator(`#probe-${name}`);
    assert.equal(await primaryOf(name), expected.light, `${name} light primary differs from main`);
    await probe.evaluate((element) => element.setAttribute("data-theme-mode", "dark"));
    assert.equal(await primaryOf(name), expected.dark, `${name} dark primary differs from main`);
    await probe.evaluate((element) => element.removeAttribute("data-theme-mode"));
    checks += 2;
  }
  for (const [level, expected] of [["medium", MAIN.baseline.mediumLight], ["high", MAIN.baseline.highLight]] as const) {
    await page.evaluate((contrast) => document.getElementById("probe-baseline")!.setAttribute("data-theme-contrast", contrast), level);
    assert.equal(await primaryOf("baseline"), expected, `baseline ${level} light primary differs from main`);
    await page.evaluate(() => document.getElementById("probe-baseline")!.removeAttribute("data-theme-contrast"));
    checks++;
  }
  assert.deepEqual(errors, [], `page errors: ${errors.join(", ")}`);
  checks++;

  // Packed consumer: the npm tarball, through the package's own exports.
  fixture = await createPackageFixture();
  const { directory, installed } = fixture;
  const declarations = await readFile(join(installed, "core/theme/index.d.ts"), "utf8");
  for (const name of ["BASELINE_SEED", "THEME_ORIGINS", "ThemeOriginVariant", "BuiltInThemeName", "BaselineThemeOrigin", "AuthoredThemeOrigin", "GeneratedThemeOrigin"]) {
    assert.ok(declarations.includes(name), `the shipped declarations do not name ${name}`);
  }
  checks += 7;

  const sizes: Record<string, { raw: number; gz: number }> = {};
  for (const [name, code] of [
    ["metadata-only", "import { THEME_ORIGINS, BASELINE_SEED } from 'material/core/theme';\nexport const origins = THEME_ORIGINS;\nexport const seed = BASELINE_SEED;\n"],
    ["schemeToTokens-only", "export { schemeToTokens, THEME_ROLES, cornerToken } from 'material/core/theme';\n"],
    ["root", "export { createButton } from 'material';\n"],
  ] as const) {
    const entry = join(directory, `${name}.ts`);
    await writeFile(entry, code);
    const result = await build({
      root: directory, configFile: false, envFile: false, logLevel: "error",
      build: { write: false, minify: true, lib: { entry, formats: ["es"] } },
    });
    assert(!("on" in result), "Unexpected Vite watcher");
    const outputs = (Array.isArray(result) ? result : [result]).flatMap(output => output.output);
    const chunks = outputs.filter(output => output.type === "chunk");
    const code_ = chunks.map(chunk => chunk.code).join("\n");
    sizes[name] = { raw: Buffer.byteLength(code_), gz: gzipSync(code_, { level: 9 }).length };
    if (name === "metadata-only") {
      assert.equal(chunks.length, 1, "the metadata import split into more than its entry chunk");
      assert.deepEqual(outputs.filter(output => output.type === "asset").map(asset => asset.name), [], "the metadata import retained an asset (CSS)");
      assert.ok(code_.includes("authored"), "the metadata bundle lost the records");
      assert.ok(code_.includes("006c9c"), "the metadata bundle lost ocean's seed");
      assert.ok(!code_.includes("node:"), "the metadata import retained a Node-only dependency");
      assert.ok(!code_.includes("--mtrl-sys-color"), "the metadata import retained theme CSS");
      assert.ok(sizes[name]!.gz < 1500, `metadata-only retained the colour engine (${sizes[name]!.gz} B gzipped; the engine is ~15 KB)`);
    } else {
      assert.ok(!code_.includes("authored") && !code_.includes("006c9c"), `the ${name} graph acquired the origin metadata`);
    }
    checks++;
  }
  console.log("Packed core/theme consumer sizes (raw / gzip):");
  console.table(sizes);

  // Unbundled: plain Node and Bun import the entry through the exports map,
  // with no bundler, no document and no JSON import attributes.
  const probe = `const m = await import("material/core/theme");
console.log(JSON.stringify({
  resolved: import.meta.resolve("material/core/theme"),
  exports: Object.keys(m).sort(),
  records: Object.keys(m.THEME_ORIGINS).length,
  seed: m.BASELINE_SEED,
  tokens: typeof m.schemeToTokens,
  autumn: m.THEME_ORIGINS.autumn.seed,
}));`;
  const unbundled: Record<string, { resolved: string; records: number; seed: string; tokens: string; autumn: unknown }> = {};
  for (const runtime of [["node", ["node", "--input-type=module", "-e", probe]], ["bun", ["bun", "-e", probe]]] as const) {
    const child = Bun.spawnSync(runtime[1], { cwd: directory, stdout: "pipe", stderr: "pipe" });
    assert.equal(child.exitCode, 0, `${runtime[0]} unbundled import failed:\n${child.stdout}\n${child.stderr}`);
    const read = JSON.parse(child.stdout.toString());
    unbundled[runtime[0]] = read;
    assert.equal(read.records, 20, `${runtime[0]} read fewer than twenty records`);
    assert.equal(read.seed, "#6750a4");
    assert.equal(read.tokens, "function");
    assert.equal(read.autumn, null);
    checks += 4;
  }
  assert.equal(unbundled.node!.resolved, unbundled.bun!.resolved, "Node and Bun resolved the entry differently");
  checks++;
  console.log(`Unbundled import (${unbundled.node!.resolved}): 20 records in Node and Bun, no document, no JSON attributes.`);

  console.log(
    `Passed ${checks} theme-origin checks: twenty records displayed from the API, authored nulls labelled, ` +
      `main's computed colours held in light/dark and baseline medium/high, packed boundaries kept, unbundled imports green.`
  );
} finally {
  await browser.close();
  server.stop();
  await fixture?.cleanup();
}
