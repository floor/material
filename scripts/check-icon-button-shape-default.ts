#!/usr/bin/env bun
// scripts/check-icon-button-shape-default.ts
/**
 * An icon button keeps its resting shape when the shape key is present but
 * undefined — the call a spread options object makes.
 *
 * `createIconButton({ size: "m", shape: undefined })` merges `undefined` over
 * the default "round", and the shape class is pushed only when the value is
 * truthy. A container without `--round` falls back to the base rule, which is
 * the default size's radius: the button keeps its size's height (the size
 * classes are separate) and takes the s radius (20 px) at every size. The
 * shape is now derived after the merge (config.shape || "round"), so the
 * circle radius and the selected and pressed overrides keyed on --round hold
 * for the documented default and for the spread call alike.
 *
 * The check mounts filled round buttons at four sizes, each through a spread
 * whose shape key is present and undefined, and asserts the radius is half
 * the container height and the element carries `--round`.
 *
 *   bun run scripts/check-icon-button-shape-default.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium, webkit, type Browser } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";

const entry = resolve("scripts/icon-button-shape-entry.ts");
const bundle = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
assert(bundle.success, String(bundle.logs));
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const css = sass.compileString(directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()), sassOptions()).css;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/icon-button.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;padding:24px;font-family:sans-serif}#host{width:520px}</style></head>
<body><div id="host"></div><script type="module">import "/icon-button.js";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

type Measured = { height: number; radius: number; className: string };

const run = async (browser: Browser, engine: string) => {
  const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
  const rows: string[] = [];
  const failures: string[] = [];
  for (const [size, height] of [["xs", 32], ["s", 40], ["m", 56], ["l", 96], ["xl", 136]] as const) {
    // The call a spread options object makes: the shape key is present with
    // the value of an option nobody set.
    const measured = (await page.evaluate((sizeName) => {
      const host = document.querySelector("#host")!;
      host.replaceChildren();
      const options: { shape?: string } = {};
      const create = (window as unknown as { createIconButton: (config: Record<string, unknown>) => { element: HTMLElement } }).createIconButton;
      const button = create({ icon: "<svg width='24' height='24'></svg>", ariaLabel: "Button", variant: "filled", size: sizeName, shape: options.shape });
      host.append(button.element);
      const rect = button.element.getBoundingClientRect();
      const style = getComputedStyle(button.element);
      return { height: rect.height, radius: parseFloat(style.borderTopLeftRadius), className: button.element.className };
    }, size)) as Measured;
    if (measured.height !== height) failures.push(`${engine} ${size}: the container is ${height} px tall, measured ${measured.height}`);
    if (!measured.className.includes("mtrl-icon-button--round")) failures.push(`${engine} ${size}: the element carries --round (got "${measured.className}")`);
    if (measured.radius !== height / 2) failures.push(`${engine} ${size}: the round radius is half the ${height} px height, measured ${measured.radius} px`);
    rows.push(`${size} ${measured.height}px/${measured.radius}px`);
  }
  await page.close();
  assert.deepEqual(failures, [], `${engine}: the spread call keeps the resting shape`);
  return `${engine}: ${rows.join(", ")}`;
};

const results: string[] = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try { results.push(await run(chromiumBrowser, "chromium")); } finally { await chromiumBrowser.close(); }
let webkitBrowser: Browser | null = null;
try { webkitBrowser = await webkit.launch({ headless: true }); } catch { console.log("icon button shape: WebKit not installed here, skipped"); }
if (webkitBrowser) {
  try { results.push(await run(webkitBrowser, "webkit")); } finally { await webkitBrowser.close(); }
}
server.stop(true);
for (const result of results) console.log(`icon button shape default ${result}`);
console.log("Icon button shape default check passed.");
