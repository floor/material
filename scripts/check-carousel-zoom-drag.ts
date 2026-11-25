#!/usr/bin/env bun
// scripts/check-carousel-zoom-drag.ts
/**
 * A carousel drag follows the pointer in a CSS-zoomed document.
 *
 * A pointer delta is in zoomed viewport pixels while the scroller's position
 * is in the element's own pixels, so under `zoom` the strip moved the delta
 * times the zoom: a 120 px drag moved 92 px at 0.7 and 66 at 0.5 (md3.io,
 * 2026-11-25). The check mounts the factory carousel in a document zoomed to
 * 1, 0.7 and 0.5, drives a 120 px drag with pointer events at viewport
 * coordinates, and asserts the strip moves 120 px as the viewport sees it;
 * it also drives the owner's click-then-drag shape. Chromium and WebKit.
 *
 *   bun run scripts/check-carousel-zoom-drag.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium, webkit, type Browser, type Page } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";

const entry = resolve("scripts/carousel-zoom-drag-entry.ts");
const bundle = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
assert(bundle.success, String(bundle.logs));
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const css = sass.compileString(directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()), sassOptions()).css;
const image = "data:image/gif;base64,R0lGODlhAQABAIAAAP8AAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/carousel.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;padding:24px;font-family:sans-serif}</style></head>
<body><div id="host" style="width:760px;height:240px"></div><script type="module">import "/carousel.js";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

/** One drag in page-side pointer events, so the coordinates are the page's own under zoom. */
const dragBy = async (page: Page, dx: number) =>
  page.evaluate(async ({ dx }) => {
    const scroller = document.querySelector<HTMLElement>(".mtrl-carousel__scroller")!;
    const box = scroller.getBoundingClientRect();
    const y = box.top + box.height / 2;
    const x0 = box.left + box.width * 0.7;
    const send = (type: string, x: number, buttons: number) => {
      scroller.dispatchEvent(new PointerEvent(type, {
        clientX: x, clientY: y, bubbles: true, composed: true, pointerId: 1, pointerType: "mouse",
        button: type === "pointerup" ? 0 : 0, buttons,
      }));
    };
    const before = scroller.scrollLeft;
    send("pointerdown", x0, 1);
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      send("pointermove", x0 + (dx * i) / steps, 1);
      await new Promise((r) => setTimeout(r, 16));
    }
    send("pointerup", x0 + dx, 0);
    await new Promise((r) => setTimeout(r, 300));
    return { before, after: scroller.scrollLeft };
  }, { dx });

const run = async (browser: Browser, engine: string) => {
  const page = await browser.newPage({ viewport: { width: 900, height: 400 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
  const rows: string[] = [];
  for (const zoom of [1, 0.7, 0.5]) {
    await page.evaluate(({ zoom, image }) => {
      document.documentElement.style.zoom = String(zoom);
      const host = document.querySelector("#host")!;
      host.replaceChildren();
      const carousel = (window as unknown as { createCarousel: (c: unknown) => { element: HTMLElement } }).createCarousel({
        variant: "multi-browse", snap: false, gap: 8, padding: 16,
        slides: Array.from({ length: 8 }, (_, i) => ({ title: `Slide ${i}`, image, width: 200, height: 160 })),
      });
      host.append(carousel.element);
    }, { zoom, image });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      document.querySelector<HTMLElement>(".mtrl-carousel__scroller")!.scrollLeft = 200;
    });
    const moved = await dragBy(page, -120);
    // What the viewport saw: the scroller's own pixels times the zoom.
    const visible = (moved.after - moved.before) * zoom;
    rows.push(`${zoom}: ${visible.toFixed(1)} px seen`);
    assert(
      Math.abs(visible - 120) <= 12,
      `${engine} zoom ${zoom}: a 120 px drag moves the strip 120 px as the viewport sees it (${visible.toFixed(1)} px; scrollLeft ${moved.before.toFixed(1)} → ${moved.after.toFixed(1)})`,
    );
  }
  // The owner's shape: click a slide, then drag — the drag distance must not
  // halve after the click (md3.io saw ~half on 3.16.4; not reproduced on main
  // at cefd0acb, where it moves the full distance).
  await page.evaluate(({ image }) => {
    document.documentElement.style.zoom = "1";
    const host = document.querySelector("#host")!;
    host.replaceChildren();
    const carousel = (window as unknown as { createCarousel: (c: unknown) => { element: HTMLElement } }).createCarousel({
      variant: "multi-browse", snap: false, gap: 8, padding: 16,
      slides: Array.from({ length: 8 }, (_, i) => ({ title: `Slide ${i}`, image, width: 200, height: 160 })),
    });
    host.append(carousel.element);
  }, { image });
  await page.waitForTimeout(400);
  const afterClick = await page.evaluate(async () => {
    const scroller = document.querySelector<HTMLElement>(".mtrl-carousel__scroller")!;
    const box = scroller.getBoundingClientRect();
    const items = [...scroller.querySelectorAll<HTMLElement>(".mtrl-carousel__item")];
    const last = items.filter((item) => { const r = item.getBoundingClientRect(); return r.right > box.left && r.left < box.right - 1; }).at(-1)!;
    const r = last.getBoundingClientRect();
    const x = Math.min(r.left + r.width / 2, box.right - 20);
    const y = box.top + box.height / 2;
    for (const type of ["pointerdown", "pointerup"]) {
      last.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, composed: true, pointerId: 1, pointerType: "mouse", button: 0, buttons: type === "pointerdown" ? 1 : 0 }));
    }
    last.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, bubbles: true, composed: true }));
    await new Promise((r2) => setTimeout(r2, 900));
    return scroller.scrollLeft;
  });
  const clickedDrag = await dragBy(page, -120);
  const clickSeen = clickedDrag.after - clickedDrag.before;
  console.log(`${engine} click-then-drag zoom 1: ${clickSeen.toFixed(1)} px moved (from ${afterClick.toFixed(1)})`);
  assert(Math.abs(clickSeen - 120) <= 12, `${engine} click-then-drag zoom 1: a 120 px drag moves 120 px (${clickSeen.toFixed(1)} px)`);

  assert.deepEqual(errors, [], `${engine}: no uncaught page errors`);
  await page.close();
  return { engine, rows };
};

const results = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try { results.push(await run(chromiumBrowser, "chromium")); } finally { await chromiumBrowser.close(); }
let webkitBrowser: Browser | null = null;
try { webkitBrowser = await webkit.launch({ headless: true }); } catch { console.log("carousel zoom drag: WebKit not installed here, skipped"); }
if (webkitBrowser) {
  try { results.push(await run(webkitBrowser, "webkit")); } finally { await webkitBrowser.close(); }
}
server.stop(true);
for (const result of results) console.log(`carousel zoom drag ${result.engine}: ${result.rows.join(" | ")}`);
console.log("Carousel drag under a zoomed document check passed.");
