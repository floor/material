#!/usr/bin/env bun
/**
 * The split button's chevron ink, not its svg box.
 *
 * Closed and open, the ink sits on the trailing button's centre on both axes.
 * Opening the menu only rotates the glyph. The svg box is not the measurement:
 * the glyph's ink is off-centre in that box, and a 180 degree turn moves it.
 *
 * The path stays a translation of Material's expand_more outline, and its
 * polygon centroid stays within one unit of the viewBox centre. The svg box
 * sits on the trailing button's centre, closed and open, in both directions.
 * Coverage-weighted painted mass, closed against open, stays within 0.25 CSS
 * px at device scales 1, 2 and 3. The method is briefs/split-chevron-mass-check.mjs.
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import * as sass from "sass";
import { launchChromium } from "./browser-profile";

const root = resolve(import.meta.dir, "..");
mkdirSync(join(root, "tmp"), { recursive: true });
const scratch = mkdtempSync(join(root, "tmp", "check-split-button-chevron-"));
const sizes = ["xs", "s", "m", "l", "xl"] as const;
/** Closed and open painted mass, in CSS px. */
const MASS_TOLERANCE = 0.25;
/** SVG box centre against the trailing button centre, in CSS px. */
const BOX_TOLERANCE = 0.25;
/** Polygon centroid against the viewBox centre, in path units. */
const CENTROID_TOLERANCE = 1;
/** viewBox 0 -960 960 960. */
const VIEWBOX_CENTRE = { x: 480, y: -480 };
/** Material expand_more, viewBox 0 -960 960 960. A pure translation is allowed. */
const OFFICIAL_CHEVRON = "M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z";

interface Command {
  op: string;
  nums: number[];
}

const commands = (d: string): Command[] => [...d.matchAll(/([MmLlHhVvZz])([^MmLlHhVvZz]*)/g)].map((match) => ({
  op: match[1]!,
  nums: [...match[2]!.matchAll(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)].map((part) => Number(part[0])),
}));

const chevronSource = readFileSync(join(root, "src/components/split-button/constants.ts"), "utf8");
const shipped = chevronSource.match(/<path d="([^"]+)"/)?.[1];
assert(shipped, "the chevron path is missing from constants.ts");
const official = commands(OFFICIAL_CHEVRON);
const actual = commands(shipped);
assert.equal(actual.length, official.length, "the chevron path is not the official outline");
let dx: number | undefined;
let dy: number | undefined;
for (let i = 0; i < official.length; i++) {
  const from = official[i]!;
  const to = actual[i]!;
  assert.equal(to.op, from.op, `chevron command ${i} is ${to.op}, not the official ${from.op}`);
  assert.equal(to.nums.length, from.nums.length, `chevron command ${i} changed length`);
  const absolute = from.op === from.op.toUpperCase() && from.op.toLowerCase() !== "z";
  if (!absolute) {
    assert.deepEqual(to.nums, from.nums, "a relative chevron command changed; the outline is no longer a translation");
    continue;
  }
  for (let n = 0; n < from.nums.length; n += 2) {
    const nextDx = to.nums[n]! - from.nums[n]!;
    const nextDy = to.nums[n + 1]! - from.nums[n + 1]!;
    dx ??= nextDx;
    dy ??= nextDy;
    assert.equal(nextDx, dx, "the chevron's horizontal shift is not constant");
    assert.equal(nextDy, dy, "the chevron's vertical shift is not constant");
  }
}
console.log(`chevron outline: official expand_more translated by ${dx ?? 0}, ${dy ?? 0}`);

const vertices: Array<[number, number]> = [];
let cursorX = 0;
let cursorY = 0;
for (const command of actual) {
  if (command.op === "Z" || command.op === "z") continue;
  const relative = command.op === command.op.toLowerCase();
  assert(command.op.toLowerCase() === "m" || command.op.toLowerCase() === "l", `chevron command ${command.op} is not part of the official outline`);
  for (let n = 0; n < command.nums.length; n += 2) {
    const nextX = command.nums[n]!;
    const nextY = command.nums[n + 1]!;
    cursorX = relative ? cursorX + nextX : nextX;
    cursorY = relative ? cursorY + nextY : nextY;
    vertices.push([cursorX, cursorY]);
  }
}
const first = vertices[0];
const last = vertices[vertices.length - 1];
if (first && last && first[0] === last[0] && first[1] === last[1]) vertices.pop();
let twice = 0;
let centroidX = 0;
let centroidY = 0;
for (let i = 0; i < vertices.length; i++) {
  const [x1, y1] = vertices[i]!;
  const [x2, y2] = vertices[(i + 1) % vertices.length]!;
  const cross = x1 * y2 - x2 * y1;
  twice += cross;
  centroidX += (x1 + x2) * cross;
  centroidY += (y1 + y2) * cross;
}
centroidX /= 3 * twice;
centroidY /= 3 * twice;
const centroidDx = centroidX - VIEWBOX_CENTRE.x;
const centroidDy = centroidY - VIEWBOX_CENTRE.y;
console.log(`chevron centroid: ${centroidDx.toFixed(3)}, ${centroidDy.toFixed(3)} units from the viewBox centre`);
assert(Math.abs(centroidDx) <= CENTROID_TOLERANCE && Math.abs(centroidDy) <= CENTROID_TOLERANCE,
  `chevron centroid is ${centroidDx}, ${centroidDy} units from the viewBox centre`);

