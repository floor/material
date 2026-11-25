#!/usr/bin/env bun
// scripts/check-slider-pressed-gap.ts
/**
 * The track's pieces follow the pressed handle.
 *
 * The gap between the handle and each piece of track is measured from the
 * handle's edge (SliderTokens.ThumbTrackGapSize and
 * ActiveHandleLeadingSpace, 6 dp — androidx SliderTokens.kt), and the handle
 * halves its width on a press, so each piece beside it moves 1 px closer for as
 * long as the press lasts. The check paints a slider at rest and with the
 * track held, reads the pixels of the track's row, and compares the painted
 * edge of the active piece and of the inactive piece with the handle's centre:
 * 8 px at rest, 7 px held, half a pixel of slack.
 *
 *   bun run scripts/check-slider-pressed-gap.ts
 */
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";

const DPR = 2;
const REST_GAP = 8;
const PRESSED_GAP = 7;

const decodePNG = (buf: Buffer): { width: number; height: number; channels: number; data: Uint8Array } => {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const parts: Buffer[] = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]!; }
    else if (type === "IDAT") parts.push(data);
    else if (type === "IEND") break;
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = width * channels;
  const out = new Uint8Array(width * height * channels);
  let p = 0;
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[p++]!;
    const line = raw.subarray(p, p + stride);
    p += stride;
    const current = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? current[x - channels]! : 0;
      const b = previous[x]!;
      const c = x >= channels ? previous[x - channels]! : 0;
      let value = line[x]!;
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      current[x] = value & 255;
    }
    out.set(current, y * stride);
    previous = current;
  }
  return { width, height, channels, data: out };
};

const bundle = await Bun.build({ entrypoints: [resolve("src/components/slider/index.ts")], target: "browser", format: "esm", minify: true });
assert(bundle.success, String(bundle.logs));
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const sheet = sass.compileString(directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()), sassOptions()).css;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/slider.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(sheet, { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline" data-theme-mode="light"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;padding:24px;background:#ff00ff}#host{width:420px}.mtrl-slider *,.mtrl-slider{transition:none!important}</style></head>
<body><div id="host"></div><script type="module">import createSlider from "/slider.js";window.createSlider=createSlider;window.ready=true;</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 300 }, deviceScaleFactor: DPR });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
  await page.evaluate(() => {
    const holder = document.querySelector<HTMLElement>("#host")!;
    const slider = (window as unknown as { createSlider: (config: unknown) => { element: HTMLElement } }).createSlider({ value: 30, size: "XL", ticks: true, step: 10 });
    holder.append(slider.element);
  });
  await page.waitForTimeout(300);
  const box = await page.evaluate(() => {
    const container = document.querySelector<HTMLElement>(".mtrl-slider__container")!.getBoundingClientRect();
    return { x: container.x, y: container.y, width: container.width, height: container.height };
  });
  /** The painted gap on each side of the handle, in CSS px. */
  const painted = async () => {
    const shot = decodePNG(Buffer.from(await page.locator("#host").screenshot()));
    const geometry = await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>("#host")!.getBoundingClientRect();
      const track = document.querySelector<HTMLElement>(".mtrl-slider__track")!.getBoundingClientRect();
      const handle = document.querySelector<HTMLElement>('[role="slider"]')!.getBoundingClientRect();
      return {
        line: Math.round((track.y + track.height / 2 - host.y) * devicePixelRatio),
        handle: (handle.x + handle.width / 2 - host.x) * devicePixelRatio,
      };
    });
    const at = (x: number): [number, number, number] => {
      const index = (geometry.line * shot.width + x) * shot.channels;
      return [shot.data[index]!, shot.data[index + 1]!, shot.data[index + 2]!];
    };
    const near = (a: [number, number, number], b: [number, number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 40;
    const primary: [number, number, number] = [103, 80, 164];
    const container: [number, number, number] = [232, 222, 248];
    const handleX = Math.round(geometry.handle);
    // Left of the handle: the last pixel of the active piece's fill, once four
    // pixels of gap follow it (an antialiased boundary alone reads a pixel or
    // two off).
    let fillEnd = null;
    for (let x = handleX - 4; x > 4; x--) {
      if (near(at(x), primary) && near(at(x - 2), primary) && near(at(x - 4), primary) && !near(at(x + 2), primary)) { fillEnd = x; break; }
    }
    // Right of the handle: the first pixel of the inactive piece, once four
    // pixels of it follow.
    let inactiveStart = null;
    for (let x = handleX + 4; x < shot.width - 5; x++) {
      if (near(at(x), container) && near(at(x + 2), container) && near(at(x + 4), container)) { inactiveStart = x; break; }
    }
    return { fillEnd, inactiveStart, handle: geometry.handle };
  };
  const rest = await painted();
  assert(rest.fillEnd !== null && rest.inactiveStart !== null, "the track's pieces are painted at rest");
  const gapRestLeft = (rest.handle - (rest.fillEnd! + 1)) / DPR;
  const gapRestRight = (rest.inactiveStart! - rest.handle) / DPR;
  assert(Math.abs(gapRestLeft - REST_GAP) <= 0.6, `at rest the active piece ends ${gapRestLeft.toFixed(2)} px from the handle's centre, where the gap is ${REST_GAP}`);
  assert(Math.abs(gapRestRight - REST_GAP) <= 0.6, `at rest the inactive piece starts ${gapRestRight.toFixed(2)} px from the handle's centre, where the gap is ${REST_GAP}`);
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(250);
  const held = await painted();
  assert(held.fillEnd !== null && held.inactiveStart !== null, "the track's pieces are painted while the press is held");
  const gapHeldLeft = (held.handle - (held.fillEnd! + 1)) / DPR;
  // The inactive piece's box start stays one gap away; the painted edge is its
  // 1 px extension, read from the declared shadow of the piece facing the
  // handle (a 1 px offset toward the handle extends it; none leaves the box).
  const shadow = await page.evaluate(() => {
    const pieces = [...document.querySelectorAll<HTMLElement>(".mtrl-slider__segment")].slice(1);
    const pressed = document.querySelector<HTMLElement>(".mtrl-slider__handle--pressed");
    return { count: pieces.length, shadows: pieces.map((piece) => getComputedStyle(piece).boxShadow), pressed: !!pressed };
  });
  await page.mouse.up();
  assert(errors.length === 0, `no uncaught page errors: ${errors.join("; ")}`);
  assert(shadow.pressed, "the press shows the pressed handle");
  const extendsLeft = /-1px 0px 0px 0px/.test(shadow.shadows[1] ?? "");
  assert(extendsLeft, `held: the inactive piece's inner edge is extended 1 px toward the handle (shadows ${JSON.stringify(shadow.shadows)})`);
  const gapHeldRight = (held.inactiveStart! - held.handle) / DPR - 1;
  assert(Math.abs(gapHeldLeft - PRESSED_GAP) <= 0.6, `held: the active piece ends ${gapHeldLeft.toFixed(2)} px from the handle's centre, where the pressed gap is ${PRESSED_GAP}`);
  assert(Math.abs(gapHeldRight - PRESSED_GAP) <= 0.6, `held: the inactive piece starts ${gapHeldRight.toFixed(2)} px from the handle's centre, where the pressed gap is ${PRESSED_GAP}`);
  console.log(`slider pressed gap: rest ${gapRestLeft.toFixed(2)}/${gapRestRight.toFixed(2)} px, held ${gapHeldLeft.toFixed(2)}/${gapHeldRight.toFixed(2)} px`);
  console.log("Slider pressed gap check passed.");
} finally {
  await browser.close();
  server.stop(true);
}
