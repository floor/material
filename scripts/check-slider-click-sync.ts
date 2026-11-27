#!/usr/bin/env bun
// scripts/check-slider-click-sync.ts
/**
 * A click on the track moves the handle and the track's two pieces together.
 *
 * The settle spring runs on the handle's position and on the pieces' ends. When
 * a press changed the gap the pieces keep from the handle, the release re-laid
 * the pieces out one frame after the handle's transition had started; WebKit
 * runs the two transitions apart from then on, and the pieces visibly leave the
 * handle — the active piece reaching past it, or the inactive piece starting
 * short (owner, 2026-11-25). Two assertions:
 *
 * 1. A press changes no piece and its release changes none either: the inline
 *    geometry the renderer writes is identical with the press held and after
 *    the release. This one is engine-independent and runs on Chromium.
 * 2. Every frame of the settle keeps the gap: the handle's centre is the pieces'
 *    edge less/plus one gap, within half a pixel, from the first frame to the
 *    last. The press is held across frames before it is released, as a person's
 *    click is: Playwright's mouse.click sends down and up in one frame, and the
 *    engine then commits only the released geometry and hides the restart. Runs
 *    on Chromium — the owner's engine, Chrome on macOS — and on WebKit where it
 *    is installed.
 *
 *   bun run scripts/check-slider-click-sync.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium, webkit, type Browser, type Page } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";

const GAP = 8;
const HOST = 420;
const CLICK = 0.33;

const bundle = await Bun.build({ entrypoints: [resolve("src/components/slider/index.ts")], target: "browser", format: "esm", minify: true });
assert(bundle.success, String(bundle.logs));
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const css = sass.compileString(directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()), sassOptions()).css;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/slider.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline" data-theme-mode="light"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;padding:24px;background:#fff}#host{width:${HOST}px}</style></head>
<body><div id="host"></div><script type="module">import createSlider from "/slider.js";window.createSlider=createSlider;window.ready=true;</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

const mount = async (page: Page) => {
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
  await page.evaluate((host) => {
    const holder = document.querySelector<HTMLElement>("#host")!;
    holder.style.width = `${host}px`;
    const slider = (window as unknown as { createSlider: (config: unknown) => { element: HTMLElement } }).createSlider({
      value: 80, size: "XL", label: "Volume",
    });
    holder.append(slider.element);
  }, HOST);
  await page.waitForTimeout(300); // stays: sampling frames: the animation is under test
  const box = await page.evaluate(() => {
    const container = document.querySelector<HTMLElement>(".mtrl-slider__container")!.getBoundingClientRect();
    return { x: container.x, y: container.y, width: container.width, height: container.height };
  });
  return { x: box.x + box.width * CLICK, y: box.y + box.height / 2 };
};

/** The inline geometry the pieces and the handle carry. */
const geometry = (page: Page) =>
  page.evaluate(() => {
    const element = document.querySelector<HTMLElement>(".mtrl-slider")!;
    const pieces = [...element.querySelectorAll<HTMLElement>(".mtrl-slider__segment")].slice(1).map((piece) => `${piece.style.left}|${piece.style.width}`);
    const handle = element.querySelector<HTMLElement>('[role="slider"]')!;
    return {
      pieces,
      handle: handle.style.left,
      pressed: handle.classList.contains("mtrl-slider__handle--pressed"),
      bar: parseFloat(getComputedStyle(handle, "::before").width),
    };
  });

