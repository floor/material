#!/usr/bin/env bun
// scripts/check-carousel-click-drag.ts
/**
 * A drag ends where it is released, and focus never drags it back.
 *
 * A pointer gesture moves focus to the slide under it — the press's default
 * action — and the carousel's focus-follow, meant for the keyboard, treated
 * that focus as a selection: after a click, a drag, and the focus the release
 * leaves behind, the strip glided back to the clicked slide with snapping
 * off (owner, 2026-11-25, multi-browse). The check drives the sequence with
 * real held drags (a press, moves over frames, a release) in Chromium and
 * WebKit and asserts, with snapping off, that the strip rests where it was
 * released after the release's focus lands; with snapping on, that it settles
 * on the snap point nearest the release. It also keeps the two behaviours the
 * guard must not swallow: a click selects its slide, and the arrows move the
 * strip from the focused slide.
 *
 *   bun run scripts/check-carousel-click-drag.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium, webkit, type Browser, type Page } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";

const bundle = await Bun.build({ entrypoints: [resolve("scripts/carousel-click-drag-entry.ts")], target: "browser", format: "esm", minify: true });
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
<style>body{margin:0;padding:24px}#host{width:760px;height:240px}</style></head>
<body><div id="host"></div><script type="module">import "/carousel.js";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

/** The scroller's position and the slides' boxes, as the page sees them. */
const read = (page: Page) =>
  page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>(".mtrl-carousel__scroller")!;
    const box = scroller.getBoundingClientRect();
    const items = [...scroller.querySelectorAll<HTMLElement>(".mtrl-carousel__item")].map((item) => {
      const r = item.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    const snaps = [...document.querySelectorAll<HTMLElement>(".mtrl-carousel__snap")].map((el) => parseFloat(el.style.left || el.style.right || "0"));
    return { left: scroller.scrollLeft, box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom }, items, snaps };
  });

const mount = async (page: Page, snap: boolean) => {
  await page.evaluate(({ snap, image }) => {
    document.querySelector("#host")!.replaceChildren();
    const carousel = (window as unknown as { createCarousel: (c: unknown) => { element: HTMLElement } }).createCarousel({
      variant: "multi-browse", snap,
      slides: Array.from({ length: 8 }, (_, i) => ({ title: `Slide ${i}`, image, width: 200, height: 160 })),
    });
    document.querySelector("#host")!.append(carousel.element);
  }, { snap, image });
  await page.waitForTimeout(400);
};

/** A held drag: press, move over frames without a final flick, release. */
const drag = async (page: Page, fromX: number, toX: number, y: number) => {
  await page.mouse.move(fromX, y);
  await page.mouse.down();
  await page.waitForTimeout(60);
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(fromX + ((toX - fromX) * i) / steps, y);
    await page.waitForTimeout(16);
  }
  // The last moves are slow and short, so the velocity the release reads is
  // under the fling threshold: the settle can only be the snap rule or
  // nothing, and the assertion can name the nearest snap exactly.
  for (let i = 1; i <= 3; i++) {
    await page.mouse.move(toX - 6 + (i * 2), y);
    await page.waitForTimeout(90);
  }
  await page.mouse.up();
};

