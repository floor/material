#!/usr/bin/env bun
/**
 * The split button's chevron ink, not its svg box.
 *
 * Closed and open, the ink sits on the trailing button's centre on both axes.
 * Opening the menu only rotates the glyph. The svg box is not the measurement:
 * the glyph's ink is off-centre in that box, and a 180 degree turn moves it.
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
} finally {
  await browser.close();
  server.stop(true);
  rmSync(scratch, { recursive: true, force: true });
}
