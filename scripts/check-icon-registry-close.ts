/** Creation-time close-role overrides, with styled factory and element controls. */
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import * as sass from "sass";
import { componentStyles } from "./style-manifest";
import type { CloseRegistryReport } from "./fixtures/icon-registry-close";

const options = { loadPaths: [resolve("src/styles")], logger: sass.Logger.silent };
const css: Record<string, string> = {};
for (const name of ["button", "progress", "dialog", "divider", "fab", "fab-menu", "menu", "chips"]) {
  css[name] = sass.compileString(`@use "${componentStyles[name].source}";`, options).css;
}
css.ripple = sass.compileString('@use "utilities/ripple";', options).css;
const full = sass.compile("src/styles/main.scss", { logger: sass.Logger.silent }).css;
const built = await Bun.build({ entrypoints: ["scripts/fixtures/icon-registry-close.ts"], target: "browser" });
assert(built.success, String(built.logs));
const js = await built.outputs[0].text();
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === "/app.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
  if (path === "/shadow.json") return Response.json(css);
  if (path === "/styles.css") return new Response(full, { headers: { "Content-Type": "text/css" } });
  return new Response('<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head><body><script type="module" src="/app.js"></script></body></html>', { headers: { "Content-Type": "text/html" } });
} });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "warning" && message.text().includes("has no CSS")) errors.push(message.text()); });
  await page.goto(server.url.href);
  await page.waitForFunction(() => Reflect.has(window, "closeRegistryReport"));
  const report = await page.evaluate(() => Reflect.get(window, "closeRegistryReport")) as CloseRegistryReport;
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify({ ...report, errors }, null, 2) + "\n");
  assert.deepEqual(errors, []);
  const failed = report.checks.filter(row => !row.pass).map(row => row.name);
  console.log(`Close registry: ${report.checks.length} checks, ${failed.length} failures`, JSON.stringify(failed));
  assert.deepEqual(failed, []);
} finally {
  await browser.close(); server.stop(true);
}
