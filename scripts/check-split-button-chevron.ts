#!/usr/bin/env bun
/**
 * The split button's chevron ink, not its svg box.
 *
 * Closed and open, the ink sits on the trailing button's centre on both axes.
 * Opening the menu only rotates the glyph. The svg box is not the measurement:
 * the glyph's ink is off-centre in that box, and a 180 degree turn moves it.
 *
 * The path stays a translation of Material's expand_more outline. The painted
 * pixels of the closed and open glyphs share a centre at device scales 1, 2 and 3.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import * as sass from "sass";
import { launchChromium } from "./browser-profile";

const root = resolve(import.meta.dir, "..");
const scratch = join(root, "tmp", "check-split-button-chevron");
const sizes = ["xs", "s", "m", "l", "xl"] as const;
/** Ink centre against the trailing button's centre, closed and open. */
const TOLERANCE = 0.25;
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

const css = sass.compileString(`@use "components/button"; @use "utilities/ripple"; @use "components/split-button";`, {
  loadPaths: [join(root, "src/styles")],
  style: "expanded",
  logger: sass.Logger.silent,
}).css;

rmSync(scratch, { recursive: true, force: true });
mkdirSync(scratch, { recursive: true });
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

  const off = rows.filter((row) => Math.abs(row.dx) > TOLERANCE || Math.abs(row.dy) > TOLERANCE);
  assert.deepEqual(
    off,
    [],
    `chevron ink is off the trailing button by more than ${TOLERANCE}px`,
  );
  const shifted: string[] = [];
  for (const closedRow of rows.filter((row) => row.state === "closed")) {
    const openRow = rows.find((row) => row.state === "open" && row.size === closedRow.size && row.dir === closedRow.dir);
    assert(openRow, `missing open measurement for ${closedRow.dir} ${closedRow.size}`);
    if (Math.abs(closedRow.dx - openRow.dx) > TOLERANCE || Math.abs(closedRow.dy - openRow.dy) > TOLERANCE) {
      shifted.push(`${closedRow.dir} ${closedRow.size}: closed ${closedRow.dx},${closedRow.dy} open ${openRow.dx},${openRow.dy}`);
    }
  }
  assert.deepEqual(shifted, [], "closed and open chevron centres differ");
  console.log("split button chevron: ink stays on the trailing-button centre, and only rotates");

  // The painted glyph. Rotating the svg re-rasterises an odd device-pixel
  // height onto the neighbouring pixel. The centre here is the ink bounds of
  // a screenshot, in device pixels, and closed and open must share it.
  const paint = async (scale: number) => {
    const page = await browser.browser()!.newPage({ viewport: { width: 900, height: 1600 }, deviceScaleFactor: scale });
    await page.goto(`http://127.0.0.1:${server.port}/`);
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>(".mtrl-split-button__chevron").forEach((chevron) => {
        chevron.style.transition = "none";
      });
    });
    const buttons = page.locator(".mtrl-split-button__trailing");
    const bad: string[] = [];
    for (let i = 0; i < await buttons.count(); i++) {
      const button = buttons.nth(i);
      await button.scrollIntoViewIfNeeded();
      const label = await button.evaluate((node) => {
        const host = node.closest(".mtrl-split-button") as HTMLElement;
        return `${host.dataset.dir} ${host.dataset.size}`;
      });
      const centre = async (open: boolean) => {
        await button.evaluate((node, isOpen) => {
          node.closest(".mtrl-split-button")?.classList.toggle("mtrl-split-button--expanded", isOpen);
        }, open);
        const box = await button.boundingBox();
        assert(box, `${label} has no box`);
        const buf = await page.screenshot({
          clip: { x: box.x, y: box.y, width: Math.floor(box.width), height: Math.floor(box.height) },
        });
        return page.evaluate(async (src) => {
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
          const sample = 4 * (Math.floor(height * 0.15) * width + Math.floor(width * 0.1));
          const bg = [data[sample] ?? 0, data[sample + 1] ?? 0, data[sample + 2] ?? 0];
          let left = width;
          let right = 0;
          let top = height;
          let bottom = 0;
          for (let y = Math.floor(height * 0.25); y < height * 0.75; y++) {
            for (let x = Math.floor(width * 0.2); x < width * 0.8; x++) {
              const p = 4 * (y * width + x);
              const delta = Math.abs((data[p] ?? 0) - bg[0]) + Math.abs((data[p + 1] ?? 0) - bg[1]) + Math.abs((data[p + 2] ?? 0) - bg[2]);
              if (delta > 120) {
                left = Math.min(left, x);
                right = Math.max(right, x + 1);
                top = Math.min(top, y);
                bottom = Math.max(bottom, y + 1);
              }
            }
          }
          if (right <= left || bottom <= top) return null;
          return { dx: (left + right - width) / 2, dy: (top + bottom - height) / 2 };
        }, buf.toString("base64"));
      };
      const closedInk = await centre(false);
      const openInk = await centre(true);
      assert(closedInk && openInk, `paint scale ${scale} ${label} found no ink`);
      if (closedInk.dx !== openInk.dx || closedInk.dy !== openInk.dy) {
        bad.push(`${label} device-px ${closedInk.dx - openInk.dx} ${closedInk.dy - openInk.dy}`);
      }
    }
    await page.close();
    assert.deepEqual(bad, [], `paint scale ${scale}: closed and open pixels differ`);
    console.log(`paint scale ${scale}: closed and open share a device pixel`);
  };
  await paint(1);
  await paint(2);
  await paint(3);
} finally {
  await browser.close();
  server.stop(true);
  rmSync(scratch, { recursive: true, force: true });
}
