#!/usr/bin/env bun
// scripts/check-menu-zoom.ts
/**
 * A menu and a select listbox land in a CSS-zoomed document.
 *
 * `zoom` scales the used values: `getBoundingClientRect()` reports zoomed
 * viewport pixels while `style.left/top/width` inside the zoomed subtree are
 * local pixels. A menu that copies its opener's rect straight into those
 * styles lands at the zoom times its offset — at 0.5 the menu opened at half
 * its anchor's coordinates, over the field instead of beside it, and a select
 * listbox was half its field's width (md3.io, 2026-11-25). The check mounts a
 * menu and a select in a document zoomed to 1, 0.7 and 0.5 and asserts, on
 * Chromium and WebKit:
 *
 * - the menu starts at its anchor's left (two pixels of slack, for WebKit's
 *   sub-pixel rounding) and
 *   opens below it with the gap it has at zoom 1 (one pixel of slack);
 * - the select's listbox is as wide as its field (one pixel of slack).
 *
 *   bun run scripts/check-menu-zoom.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium, webkit, type Browser, type Page } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";

const entry = resolve("scripts/menu-zoom-entry.ts");
const bundle = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
assert(bundle.success, String(bundle.logs));
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const css = sass.compileString(directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()), sassOptions()).css;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/components.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
/* Padding on the left keeps the anchor clear of the 16 px viewport side margin, which is a viewport constant and clamps a menu placed at the edge. */
<style>body{margin:0;padding:24px 24px 24px 140px;font-family:sans-serif}#host{width:520px}</style></head>
<body><div id="host"></div><script type="module">import "/components.js";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

const mountMenu = async (page: Page) => {
  await page.evaluate(() => {
    const w = window as unknown as { mtrl: { createButton: (c: unknown) => { element: HTMLElement }; createMenu: (c: unknown) => { element: HTMLElement; open: () => void } }; probeMenu?: { element: HTMLElement; open: () => void } };
    const host = document.querySelector("#host")!;
    host.replaceChildren();
    // Room under the 48 px viewport-top clamp, which is a viewport constant
    // and would otherwise lift the menu and hide the placement.
    const spacer = document.createElement("div");
    spacer.style.height = "200px";
    const button = w.mtrl.createButton({ label: "Open" });
    button.element.id = "opener";
    button.element.append(Object.assign(document.createElement("span"), { textContent: "Open" }));
    host.append(spacer, button.element);
    w.probeMenu = w.mtrl.createMenu({ opener: button.element, items: [{ text: "One" }, { text: "Two" }] });
  });
  await page.waitForTimeout(250);
  return page.evaluate(async () => {
    const w = window as unknown as { probeMenu: { element: HTMLElement; open: () => void } };
    const opener = document.querySelector<HTMLElement>("#opener")!.getBoundingClientRect();
    w.probeMenu.open();
    await new Promise((r) => setTimeout(r, 400));
    const menu = w.probeMenu.element.getBoundingClientRect();
    return { openerLeft: opener.left, openerBottom: opener.bottom, menuLeft: menu.left, menuTop: menu.top };
  });
};

const mountSelect = async (page: Page) => {
  await page.evaluate(() => {
    const w = window as unknown as { mtrl: { createSelect: (c: unknown) => { element: HTMLElement; open: () => void } }; probeSelect?: { element: HTMLElement; open: () => void } };
    const host = document.querySelector("#host")!;
    host.replaceChildren();
    const field = w.mtrl.createSelect({ label: "Pick", options: [{ id: "one", text: "One" }, { id: "two", text: "Two" }] });
    field.element.id = "field";
    host.append(field.element);
    w.probeSelect = field;
  });
  await page.waitForTimeout(250);
  return page.evaluate(async () => {
    const w = window as unknown as { probeSelect: { element: HTMLElement; open: () => void } };
    const field = document.querySelector<HTMLElement>("#field")!.getBoundingClientRect();
    w.probeSelect.open();
    await new Promise((r) => setTimeout(r, 400));
    const list = document.querySelector<HTMLElement>(".mtrl-select__menu, .mtrl-menu")?.getBoundingClientRect();
    return list ? { fieldWidth: field.width, listWidth: list.width, fieldLeft: field.left, listLeft: list.left } : null;
  });
};

const run = async (browser: Browser, engine: string) => {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);

  let referenceGap: number | null = null;
  const rows: string[] = [];
  for (const zoom of [1, 0.7, 0.5]) {
    await page.evaluate((z) => {
      document.documentElement.style.zoom = String(z);
    }, zoom);

    const menu = await mountMenu(page);
    const gap = menu.menuTop - menu.openerBottom;
    if (referenceGap === null) referenceGap = gap;
    assert(
      Math.abs(menu.menuLeft - menu.openerLeft) <= 2,
      `${engine} zoom ${zoom}: the menu starts at its opener's left (${menu.menuLeft.toFixed(1)} against ${menu.openerLeft.toFixed(1)})`,
    );
    // The menu opens below its opener, within the offset it is placed with —
    // the defect this guards against put it over the opener's own space.
    assert(
      gap >= -2 && gap <= 12,
      `${engine} zoom ${zoom}: the menu opens below its opener (gap ${gap.toFixed(1)} px, ${referenceGap.toFixed(1)} at zoom 1)`,
    );
    rows.push(`menu ${zoom}: left ${menu.menuLeft.toFixed(1)}/${menu.openerLeft.toFixed(1)}, gap ${gap.toFixed(1)}`);

    const select = await mountSelect(page);
    assert(select, `${engine} zoom ${zoom}: the select's listbox is in the document`);
    assert(
      Math.abs(select!.listWidth - select!.fieldWidth) <= 1,
      `${engine} zoom ${zoom}: the listbox is as wide as its field (${select!.listWidth.toFixed(1)} against ${select!.fieldWidth.toFixed(1)})`,
    );
    rows.push(`select ${zoom}: ${select!.listWidth.toFixed(1)}/${select!.fieldWidth.toFixed(1)}`);
  }
  assert.deepEqual(errors, [], `${engine}: no uncaught page errors`);
  await page.close();
  return { engine, rows };
};

const results = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try { results.push(await run(chromiumBrowser, "chromium")); } finally { await chromiumBrowser.close(); }
let webkitBrowser: Browser | null = null;
try { webkitBrowser = await webkit.launch({ headless: true }); } catch { console.log("menu zoom: WebKit is not installed here, skipped"); }
if (webkitBrowser) {
  try { results.push(await run(webkitBrowser, "webkit")); } finally { await webkitBrowser.close(); }
}
server.stop(true);
for (const result of results) console.log(`menu zoom ${result.engine}: ${result.rows.join(" | ")}`);
console.log("Menu and select under a zoomed document check passed.");