const css = sass.compileString(`@use "components/button"; @use "utilities/ripple"; @use "components/split-button";`, {
  loadPaths: [join(root, "src/styles")],
  style: "expanded",
  logger: sass.Logger.silent,
}).css;

const build = await Bun.build({
  entrypoints: [join(root, "src/components/split-button/index.ts")],
  outdir: scratch,
  target: "browser",
  format: "esm",
  define: { "process.env.NODE_ENV": '"production"' },
});
assert(build.success, String(build.logs));
const entry = build.outputs.find((output) => output.kind === "entry-point");
assert(entry, "the build produced no entry");
const entryName = entry.path.slice(scratch.length + 1);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${css}
body { margin: 24px; }
section { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
</style></head><body>
<script type="module">
import { createSplitButton } from "/${entryName}";
const sizes = ${JSON.stringify(sizes)};
const host = document.body;
for (const dir of ["ltr", "rtl"]) {
  const section = document.createElement("section");
  section.dir = dir;
  for (const size of sizes) {
    const split = createSplitButton({ text: "Save", size, trailingLabel: "More" });
    split.element.dataset.size = size;
    split.element.dataset.dir = dir;
    section.append(split.element);
  }
  host.append(section);
}
window.ready = true;
</script></body></html>`;

interface Sample {
  size: string;
  dir: string;
  state: "closed" | "open";
  dx: number;
  dy: number;
  boxDx: number;
  boxDy: number;
  translate: string;
  rotate: string;
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/") return new Response(html, { headers: { "Content-Type": "text/html" } });
    if (path === `/${entryName}`) {
      return new Response(readFileSync(join(scratch, entryName)), { headers: { "Content-Type": "text/javascript" } });
    }
    return new Response("not found", { status: 404 });
  },
});

const round = (n: number) => Math.round(n * 1000) / 1000;

const browser = await launchChromium({ headless: true });
try {
  const page = await browser.browser()!.newPage({ viewport: { width: 900, height: 1400 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);

  const measure = () => page.evaluate(() => {
    const rows: Sample[] = [];
    for (const root of document.querySelectorAll<HTMLElement>(".mtrl-split-button")) {
      const button = root.querySelector<HTMLElement>(".mtrl-split-button__trailing");
      const svg = root.querySelector<SVGSVGElement>(".mtrl-split-button__chevron");
      const path = svg?.querySelector("path");
      if (!button || !svg || !path) continue;
      const buttonBox = button.getBoundingClientRect();
      const svgBox = svg.getBoundingClientRect();
      const bbox = path.getBBox();
      const point = svg.createSVGPoint();
      point.x = bbox.x + bbox.width / 2;
      point.y = bbox.y + bbox.height / 2;
      const ink = point.matrixTransform(path.getScreenCTM()!);
      const style = getComputedStyle(svg);
      rows.push({
        size: root.dataset.size ?? "",
        dir: root.dataset.dir ?? "",
        state: root.classList.contains("mtrl-split-button--expanded") ? "open" : "closed",
        dx: ink.x - (buttonBox.x + buttonBox.width / 2),
        dy: ink.y - (buttonBox.y + buttonBox.height / 2),
        boxDx: svgBox.x + svgBox.width / 2 - (buttonBox.x + buttonBox.width / 2),
        boxDy: svgBox.y + svgBox.height / 2 - (buttonBox.y + buttonBox.height / 2),
        translate: style.translate,
        rotate: style.rotate,
      });
    }
    return rows;
  });

  const closed = await measure();
  await page.evaluate(() => {
    for (const root of document.querySelectorAll(".mtrl-split-button")) {
      root.classList.add("mtrl-split-button--expanded");
    }
  });
  await page.waitForTimeout(400);
  const open = await measure();
  const rows = [...closed, ...open].map((row) => ({
    ...row,
    dx: round(row.dx),
    dy: round(row.dy),
    boxDx: round(row.boxDx),
    boxDy: round(row.boxDy),
  }));

  console.log("chevron ink minus trailing-button centre, px");
  for (const row of rows) {
    console.log(
      `${row.state.padEnd(6)} ${row.dir} ${row.size.padEnd(2)}  ink ${row.dx} ${row.dy}  box ${row.boxDx} ${row.boxDy}  translate ${row.translate}  rotate ${row.rotate}`,
    );
  }

  const closedRows = rows.filter((row) => row.state === "closed");
  const openRows = rows.filter((row) => row.state === "open");
  assert(closedRows.length > 0 && closedRows.every((row) => row.rotate !== "180deg"), "a closed chevron is already rotated");
  assert(openRows.length === closedRows.length && openRows.every((row) => row.rotate === "180deg"), "opening the menu did not rotate the chevron");
  const offCentre = rows.filter((row) => Math.abs(row.boxDx) > BOX_TOLERANCE || Math.abs(row.boxDy) > BOX_TOLERANCE);
  assert.deepEqual(
    offCentre.map((row) => `${row.state} ${row.dir} ${row.size} ${row.boxDx} ${row.boxDy}`),
    [],
    `chevron svg is off the trailing button by more than ${BOX_TOLERANCE}px`,
  );
  console.log("split button chevron: the svg stays on the trailing-button centre, and opening rotates it");

  // Coverage-weighted painted mass, the method in
  // briefs/split-chevron-mass-check.mjs. The weight is the colour delta, and
  // the same clip is read closed and open.
  const mass = async (scale: number) => {
    const page = await browser.browser()!.newPage({ viewport: { width: 900, height: 1600 }, deviceScaleFactor: scale });
    await page.goto(`http://127.0.0.1:${server.port}/`);
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>(".mtrl-split-button__chevron").forEach((chevron) => {
        chevron.style.transition = "none";
      });
    });
    const buttons = page.locator(".mtrl-split-button__trailing");
    const count = await buttons.count();
    const labels: string[] = [];
    const clips: Array<{ x: number; y: number; width: number; height: number }> = [];
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      labels.push(await button.evaluate((node) => {
        const host = node.closest(".mtrl-split-button") as HTMLElement;
        return `${host.dataset.dir} ${host.dataset.size}`;
      }));
      const box = await button.boundingBox();
      assert(box, `${labels[i]} has no box`);
      clips.push({ x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) });
    }
    const weigh = async (buf: Buffer) => page.evaluate(async (src) => {
      const image = new Image();
      image.src = `data:image/png;base64,${src}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const width = canvas.width;
      const height = canvas.height;
      const sample = 4 * (Math.floor(height * 0.2) * width + Math.floor(width / 2));
      const bg = [data[sample] ?? 0, data[sample + 1] ?? 0, data[sample + 2] ?? 0];
      let weight = 0;
      let massX = 0;
      let massY = 0;
      for (let y = Math.floor(height * 0.25); y < height * 0.75; y++) {
        for (let x = Math.floor(width * 0.2); x < width * 0.8; x++) {
          const p = 4 * (y * width + x);
          const delta = Math.abs((data[p] ?? 0) - bg[0]) + Math.abs((data[p + 1] ?? 0) - bg[1]) + Math.abs((data[p + 2] ?? 0) - bg[2]);
          if (delta > 12) {
            weight += delta;
            massX += delta * (x + 0.5);
            massY += delta * (y + 0.5);
          }
        }
      }
      if (weight === 0) return null;
      return { x: massX / weight - width / 2, y: massY / weight - height / 2 };
    }, buf.toString("base64"));
    const closedMass = [];
    for (const clip of clips) closedMass.push(await weigh(await page.screenshot({ clip })));
    const closedRotated = await page.evaluate(() => [...document.querySelectorAll(".mtrl-split-button__chevron")].filter((svg) => getComputedStyle(svg).rotate === "180deg").length);
    await page.evaluate(() => {
      for (const root of document.querySelectorAll(".mtrl-split-button")) root.classList.add("mtrl-split-button--expanded");
    });
    const openRotated = await page.evaluate(() => [...document.querySelectorAll(".mtrl-split-button__chevron")].filter((svg) => getComputedStyle(svg).rotate === "180deg").length);
    assert.equal(closedRotated, 0, `mass scale ${scale}: a closed chevron is already rotated`);
    assert.equal(openRotated, count, `mass scale ${scale}: opening did not rotate every chevron`);
    const openMass = [];
    for (const clip of clips) openMass.push(await weigh(await page.screenshot({ clip })));
    const bad: string[] = [];
    let worst = 0;
    for (let i = 0; i < count; i++) {
      const closedInk = closedMass[i];
      const openInk = openMass[i];
      assert(closedInk && openInk, `mass scale ${scale} ${labels[i]} found no ink`);
      const shiftX = (openInk.x - closedInk.x) / scale;
      const shiftY = (openInk.y - closedInk.y) / scale;
      worst = Math.max(worst, Math.abs(shiftX), Math.abs(shiftY));
      if (Math.abs(shiftX) > MASS_TOLERANCE || Math.abs(shiftY) > MASS_TOLERANCE) {
        bad.push(`${labels[i]} ${shiftX.toFixed(3)},${shiftY.toFixed(3)}`);
      }
    }
    await page.close();
    assert.deepEqual(bad, [], `mass scale ${scale}: closed and open mass differ by more than ${MASS_TOLERANCE}px`);
    console.log(`mass scale ${scale}: worst closed-to-open shift ${worst.toFixed(3)} CSS px`);
  };
  await mass(1);
  await mass(2);
  await mass(3);
} finally {
  await browser.close();
  server.stop(true);
  rmSync(scratch, { recursive: true, force: true });
}
