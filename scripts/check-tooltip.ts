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
    mountTooltip: (config: TooltipConfig) => void;
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
  window.mountTooltip = (config) => {
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
      await page.evaluate(({ variant, position }) => window.mountTooltip({
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

  // --------------------------------------------------------------- scrolled page
  // The surface is `position: fixed` in every path (`src/styles/components/_tooltip.scss:13`),
  // so its inline top/left place it in viewport coordinates, and a top-layer
  // popover is placed in viewport coordinates too. The offset between a
  // tooltip and its target is therefore a function of their viewport positions
  // alone: holding the target at one viewport position and scrolling the page
  // must not change it. The non-top-layer path added window.scrollX/Y to the
  // target's already viewport-relative rectangle, which moved the tooltip away
  // by the scroll distance.
  const scrollBy = 500;
  await page.evaluate(() => {
    // A page taller and wider than the viewport, so it scrolls on both axes
    document.body.style.width = "1800px";
    document.body.style.height = "1700px";
  });

  type Box = { top: number; left: number; right: number; bottom: number };
  const boxes = () => page.evaluate(() => {
    const box = (element: Element): Box => {
      const { top, left, right, bottom } = element.getBoundingClientRect();
      return { top, left, right, bottom };
    };
    return {
      target: box(document.querySelector("#target")!),
      tip: box(document.querySelector(".mtrl-tooltip")!),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scroll: { x: window.scrollX, y: window.scrollY },
    };
  });

  /**
   * Shows a tooltip on the target, held at a viewport position on a page
   * scrolled by (scrollX, scrollY), and measures both boxes.
   */
  const showAt = async (
    viewportX: number, viewportY: number, position: TooltipPosition, layer: "top" | undefined, scrollX: number, scrollY: number,
  ) => {
    await page.evaluate(({ targetX, targetY, scrollX, scrollY }) => {
      const target = document.querySelector("#target") as HTMLElement;
      target.style.left = `${targetX}px`;
      target.style.top = `${targetY}px`;
      window.scrollTo(scrollX, scrollY);
    }, { targetX: viewportX + scrollX, targetY: viewportY + scrollY, scrollX, scrollY });
    await page.evaluate(({ position, layer }) => window.mountTooltip({
      position, layer, text: "Search, and filter",
    }), { position, layer });
    await page.waitForTimeout(30);
    return boxes();
  };

  /** The gap between the two boxes along the placement axis. */
  const gap = (position: TooltipPosition, target: Box, tip: Box): number =>
    ({ top: target.top - tip.bottom, bottom: tip.top - target.bottom, left: target.left - tip.right, right: tip.left - target.right } as Record<string, number>)[position]!;

  const scenarios: { name: string; position: TooltipPosition; layer?: "top"; x: number; y: number }[] = [];
  for (const layer of [undefined, "top"] as const) for (const side of ["top", "bottom", "left", "right"] as const) {
    scenarios.push({ name: `${layer ? "top-layer " : ""}${side}`, position: side, layer, x: 400, y: 300 });
  }
  // The horizontal clamp, at either viewport edge, when scrolled
  scenarios.push({ name: "left edge", position: "left", x: 0, y: 300 });
  scenarios.push({ name: "right edge", position: "right", x: 760, y: 300 });

  const scrolledRows: Record<string, unknown>[] = [];
  for (const scenario of scenarios) {
    const flat = await showAt(scenario.x, scenario.y, scenario.position, scenario.layer, 0, 0);
    const down = await showAt(scenario.x, scenario.y, scenario.position, scenario.layer, scrollBy, scrollBy);
    const name = `scrolled-${scenario.name.replace(/ /g, "-")}`;
    if (down.scroll.x !== scrollBy || down.scroll.y !== scrollBy) {
      failures.push(`${name}: asked for a scroll of ${scrollBy},${scrollBy}, measured at ${down.scroll.x},${down.scroll.y}`);
    }
    const before = { dx: flat.tip.left - flat.target.left, dy: flat.tip.top - flat.target.top };
    const after = { dx: down.tip.left - down.target.left, dy: down.tip.top - down.target.top };
    if (Math.abs(after.dx - before.dx) > 1 || Math.abs(after.dy - before.dy) > 1) {
      failures.push(
        `${name}: at scroll ${scrollBy},${scrollBy} the tooltip sits ${after.dx.toFixed(1)},${after.dy.toFixed(1)} from its target, ` +
        `against ${before.dx.toFixed(1)},${before.dy.toFixed(1)} unscrolled ` +
        `(gap ${gap(scenario.position, down.target, down.tip).toFixed(1)}px against ${gap(scenario.position, flat.target, flat.tip).toFixed(1)}px)`,
      );
    }
    if (down.tip.left < -1 || down.tip.right > down.viewport.width + 1) {
      failures.push(`${name}: scrolled tooltip outside the viewport at ${down.tip.left.toFixed(1)}..${down.tip.right.toFixed(1)} of ${down.viewport.width}`);
    }
    scrolledRows.push({ name, position: scenario.position, layer: scenario.layer ?? "body", unscrolled: before, scrolled: after });
  }

  assert.deepEqual(errors, []);
  // Every mismatch is collected, so one run names every failing case.
  assert.deepEqual(failures, []);
  await writeFile(`${artifacts}/report.json`, JSON.stringify({ rows, scrolled: scrolledRows, failures, errors }, null, 2));
  console.log(JSON.stringify({ variants: variants.length, positions: positions.length, modes: 2, checks: rows.length, scrolled: scrolledRows.length, errors }, null, 2));
} finally { await browser.close(); server.stop(true); }
