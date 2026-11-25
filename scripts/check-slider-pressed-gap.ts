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
  const page = await browser.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: DPR });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);

  type Case = { orientation?: "vertical"; topToBottom?: boolean };
  const nameOf = (config: Case) => `${config.orientation === "vertical" ? "vertical" : "horizontal"}${config.topToBottom ? " top-to-bottom" : ""}`;

  /** The piece colour near this pixel, or null where nothing of the track is painted. */
  const isPiece = (image: { data: Uint8Array }, i: number) => {
    const near = (r: number, g: number, b: number) => Math.abs(image.data[i]! - r) <= 8 && Math.abs(image.data[i + 1]! - g) <= 8 && Math.abs(image.data[i + 2]! - b) <= 8;
    return near(103, 80, 164) || near(232, 222, 248);
  };

  const measure = async (config: Case) => {
    const name = nameOf(config);
    await page.evaluate((config) => {
      const holder = document.querySelector<HTMLElement>("#host")!;
      holder.replaceChildren();
      holder.style.width = config.orientation === "vertical" ? "80px" : "420px";
      holder.style.height = config.orientation === "vertical" ? "420px" : "";
      const slider = (window as unknown as { createSlider: (config: unknown) => { element: HTMLElement } }).createSlider({
        value: 30, size: "XL", ticks: true, step: 10, ...config,
      });
      holder.append(slider.element);
    }, config);
    await page.waitForTimeout(250);

    const vertical = config.orientation === "vertical";
    const read = async () => {
      const geometry = await page.evaluate(() => {
        const box = (el: Element) => {
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        };
        const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
        const track = document.querySelector<HTMLElement>(".mtrl-slider__track")!;
        const pieces = [...document.querySelectorAll<HTMLElement>(".mtrl-slider__segment")].slice(1).map((piece) => ({
          rect: box(piece),
          shadow: getComputedStyle(piece).boxShadow,
          background: getComputedStyle(piece).backgroundColor,
        }));
        return { handle: box(handle), track: box(track), pieces };
      });
      const image = decodePNG(await page.screenshot());
      // Read the pixels 6 px beside the track's centreline: inside the pieces'
      // thickness on both axes, and clear of the tick dots on the centreline.
      const across = vertical ? (geometry.track.left + geometry.track.right) / 2 + 6 : (geometry.track.top + geometry.track.bottom) / 2 + 6;
      // The handle's box is its hit area and its bar is centred in it, so the
      // box's centre along the axis is the bar's centre.
      const centre = (vertical ? (geometry.handle.top + geometry.handle.bottom) / 2 : (geometry.handle.left + geometry.handle.right) / 2) * DPR;
      const along = (device: number) => {
        const x = Math.floor(vertical ? across * DPR : device);
        const y = Math.floor(vertical ? device : across * DPR);
        return (y * image.width + x) * image.channels;
      };
      const limit = vertical ? image.height : image.width;
      const isBar = (device: number) => {
        const i = along(device);
        return Math.abs(image.data[i]! - 103) <= 8 && Math.abs(image.data[i + 1]! - 80) <= 8 && Math.abs(image.data[i + 2]! - 164) <= 8;
      };
      /** The device pixel where the nearest piece starts, walking out from the handle. */
      const edge = (direction: -1 | 1) => {
        // The handle's own bar is centred on the value and painted in the active
        // colour: step past it before looking for a piece.
        let start = Math.round(centre);
        while (start >= 0 && start < limit && isBar(start)) start += direction;
        for (let device = start; device >= 0 && device < limit; device += direction) {
          if (!isPiece(image, along(device))) continue;
          let run = 0;
          for (let follow = device; follow !== device + direction * 3; follow += direction) {
            if (follow >= 0 && follow < limit && isPiece(image, along(follow))) run += 1;
          }
          if (run >= 3) return direction < 0 ? device + 1 : device;
        }
        return null;
      };
      const painted = (device: number | null) => (device === null ? null : Math.abs(device - centre) / DPR);
      return { gaps: { before: painted(edge(-1)), after: painted(edge(1)) }, pieces: geometry.pieces, centre: centre / DPR };
    };

    const rest = await read();
    const point = await page.evaluate(() => {
      const container = document.querySelector<HTMLElement>(".mtrl-slider__container")!.getBoundingClientRect();
      return { x: container.left + container.width / 2, y: container.top + container.height / 2 };
    });
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.waitForTimeout(250);
    const held = await read();
    await page.mouse.up();
    await page.waitForTimeout(100);

    for (const side of ["before", "after"] as const) {
      const restGap = rest.gaps[side];
      const heldGap = held.gaps[side];
      assert(restGap !== null, `${name}: the ${side} piece is painted at rest`);
      assert(heldGap !== null, `${name}: the ${side} piece is still painted while held`);
      assert(Math.abs(restGap - REST_GAP) <= 0.75, `${name}: at rest the ${side} piece's painted edge is ${restGap.toFixed(2)} px from the handle's centre, where it is ${REST_GAP}`);
      assert(Math.abs(heldGap - PRESSED_GAP) <= 0.75, `${name}: held, the ${side} piece's painted edge is ${heldGap.toFixed(2)} px from the handle's centre, where it is ${PRESSED_GAP}`);
      assert(Math.abs(restGap - heldGap - 1) <= 0.5, `${name}: the ${side} piece's edge moved ${(restGap - heldGap).toFixed(2)} px on the press, where it moves 1`);
    }
    // Each pressed piece's shadow: 1 px, its own colour, pointing at the handle.
    for (const piece of held.pieces) {
      const offsets = /(-?[\d.]+)px (-?[\d.]+)px/.exec(piece.shadow);
      assert(offsets, `${name}: the pressed piece carries a shadow (${piece.shadow})`);
      const step = vertical ? Number(offsets[2]) : Number(offsets[1]);
      const pieceCentre = vertical ? (piece.rect.top + piece.rect.bottom) / 2 : (piece.rect.left + piece.rect.right) / 2;
      assert.equal(Math.abs(step), 1, `${name}: the shadow extends exactly 1 px (${piece.shadow})`);
      assert.equal(Math.sign(step), Math.sign(held.centre - pieceCentre), `${name}: the shadow points at the handle (${piece.shadow}, handle at ${held.centre.toFixed(2)}, piece centre ${pieceCentre.toFixed(2)})`);
      const colour = /rgba?\((\d+), (\d+), (\d+)/.exec(piece.shadow)!.slice(1, 4).join(",");
      const painted = /rgba?\((\d+), (\d+), (\d+)/.exec(piece.background)!.slice(1, 4).join(",");
      assert.equal(colour, painted, `${name}: the shadow is painted in the piece's own colour (${piece.shadow} over ${piece.background})`);
    }
    console.log(`  ${name}: rest ${rest.gaps.before!.toFixed(2)}/${rest.gaps.after!.toFixed(2)} px, held ${held.gaps.before!.toFixed(2)}/${held.gaps.after!.toFixed(2)} px`);
    return { name, rest: rest.gaps, held: held.gaps };
  };

  for (const config of [{}, { topToBottom: true }, { orientation: "vertical" }, { orientation: "vertical", topToBottom: true }] as Case[]) {
    await measure(config);
  }
  assert.deepEqual(errors, [], "no uncaught page errors");
  console.log("Slider pressed gap check passed.");
} finally {
  await browser.close();
  server.stop(true);
}
