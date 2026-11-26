#!/usr/bin/env bun
/**
 * A bottom app bar that auto-hides keeps its actions out of the Tab order.
 *
 * Measured 2026-11-26, Chromium and WebKit, main d8d6c1bc: after the bar
 * hides, it is not inert, and one Tab from the control before it lands on an
 * action inside `.mtrl-bottom-app-bar--hidden`. Showing the bar puts that
 * action back in the order.
 *
 * The page scrolls the way auto-hide does (down past the 10px threshold, then
 * back up). Tab from the button before the bar must miss the hidden bar, and
 * reach it again once the bar shows. On main the hidden action takes focus,
 * so this fails there. Run on main and on the branch:
 *
 *   bun run scripts/check-bottom-app-bar-hidden-inert.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";

import { launchChromium } from "./browser-profile";
import { directionArmsPrelude, sassOptions } from "./build-styles";

const bundle = await Bun.build({
  entrypoints: [resolve("src/components/bottom-app-bar/index.ts")],
  target: "browser",
  format: "esm",
  minify: true,
});
assert(bundle.success, String(bundle.logs));
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const css = sass.compileString(
  directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()),
  sassOptions(),
).css;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/bar.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head>
<body>
<button id="before" type="button">Before</button>
<div id="host"></div>
<div style="height:1600px"></div>
<script type="module">
import { createBottomAppBar } from "/bar.js";
const bar = createBottomAppBar({ autoHide: true });
const action = document.createElement("button");
action.type = "button";
action.textContent = "Action";
bar.addAction(action);
document.querySelector("#host").append(bar.element);
window.bar = bar;
window.ready = true;
</script>
</body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

const context = await launchChromium({ headless: true });
try {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);

  const focusAfterTab = async (scrollY: number) => {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.focus("#before");
    await page.keyboard.press("Tab");
    return page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>(".mtrl-bottom-app-bar")!;
      const active = document.activeElement;
      return {
        hidden: bar.classList.contains("mtrl-bottom-app-bar--hidden"),
        inert: bar.hasAttribute("inert"),
        inside: bar.contains(active),
        active: active instanceof HTMLElement ? active.textContent?.trim() ?? active.tagName : "",
      };
    });
  };

  const hidden = await focusAfterTab(300);
  assert.equal(hidden.hidden, true, "scrolling down hides the bar");
  assert.equal(
    hidden.inside,
    false,
    `Tab reaches inside the hidden bar (${hidden.active}, inert ${hidden.inert})`,
  );
  console.log(`hidden: inert ${hidden.inert}, focus ${JSON.stringify(hidden.active)}`);

  const shown = await focusAfterTab(0);
  assert.equal(shown.hidden, false, "scrolling up shows the bar");
  assert.equal(
    shown.inside,
    true,
    `Tab misses the shown bar (focus ${shown.active})`,
  );
  console.log(`shown: inert ${shown.inert}, focus ${JSON.stringify(shown.active)}`);
} finally {
  await context.close();
  server.stop();
}

console.log("Passed: a hidden bottom app bar stays out of the Tab order, and a shown one is reachable.");