const run = async (browser: Browser, engine: string, snap: boolean) => {
  const page = await browser.newPage({ viewport: { width: 900, height: 400 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
  await mount(page, snap);
  const label = `${engine} snap=${snap}`;

  let state = await read(page);
  assert(state.snaps.length > 1, `${label}: the carousel has snap points`);
  const midY = (state.box.top + state.box.bottom) / 2;

  // 1. A click selects: the last slide that is showing goes to its snap.
  const lastVisible = state.items.filter((item) => item.right > state.box.left + 1 && item.left < state.box.right - 1).at(-1)!;
  const clickX = Math.min((lastVisible.left + lastVisible.right) / 2, state.box.right - 24);
  await page.mouse.move(Math.max(clickX, state.box.left + 12), (lastVisible.top + lastVisible.bottom) / 2);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(900);
  const afterClick = await read(page);
  assert(afterClick.left > 100, `${label}: a click on a showing slide selects it and scrolls to it (${state.left} → ${afterClick.left})`);

  // 2. A held drag from the slide at the leading edge towards the middle.
  state = afterClick;
  const leading = state.items.find((item) => item.right > state.box.left + 1 && item.left < state.box.left + 200) ?? state.items[0]!;
  const grabX = Math.max(leading.left + 60, state.box.left + 12);
  const travel = (state.box.right - state.box.left) * 0.45;
  await drag(page, grabX, Math.min(grabX + travel, state.box.right - 12), midY);
  const released = await read(page);
  assert(released.left < state.left - 100, `${label}: the drag moved the strip (${state.left} → ${released.left})`);

  // 3. The focus the release leaves behind: the browser moves focus to a
  // slide, and with snapping off the strip must not move for it.
  const focusIndex = await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>(".mtrl-carousel__scroller")!;
    const box = scroller.getBoundingClientRect();
    const items = [...scroller.querySelectorAll<HTMLElement>(".mtrl-carousel__item")];
    const visible = items.findIndex((item) => {
      const r = item.getBoundingClientRect();
      return r.right > box.left + 1 && r.left < box.right - 1;
    });
    // Exactly what the sequence does: the slide the pointer is over takes the
    // press's focus, and the release's focus lands on the leading slide.
    (items[visible === -1 ? 0 : visible] as HTMLElement).focus({ preventScroll: true });
    return visible;
  });
  await page.waitForTimeout(900);
  const afterFocus = await read(page);
  assert(focusIndex >= 0, `${label}: a slide was there to focus`);
  if (snap) {
    const target = afterFocus.snaps.reduce((best, position, i) => Math.abs(position - released.left) < Math.abs(afterFocus.snaps[best]! - released.left) ? i : best, 0);
    assert(Math.abs(afterFocus.left - afterFocus.snaps[target]!) <= 1, `${label}: the settle lands on the snap nearest the release (${released.left.toFixed(0)} → ${afterFocus.left.toFixed(0)}, nearest ${afterFocus.snaps[target]!.toFixed(0)})`);
  } else {
    assert(Math.abs(afterFocus.left - released.left) <= 1, `${label}: snapping off, the strip rests where it was released, though the release's focus moved (${released.left.toFixed(0)} → ${afterFocus.left.toFixed(0)})`);
  }

  // 4. The keyboard keeps its follow-focus: an arrow from a focused slide
  // moves the strip to its neighbour.
  const focused = await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>(".mtrl-carousel__scroller")!;
    const items = [...scroller.querySelectorAll<HTMLElement>(".mtrl-carousel__item")];
    const box = scroller.getBoundingClientRect();
    const index = items.findIndex((item) => {
      const r = item.getBoundingClientRect();
      return r.right > box.left + 1 && r.left < box.right - 1;
    });
    (items[index === -1 ? 0 : index] as HTMLElement).focus({ preventScroll: true });
    return index === -1 ? 0 : index;
  });
  const beforeArrow = await read(page);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(900);
  const afterArrow = await read(page);
  const nextSnap = beforeArrow.snaps[focused + 1];
  assert(nextSnap !== undefined, `${label}: the focused slide has a neighbour`);
  assert(Math.abs(afterArrow.left - nextSnap) <= 1, `${label}: the arrow from the focused slide (${focused}) moves the strip to its neighbour (${beforeArrow.left.toFixed(0)} → ${afterArrow.left.toFixed(0)}, snap ${nextSnap.toFixed(0)})`);

  // 5. A plain click (no drag) still selects its slide.
  state = await read(page);
  const target = state.items.filter((item) => item.right > state.box.left + 200 && item.left < state.box.right - 1).at(-1)!;
  await page.mouse.move(Math.min((target.left + target.right) / 2, state.box.right - 24), (target.top + target.bottom) / 2);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(900);
  const afterClickAgain = await read(page);
  assert(Math.abs(afterClickAgain.left - state.left) > 1, `${label}: a click without a drag still selects its slide (${state.left.toFixed(0)} → ${afterClickAgain.left.toFixed(0)})`);

  assert.deepEqual(errors, [], `${label}: no uncaught page errors`);
  await page.close();
  return { label, afterClick: afterClick.left, released: released.left, afterFocus: afterFocus.left };
};

const results = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try {
  for (const snap of [false, true]) results.push(await run(chromiumBrowser, "chromium", snap));
} finally {
  await chromiumBrowser.close();
}
let webkitBrowser: Browser | null = null;
try {
  webkitBrowser = await webkit.launch({ headless: true });
} catch {
  console.log("carousel click and drag: WebKit is not installed here, skipped");
}
if (webkitBrowser) {
  try {
    results.push(await run(webkitBrowser, "webkit", false));
  } finally {
    await webkitBrowser.close();
  }
}
server.stop(true);
for (const result of results) {
  console.log(`carousel click and drag ${result.label}: click ${result.afterClick.toFixed(0)}, released ${result.released.toFixed(0)}, after the release's focus ${result.afterFocus.toFixed(0)}`);
}
console.log("Carousel click and drag check passed.");
