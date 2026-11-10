#!/usr/bin/env bun
/**
 * A tooltip must not cover the menu its anchor opens.
 * https://m3.material.io/components/tooltips/guidelines (2026-11-09):
 * "Tooltips shouldn't cover the parent element."
 *
 * On main the plain tooltip stays visible after the anchor is pressed, so its
 * box intersects the open menu and this check fails. On the branch the tooltip
 * hides on press, stays hidden while aria-expanded is true, stays hidden when
 * the menu closes until a new hover or focus, and that new hover or focus
 * shows it again. A show armed on the library default delay before the menu
 * opens stays hidden, and a real held press focuses the anchor without
 * reopening the tooltip.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import * as sass from "sass";
import { TOOLTIP_DEFAULTS } from "../src/components/tooltip/constants";
import { componentStyles } from "./style-manifest";

const css = sass.compileString(`@use "${componentStyles.tooltip.source}";`, {
  loadPaths: [resolve("src/styles")],
  logger: sass.Logger.silent,
}).css;

const bundle = await Bun.build({
  entrypoints: [resolve("src/components/tooltip/index.ts")],
  minify: true,
  target: "browser",
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();

const pageHtml = `<!doctype html><html><head><style>
${css}
body { margin: 0; }
#anchor { position: absolute; left: 200px; top: 160px; width: 48px; height: 48px; }
#menu { position: absolute; left: 80px; top: 216px; width: 320px; height: 160px; background: #ece6f0; }
.mtrl-tooltip { transition: none !important; }
</style></head><body>
<button id="anchor" type="button" aria-haspopup="menu" aria-expanded="false">More</button>
<div id="menu" role="menu">Rename</div>
<script type="module">
import { createTooltip } from "/tooltip.js";
const anchor = document.querySelector("#anchor");
window.createTooltip = createTooltip;
window.tooltip = createTooltip({
  target: anchor,
  text: "Rename, delete, and share",
  showDelay: 0,
  hideDelay: 0,
});
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

type Box = { top: number; left: number; width: number; height: number };

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.url.href);
  await page.waitForFunction(() => Reflect.get(window, "ready") === true);

  const read = () => page.evaluate(() => {
    const tip = document.querySelector(".mtrl-tooltip") as HTMLElement | null;
    const menu = document.getElementById("menu")!;
    const anchor = document.getElementById("anchor")!;
    const a = tip?.getBoundingClientRect();
    const b = menu.getBoundingClientRect();
    const visible = !!tip
      && tip.classList.contains("mtrl-tooltip--visible")
      && tip.getAttribute("aria-hidden") === "false";
    const covers = !!a && visible && a.width > 0 && a.height > 0
      && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const box = (rect: DOMRect | undefined): Box => ({
      top: rect?.top ?? 0,
      left: rect?.left ?? 0,
      width: rect?.width ?? 0,
      height: rect?.height ?? 0,
    });
    return { visible, covers, expanded: anchor.getAttribute("aria-expanded"), tip: box(a), menu: box(b) };
  });

  const setExpanded = (value: "true" | "false") => page.evaluate((next) => {
    document.getElementById("anchor")!.setAttribute("aria-expanded", next);
  }, value);

  await page.hover("#anchor");
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") === true);
  const hovered = await read();
  assert.equal(hovered.visible, true, `hover shows the tooltip ${JSON.stringify(hovered)}`);
  assert.equal(hovered.covers, true, `the open menu sits under the tooltip ${JSON.stringify(hovered)}`);

  await page.dispatchEvent("#anchor", "pointerdown");
  await setExpanded("true");
  await page.dispatchEvent("#anchor", "pointerup");
  const pressed = await read();
  assert.equal(pressed.visible, false, `press hides the tooltip while the menu is open ${JSON.stringify(pressed)}`);
  assert.equal(pressed.covers, false, `tooltip covers the open menu ${JSON.stringify(pressed)}`);

  await setExpanded("false");
  const closed = await read();
  assert.equal(closed.visible, false, `closing the menu does not show the tooltip without a new hover ${JSON.stringify(closed)}`);

  await page.mouse.move(0, 0);
  await page.waitForTimeout(20);
  await page.hover("#anchor");
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") === true);
  const again = await read();
  assert.equal(again.visible, true, `a fresh hover after the menu closes shows the tooltip ${JSON.stringify(again)}`);

  await page.mouse.move(0, 0);
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") !== true);
  await page.locator("#anchor").focus();
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") === true);
  const focused = await read();
  assert.equal(focused.visible, true, `keyboard focus shows the tooltip ${JSON.stringify(focused)}`);

  await page.keyboard.down("Enter");
  await setExpanded("true");
  const keyed = await read();
  assert.equal(keyed.visible, false, `Enter hides the tooltip while the menu is open ${JSON.stringify(keyed)}`);
  assert.equal(keyed.covers, false, `keyboard: tooltip covers the open menu ${JSON.stringify(keyed)}`);

  await page.keyboard.up("Enter");
  await setExpanded("false");
  const keyClosed = await read();
  assert.equal(keyClosed.visible, false, `closing the menu does not show the tooltip without a new focus ${JSON.stringify(keyClosed)}`);

  await page.evaluate(() => (document.getElementById("anchor") as HTMLElement).blur());
  await page.locator("#anchor").focus();
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") === true);
  const refocused = await read();
  assert.equal(refocused.visible, true, `a fresh focus after the menu closes shows the tooltip ${JSON.stringify(refocused)}`);

  // Real press: the pointer stays down across the focus it causes.
  await page.evaluate(() => (document.getElementById("anchor") as HTMLElement).blur());
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") !== true);
  await page.hover("#anchor");
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") === true);
  await page.mouse.down();
  const held = await read();
  assert.equal(held.visible, false, `held pointerdown hides the tooltip and its focus does not reopen it ${JSON.stringify(held)}`);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "anchor", "the press focused the anchor");
  await setExpanded("true");
  const heldOpen = await read();
  assert.equal(heldOpen.visible, false, `the tooltip stays hidden while the press is held and the menu is open ${JSON.stringify(heldOpen)}`);
  await page.mouse.up();
  const released = await read();
  assert.equal(released.visible, false, `releasing the pointer does not reopen the tooltip ${JSON.stringify(released)}`);
  await setExpanded("false");
  const releasedClosed = await read();
  assert.equal(releasedClosed.visible, false, `closing after a real press does not show the tooltip ${JSON.stringify(releasedClosed)}`);
  await page.evaluate(() => (document.getElementById("anchor") as HTMLElement).blur());
  await page.mouse.move(0, 0);
  await page.locator("#anchor").focus();
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") === true);
  const keyedAfter = await read();
  assert.equal(keyedAfter.visible, true, `keyboard focus after the pointer is released shows the tooltip ${JSON.stringify(keyedAfter)}`);
  await page.evaluate(() => (document.getElementById("anchor") as HTMLElement).blur());
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") !== true);
  await page.hover("#anchor");
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") === true);
  const hoveredAfter = await read();
  assert.equal(hoveredAfter.visible, true, `a fresh hover after the pointer is released shows the tooltip ${JSON.stringify(hoveredAfter)}`);

  // Default show delay, omitted from the config. mouseenter arms the show
  // while the menu is closed; the menu opens on the next turn, before the
  // delay. The scheduled callback has to notice.
  await page.evaluate(() => {
    const tip = Reflect.get(window, "tooltip") as { destroy: () => void };
    tip.destroy();
    const anchor = document.getElementById("anchor") as HTMLElement;
    anchor.setAttribute("aria-expanded", "false");
    anchor.blur();
    const create = Reflect.get(window, "createTooltip") as (config: {
      target: HTMLElement;
      text: string;
      hideDelay: number;
    }) => unknown;
    Reflect.set(window, "tooltip", create({
      target: anchor,
      text: "Rename, delete, and share",
      hideDelay: 0,
    }));
    anchor.addEventListener("mouseenter", () => {
      setTimeout(() => anchor.setAttribute("aria-expanded", "true"), 0);
    }, { once: true });
  });
  await page.mouse.move(0, 0);
  await page.hover("#anchor");
  await page.waitForTimeout(TOOLTIP_DEFAULTS.SHOW_DELAY + 50);
  const pending = await read();
  assert.equal(pending.expanded, "true", `the menu opened while the default-delay show was waiting ${JSON.stringify(pending)}`);
  assert.equal(pending.visible, false, `a default-delay show scheduled before the menu opened stays hidden ${JSON.stringify(pending)}`);
  assert.equal(pending.covers, false, `a delayed show covers the open menu ${JSON.stringify(pending)}`);
  await setExpanded("false");
  const pendingClosed = await read();
  assert.equal(pendingClosed.visible, false, `closing the menu does not flush the suppressed show ${JSON.stringify(pendingClosed)}`);
  await page.mouse.move(0, 0);
  await page.hover("#anchor");
  await page.waitForFunction(() => document.querySelector(".mtrl-tooltip")?.classList.contains("mtrl-tooltip--visible") === true);
  const delayedAgain = await read();
  assert.equal(delayedAgain.visible, true, `a fresh hover after the menu closes shows the default-delay tooltip ${JSON.stringify(delayedAgain)}`);

  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  server.stop();
}
