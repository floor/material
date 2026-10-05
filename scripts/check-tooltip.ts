#!/usr/bin/env bun
/** Browser coverage for the tooltip. Run after build. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import type { TooltipComponent, TooltipConfig, TooltipPosition } from "../src/components/tooltip/types";
import { TOOLTIP_POSITIONS } from "../src/components/tooltip/constants";

declare global {
  interface Window {
    ready: boolean;
    tooltip: TooltipComponent;
    mount: (config: TooltipConfig) => void;
  }
}

const artifacts = resolve("analysis/tooltip-colours");
await mkdir(artifacts, { recursive: true });
const bundle = await Bun.build({ entrypoints: [resolve("src/components/tooltip/index.ts")], minify: true, target: "browser" });
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
  const url = new URL(request.url);
  if (url.pathname === "/tooltip.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
  if (url.pathname === "/styles.css") return new Response(Bun.file("dist/styles.css"));
  return new Response(`<!doctype html><html><head><link rel="stylesheet" href="/styles.css">
  <style>body{margin:0}#target{position:absolute;left:300px;top:280px;width:40px;height:40px;border-radius:50%;
  background:#ddd;border:0}.mtrl-tooltip{transition:none!important}</style></head><body>
  <button id="target">&#9829;</button>
  <script type="module">import { createTooltip } from '/tooltip.js';
  window.mount = (config) => {
    window.tooltip?.destroy();
    window.tooltip = createTooltip({ target: document.querySelector('#target'), visible: true, ...config });
  };window.ready=true;</script></body></html>`, { headers: { "Content-Type": "text/html" } });
} });

/** The border side each arrow direction paints (the side facing the tooltip body). */
const paintedSide: Record<string, "top" | "right" | "bottom" | "left"> = {
  [TOOLTIP_POSITIONS.TOP]: "top", [TOOLTIP_POSITIONS.TOP_START]: "top", [TOOLTIP_POSITIONS.TOP_END]: "top",
  [TOOLTIP_POSITIONS.BOTTOM]: "bottom", [TOOLTIP_POSITIONS.BOTTOM_START]: "bottom", [TOOLTIP_POSITIONS.BOTTOM_END]: "bottom",
  [TOOLTIP_POSITIONS.LEFT]: "left", [TOOLTIP_POSITIONS.LEFT_START]: "left", [TOOLTIP_POSITIONS.LEFT_END]: "left",
  [TOOLTIP_POSITIONS.RIGHT]: "right", [TOOLTIP_POSITIONS.RIGHT_START]: "right", [TOOLTIP_POSITIONS.RIGHT_END]: "right",
};

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => window.ready);
  const variants = ["default", "plain", "rich"] as const;
  const positions = Object.values(TOOLTIP_POSITIONS) as TooltipPosition[];
  const rows: Record<string, unknown>[] = [];
  const failures: string[] = [];
  for (const mode of ["light", "dark"]) {
    await page.evaluate(mode => {
      document.documentElement.dataset.theme = "baseline";
      document.documentElement.dataset.themeMode = mode;
    }, mode);
    for (const variant of variants) for (const position of positions) {
      await page.evaluate(({ variant, position }) => window.mount({
        position, variant,
        text: variant === "rich" ? "Rich tooltip with two lines of text to show" : "Search, and filter",
      }), { variant, position });
      await page.waitForTimeout(30);
      const name = `${variant}-${mode}-${position}`;
      const seen = await page.evaluate(() => {
        const tooltip = document.querySelector(".mtrl-tooltip")!;
        const arrow = document.querySelector(".mtrl-tooltip__arrow")!;
        const surface = getComputedStyle(tooltip).backgroundColor;
        const style = getComputedStyle(arrow);
        const sides = {
          top: style.borderTopColor, right: style.borderRightColor,
          bottom: style.borderBottomColor, left: style.borderLeftColor,
        };
        return { className: arrow.className, surface, sides };
      });
      // A tooltip placed at the top points its arrow down at the target from the
      // tooltip's bottom edge, and so on: the painted side follows the placement.
      const side = paintedSide[position]!;
      const arrowClass = seen.className.split(" ").find(name => name.includes("__arrow--"));
      if (arrowClass !== `mtrl-tooltip__arrow--${{ top: "bottom", bottom: "top", left: "right", right: "left" }[side]}${position.endsWith("-start") ? "-start" : position.endsWith("-end") ? "-end" : ""}`) {
        failures.push(`${name}: arrow class ${arrowClass} for position ${position}`);
      }
      // The invariant: the arrow's computed colour is the tooltip surface's.
      if (seen.sides[side] !== seen.surface) {
        failures.push(`${name}: arrow colour ${seen.sides[side]} on surface ${seen.surface}`);
      }
      // Only the painted side carries colour; the other three stay transparent,
      // which is the triangle's geometry.
      for (const [other, colour] of Object.entries(seen.sides)) {
        if (other !== side && colour !== "transparent" && colour !== "rgba(0, 0, 0, 0)") {
          failures.push(`${name}: border-${other} painted ${colour}`);
        }
      }
      rows.push({ name, variant, mode, position, surface: seen.surface, arrow: seen.sides[side] });
      const clip = await page.evaluate(() => {
        const target = document.querySelector("#target")!.getBoundingClientRect();
        const tip = document.querySelector(".mtrl-tooltip")!.getBoundingClientRect();
        const x = Math.min(target.x, tip.x), y = Math.min(target.y, tip.y);
        const r = Math.max(target.right, tip.right), b = Math.max(target.bottom, tip.bottom);
        return { x: x - 48, y: y - 48, width: r - x + 96, height: b - y + 96 };
      });
      await page.screenshot({ path: `${artifacts}/${name}.png`, clip });
    }
  }
  assert.deepEqual(errors, []);
  // Every mismatch is collected, so one run names every failing case.
  assert.deepEqual(failures, []);
  await writeFile(`${artifacts}/report.json`, JSON.stringify({ rows, failures, errors }, null, 2));
  console.log(JSON.stringify({ variants: variants.length, positions: positions.length, modes: 2, checks: rows.length, errors }, null, 2));
} finally { await browser.close(); server.stop(true); }
