#!/usr/bin/env bun
/**
 * A plain tooltip stays visible until 1.5 s after the pointer leaves its trigger.
 * https://m3.material.io/components/tooltips/guidelines (2026-11-27):
 * "Both plain and rich tooltips disappear 1.5 seconds after navigating away from the target region."
 *
 * On main the default hide delay is about 100 ms, so the tooltip is already
 * gone at 1,400 ms. On this branch it is still shown then, and gone once
 * 1,500 ms and the 150 ms exit have passed. The check uses the default delay.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { webkit, type Browser, type Page } from "playwright";
import * as sass from "sass";

import { launchChromium } from "./browser-profile";
import { settle } from "./browser-settle";
import { TOOLTIP_DEFAULTS } from "../src/components/tooltip/constants";
import { componentStyles } from "./style-manifest";

const EXIT_MS = 150;
const hideDelay = TOOLTIP_DEFAULTS.HIDE_DELAY;

const css = sass.compileString(`@use "${componentStyles.tooltip.source}";`, {
  loadPaths: [resolve("src/styles")],
  logger: sass.Logger.silent,
}).css;

const bundle = await Bun.build({
  entrypoints: [resolve("src/components/tooltip/index.ts")],
  target: "browser",
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0]!.text();

const pageHtml = `<!doctype html><html><head><style>
${css}
body { margin: 0; }
#anchor { position: fixed; left: 320px; top: 180px; width: 40px; height: 40px; }
</style></head><body>
<button id="anchor" type="button">Save</button>
<script type="module">
import { createTooltip } from "/tooltip.js";
createTooltip({ target: document.querySelector("#anchor"), text: "Save", variant: "plain", showDelay: 0 });
window.ready = true;
</script></body></html>`;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/tooltip.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    return new Response(pageHtml, { headers: { "Content-Type": "text/html" } });
  },
});

const read = (page: Page) => page.evaluate(() => {
  const tip = document.querySelector(".mtrl-tooltip") as HTMLElement | null;
  if (!tip) return { visible: false, opacity: 0 };
  return {
    visible: tip.classList.contains("mtrl-tooltip--visible"),
    opacity: Number(getComputedStyle(tip).opacity),
  };
});

const run = async (page: Page, engine: string) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.url.href);
  await page.waitForFunction(() => Reflect.get(window, "ready") === true);
  await page.locator("#anchor").hover();
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") === true);
  // The visible class lands at the start of the enter fade. Reading then
  // sees opacity 0 in Chromium and a mid-fade value in WebKit.
  await settle(page, { target: ".mtrl-tooltip" });
  const shown = await read(page);
  assert.equal(shown.visible, true, `${engine}: hover did not show the tooltip`);
  assert.ok(shown.opacity > 0.9, `${engine}: the shown tooltip is not opaque (${shown.opacity})`);

  await page.mouse.move(8, 8);
  const leftAt = Date.now();
  await page.waitForTimeout(1400);
  const during = await read(page);
  assert.equal(during.visible, true, `${engine}: the tooltip was already hidden at 1,400 ms ${JSON.stringify(during)}`);
  assert.ok(during.opacity > 0.9, `${engine}: the tooltip had started leaving at 1,400 ms (${during.opacity})`);

  const rest = hideDelay + EXIT_MS - (Date.now() - leftAt) + 40;
  await page.waitForTimeout(Math.max(0, rest));
  const after = await read(page);
  assert.equal(after.visible, false, `${engine}: the tooltip was still shown after 1,500 ms plus its exit ${JSON.stringify(after)}`);
  assert.ok(after.opacity < 0.05, `${engine}: the tooltip had not finished leaving (${after.opacity})`);
  assert.deepEqual(errors, [], `${engine}: ${errors.join("\n")}`);
  console.log(`${engine}: still shown at 1,400 ms, hidden after ${hideDelay} ms plus the ${EXIT_MS} ms exit`);
};

const pageOptions = { viewport: { width: 800, height: 600 }, reducedMotion: "no-preference" as const };

const chromiumContext = await launchChromium({ headless: true, ...pageOptions });
try {
  const page = await chromiumContext.newPage();
  await run(page, "chromium");
  await page.close();
} finally {
  await chromiumContext.close();
}

const webkitBrowser: Browser = await webkit.launch({ headless: true });
const webkitContext = await webkitBrowser.newContext(pageOptions);
try {
  const page = await webkitContext.newPage();
  await run(page, "webkit");
  await page.close();
} finally {
  await webkitBrowser.close();
}

server.stop(true);
// After the browser, so a branch whose default is still 100 ms fails on the
// 1,400 ms read above, not on this constant before a browser opens.
assert.equal(hideDelay, 1500);
console.log("Plain tooltip hide delay is 1,500 ms after the pointer leaves.");