/** Every frame of the settle: the handle against both piece edges, in the page. */
const startFrames = (page: Page) =>
  page.evaluate(() => {
    const frames: { handle: number; indicator: number; activeEnd: number | null; inactiveStart: number | null; settling: boolean }[] = [];
    const samples = (window as unknown as { frames?: typeof frames }).frames = frames;
    const sample = () => {
      const element = document.querySelector<HTMLElement>(".mtrl-slider")!;
      const track = element.querySelector<HTMLElement>(".mtrl-slider__track")!.getBoundingClientRect();
      const handle = element.querySelector<HTMLElement>('[role="slider"]')!.getBoundingClientRect();
      const indicator = element.querySelector<HTMLElement>(".mtrl-slider__value")!.getBoundingClientRect();
      const [active, trailing] = [...element.querySelectorAll<HTMLElement>(".mtrl-slider__segment")].slice(1).map((piece) => piece.getBoundingClientRect());
      samples.push({
        handle: handle.x + handle.width / 2 - track.left,
        indicator: indicator.x + indicator.width / 2 - track.left,
        activeEnd: active && active.width + (trailing?.width ?? 0) > 0 ? active.right - track.left : null,
        inactiveStart: trailing && active && active.width + trailing.width > 0 ? trailing.left - track.left : null,
        settling: element.classList.contains("mtrl-slider--settling"),
      });
      if (samples.length < 120) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

const stopFrames = (page: Page) =>
  page.evaluate(() => (window as unknown as { frames: { handle: number; indicator: number; activeEnd: number | null; inactiveStart: number | null; settling: boolean }[] }).frames);

const run = async (browser: Browser, engine: string) => {
  const page = await browser.newPage({ viewport: { width: 600, height: 300 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  // 1. Every frame of the settle keeps the handle one gap from each piece edge.
  // Focus first so the indicator is already visible and the track press settles.
  // A click is a press held over frames and then released, not a down and an up
  // in one frame: the held state has to be committed for a restart to happen.
  let point = await mount(page);
  await page.locator(".mtrl-slider__handle").focus();
  await startFrames(page);
  await page.waitForTimeout(30); // stays: sampling frames: the animation is under test
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(60); // stays: sampling frames: the animation is under test
  await page.mouse.up();
  await page.waitForTimeout(1200); // stays: sampling frames: the animation is under test
  const frames = (await stopFrames(page)).filter((frame) => frame.activeEnd !== null && frame.inactiveStart !== null && frame.settling);
  assert(frames.length >= 8, `${engine}: ${frames.length} frames of the settle were sampled`);
  let worstBefore = 0;
  let worstAfter = 0;
  for (const frame of frames) {
    assert(Math.abs(frame.handle - frame.indicator) <= 0.5, `${engine}: the visible indicator left the handle during the settle`);
    worstBefore = Math.max(worstBefore, Math.abs(frame.handle - frame.activeEnd! - GAP));
    worstAfter = Math.max(worstAfter, Math.abs(frame.inactiveStart! - frame.handle - GAP));
  }
  assert(worstBefore <= 0.5, `${engine}: the handle left the active piece's end by ${worstBefore.toFixed(2)} px on a frame, where the gap is ${GAP}`);
  assert(worstAfter <= 0.5, `${engine}: the inactive piece started ${worstAfter.toFixed(2)} px from the handle on a frame, where the gap is ${GAP}`);
  // 2. A press and its release change no piece's geometry.
  point = await mount(page);
  const before = await geometry(page);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(50); // stays: sampling frames: the animation is under test
  const held = await geometry(page);
  await page.mouse.up();
  await page.waitForTimeout(50); // stays: sampling frames: the animation is under test
  const released = await geometry(page);
  assert(!before.pressed && held.pressed && !released.pressed, `${engine}: the press and its release toggle the pressed handle`);
  // The handle narrows to 2 dp for as long as any press inside the component
  // lasts — the owner's requirement, and the press state #459 introduced.
  assert.equal(before.bar, 4, `${engine}: the handle is 4 px at rest (measured ${before.bar} px)`);
  assert.equal(held.bar, 2, `${engine}: a held track press narrows the handle to 2 px (measured ${held.bar} px)`);
  assert.equal(released.bar, 4, `${engine}: the release widens the handle to 4 px (measured ${released.bar} px)`);
  assert.deepEqual(
    held.pieces,
    released.pieces,
    `${engine}: the release re-laid the track's pieces out while the settle ran (held ${JSON.stringify(held.pieces)} → released ${JSON.stringify(released.pieces)})`,
  );

  assert.deepEqual(errors, [], `${engine}: no uncaught page errors`);
  await page.close();
  return { engine, frames: frames.length, worstBefore, worstAfter };
};

const results = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try {
  results.push(await run(chromiumBrowser, "chromium"));
} finally {
  await chromiumBrowser.close();
}
// WebKit is where the desync showed; its binary is not in every CI image.
let webkitBrowser: Browser | null = null;
try {
  webkitBrowser = await webkit.launch({ headless: true });
} catch {
  console.log("slider click sync: WebKit is not installed here, skipped");
}
if (webkitBrowser) {
  try {
    results.push(await run(webkitBrowser, "webkit"));
  } finally {
    await webkitBrowser.close();
  }
}
server.stop(true);
for (const result of results) {
  console.log(`slider click sync ${result.engine}: ${result.frames} settle frames, worst ${result.worstBefore.toFixed(2)} px before the active end, ${result.worstAfter.toFixed(2)} px after the handle`);
}
console.log("Slider click sync check passed.");
