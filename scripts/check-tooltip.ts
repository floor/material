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
    mountPanelTooltip: (config: TooltipConfig) => void;
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
  // ?dir=rtl serves the same page right to left, for the placements section
  const direction = url.searchParams.get("dir") === "rtl" ? "rtl" : "ltr";
  return new Response(`<!doctype html><html dir="${direction}"><head><link rel="stylesheet" href="/styles.css">
  <style>body{margin:0}#target{position:absolute;left:300px;top:280px;width:40px;height:40px;border-radius:50%;
  background:#ddd;border:0}
  #panel{position:fixed;left:20px;top:20px;width:200px;height:150px;overflow:auto;background:#eee}
  #panel-inner{height:600px;width:400px}
  #panel-target{margin:250px 0 0 100px;width:40px;height:40px;border-radius:50%;background:#ddd;border:0}
  .mtrl-tooltip{transition:none!important}</style></head><body>
  <button id="target">&#9829;</button>
  <div id="panel"><div id="panel-inner"><button id="panel-target">&#9829;</button></div></div>
  <script type="module">import { createTooltip } from '/tooltip.js';
  window.mountTooltip = (config) => {
    window.tooltip?.destroy();
    window.tooltip = createTooltip({ target: document.querySelector('#target'), visible: true, ...config });
  };
  window.mountPanelTooltip = (config) => {
    window.tooltip?.destroy();
    window.tooltip = createTooltip({ target: document.querySelector('#panel-target'), visible: true, ...config });
  };window.ready=true;</script></body></html>`, { headers: { "Content-Type": "text/html" } });
} });

/** The border side each arrow direction paints (the side facing the tooltip body). */
const paintedSide: Record<string, "top" | "right" | "bottom" | "left"> = {
  [TOOLTIP_POSITIONS.TOP]: "top", [TOOLTIP_POSITIONS.TOP_START]: "top", [TOOLTIP_POSITIONS.TOP_END]: "top",
  [TOOLTIP_POSITIONS.BOTTOM]: "bottom", [TOOLTIP_POSITIONS.BOTTOM_START]: "bottom", [TOOLTIP_POSITIONS.BOTTOM_END]: "bottom",
  [TOOLTIP_POSITIONS.LEFT]: "left", [TOOLTIP_POSITIONS.LEFT_START]: "left", [TOOLTIP_POSITIONS.LEFT_END]: "left",
  [TOOLTIP_POSITIONS.RIGHT]: "right", [TOOLTIP_POSITIONS.RIGHT_START]: "right", [TOOLTIP_POSITIONS.RIGHT_END]: "right",
};

/** Fails with a message when |actual - wanted| is at least the tolerance. */
const near = (failures: string[], name: string, actual: number, wanted: number, tolerance = 0.5): void => {
  if (Math.abs(actual - wanted) >= tolerance) failures.push(`${name} ${actual.toFixed(1)}, expected ${wanted.toFixed(1)}`);
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
  const placementRows: Record<string, unknown>[] = [];
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
        const container = getComputedStyle(tooltip);
        const surface = container.backgroundColor;
        const style = getComputedStyle(arrow);
        const sides = {
          top: style.borderTopColor, right: style.borderRightColor,
          bottom: style.borderBottomColor, left: style.borderLeftColor,
        };
        return {
          className: arrow.className, surface, sides,
          typography: { weight: container.fontWeight, size: container.fontSize, lineHeight: container.lineHeight },
          padding: [container.paddingTop, container.paddingRight, container.paddingBottom, container.paddingLeft],
        };
      });
      // M3 tooltips specs: supporting text uses Body Small (plain/default)
      // or Body Medium (rich); the rich container has an 8dp bottom inset.
      const rich = variant === "rich";
      const expectedTypography = { weight: "400", size: rich ? "14px" : "12px", lineHeight: rich ? "20px" : "16px" };
      const expectedPadding = rich ? ["12px", "16px", "8px", "16px"] : ["4px", "8px", "4px", "8px"];
      if (position === TOOLTIP_POSITIONS.TOP) console.log(`tooltip metrics ${variant}-${mode}: ${JSON.stringify({ typography: seen.typography, padding: seen.padding })}`);
      if (JSON.stringify(seen.typography) !== JSON.stringify(expectedTypography)) failures.push(`${name}: typography ${JSON.stringify(seen.typography)}, expected ${JSON.stringify(expectedTypography)}`);
      if (JSON.stringify(seen.padding) !== JSON.stringify(expectedPadding)) failures.push(`${name}: padding ${seen.padding.join(" ")}, expected ${expectedPadding.join(" ")}`);
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
      rows.push({ name, variant, mode, position, surface: seen.surface, arrow: seen.sides[side], typography: seen.typography, padding: seen.padding });
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

  // --------------------------------------------------------------- placements
  // A tooltip sits DEFAULT_OFFSET (8px) from its target on the named side,
  // aligned along the shared edge as start/end says, and its arrow fills the
  // gap: the arrow's tip meets the target's edge and its body stays over the
  // target's span. m3.material.io's tooltip specs are silent on placements,
  // alignment and arrows, so the contract measured here is the API's own,
  // the twelve TOOLTIP_POSITIONS values, and it must hold in a right-to-left
  // page exactly as in a left-to-right one: every placement path in api.ts
  // is physical.
  const OFFSET = 8; // DEFAULT_OFFSET, src/components/tooltip/types.ts
  for (const dir of ["ltr", "rtl"] as const) {
    await page.goto(`http://127.0.0.1:${server.port}/?dir=${dir}`);
    await page.waitForFunction(() => window.ready);
    for (const position of positions) {
      await page.evaluate(({ position }) => window.mountTooltip({ position, text: "Search, and filter" }), { position });
      await page.waitForTimeout(30);
      const seen = await page.evaluate(() => {
        const box = (element: Element) => {
          const r = element.getBoundingClientRect();
          return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
        };
        const tip = document.querySelector(".mtrl-tooltip")!;
        return {
          target: box(document.querySelector("#target")!),
          tip: box(tip),
          arrow: box(tip.querySelector(".mtrl-tooltip__arrow")!),
        };
      });
      const name = `placement ${position} (${dir})`;
      const side = position.split("-")[0] as "top" | "right" | "bottom" | "left";
      const align = position.endsWith("-start") ? "start" : position.endsWith("-end") ? "end" : "center";
      // The gap along the placement axis, and the arrow tip's distance to the
      // target's near edge: the offset once, with the arrow filling it.
      const gap =
        side === "right" ? seen.tip.left - seen.target.right
        : side === "left" ? seen.target.left - seen.tip.right
        : side === "bottom" ? seen.tip.top - seen.target.bottom
        : seen.target.top - seen.tip.bottom;
      near(failures, `${name}: gap`, gap, OFFSET);
      const arrowTipToTarget = Math.abs(
        (side === "right" ? seen.arrow.left - seen.target.right
        : side === "left" ? seen.target.left - seen.arrow.right
        : side === "bottom" ? seen.arrow.top - seen.target.bottom
        : seen.target.top - seen.arrow.bottom),
      );
      near(failures, `${name}: arrow tip to target`, arrowTipToTarget, 0);
      // The alignment along the shared edge: the start, end or centre of the
      // tooltip against the target's, and the arrow over the target's span.
      if (side === "top" || side === "bottom") {
        if (align === "start") near(failures, `${name}: start edge`, seen.tip.left, seen.target.left);
        else if (align === "end") near(failures, `${name}: end edge`, seen.tip.right, seen.target.right);
        else near(failures, `${name}: centre`, (seen.tip.left + seen.tip.right) / 2, (seen.target.left + seen.target.right) / 2);
        if (!(seen.arrow.right > seen.target.left && seen.arrow.left < seen.target.right)) {
          failures.push(`${name}: arrow ${seen.arrow.left.toFixed(1)}..${seen.arrow.right.toFixed(1)} outside the target ${seen.target.left.toFixed(1)}..${seen.target.right.toFixed(1)}`);
        }
      } else {
        if (align === "start") near(failures, `${name}: start edge`, seen.tip.top, seen.target.top);
        else if (align === "end") near(failures, `${name}: end edge`, seen.tip.bottom, seen.target.bottom);
        else near(failures, `${name}: centre`, (seen.tip.top + seen.tip.bottom) / 2, (seen.target.top + seen.target.bottom) / 2);
        if (!(seen.arrow.bottom > seen.target.top && seen.arrow.top < seen.target.bottom)) {
          failures.push(`${name}: arrow ${seen.arrow.top.toFixed(1)}..${seen.arrow.bottom.toFixed(1)} outside the target ${seen.target.top.toFixed(1)}..${seen.target.bottom.toFixed(1)}`);
        }
      }
      placementRows.push({ position, dir, gap, arrowTipToTarget });
    }
  }

  // --------------------------------------------------------------- collision
  // The placements above sit mid-screen. At a viewport edge the surface is
  // clamped inside the viewport, and on its placement axis it flips to the
  // other side when it does not fit there; through every one of those moves
  // the arrow keeps meeting the target — over its span, tip on its edge —
  // and when a top or bottom placement flips, the arrow class flips with it:
  // a flipped top-start tooltip draws its arrow on its own top edge, pointing
  // up at the target from below. m3.material.io's tooltip specs are silent on
  // collision, so this, like the placements, is the API's own contract, and
  // it holds in a right-to-left page exactly as in a left-to-right one.
  const WIDE = "A plain tooltip with enough words to reach its two hundred pixel maximum width on a small target";
  const TALL = "A plain tooltip whose words wrap across enough lines at its two hundred pixel maximum width to stand taller than the small target it must stay beside at a viewport edge";
  const mountAt = async (position: TooltipPosition, text: string, x: number, y: number) => {
    await page.evaluate(({ position, text, x, y }) => {
      const target = document.querySelector("#target") as HTMLElement;
      target.style.left = `${x}px`;
      target.style.top = `${y}px`;
      window.mountTooltip({ position, text });
    }, { position, text, x, y });
    await page.waitForTimeout(30);
    return page.evaluate(() => {
      const box = (element: Element) => {
        const r = element.getBoundingClientRect();
        return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
      };
      const target = document.querySelector("#target")!;
      const tip = document.querySelector(".mtrl-tooltip")!;
      const arrow = tip.querySelector(".mtrl-tooltip__arrow") as HTMLElement;
      const seen = {
        target: box(target), tip: box(tip), arrow: box(arrow),
        arrowClass: arrow.className.split(" ").find(name => name.includes("__arrow--")) ?? "(none)",
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
      (target as HTMLElement).style.left = "300px";
      (target as HTMLElement).style.top = "280px";
      return seen;
    });
  };
  type CollisionCase = { name: string; position: TooltipPosition; x: number; y: number; text?: string; flippedTo?: string };
  const collisionCases: CollisionCase[] = [
    // The horizontal clamp, on both alignments and the centre, at both edges
    { name: "clamp centre near left edge", position: "bottom", x: 0, y: 280, text: WIDE },
    { name: "clamp end at left edge", position: "bottom-end", x: 0, y: 280, text: WIDE },
    { name: "clamp start at right edge", position: "bottom-start", x: 760, y: 280, text: WIDE },
    { name: "clamp centre near right edge", position: "bottom", x: 780, y: 280, text: WIDE },
    { name: "clamp top centre near left edge", position: "top", x: 0, y: 280, text: WIDE },
    { name: "clamp top end at left edge", position: "top-end", x: 0, y: 280, text: WIDE },
    { name: "clamp top start at right edge", position: "top-start", x: 760, y: 280, text: WIDE },
    // The placement axis: a surface that does not fit flips to the other
    // side, and its arrow class flips with it
    { name: "flip top near top edge", position: "top", x: 300, y: 8, text: WIDE, flippedTo: "top" },
    { name: "flip top-start near top edge", position: "top-start", x: 300, y: 8, text: WIDE, flippedTo: "top-start" },
    { name: "flip bottom near bottom edge", position: "bottom", x: 300, y: 560, text: WIDE, flippedTo: "bottom" },
    { name: "flip bottom-end near bottom edge", position: "bottom-end", x: 300, y: 560, text: WIDE, flippedTo: "bottom-end" },
    // A left or right surface taller than the space below or above the
    // target is clamped, and its arrow re-anchors vertically
    { name: "vertical clamp right-end at top edge", position: "right-end", x: 400, y: 8, text: TALL },
    { name: "vertical clamp right-start at bottom edge", position: "right-start", x: 400, y: 560, text: TALL },
  ];
  const collisionRows: Record<string, unknown>[] = [];
  for (const dir of ["ltr", "rtl"] as const) {
    await page.goto(`http://127.0.0.1:${server.port}/?dir=${dir}`);
    await page.waitForFunction(() => window.ready);
    for (const c of collisionCases) {
      const seen = await mountAt(c.position, c.text ?? "Search, and filter", c.x, c.y);
      const name = `${c.name} (${dir})`;
      if (seen.tip.left < -0.5 || seen.tip.right > seen.viewport.width + 0.5 || seen.tip.top < -0.5 || seen.tip.bottom > seen.viewport.height + 0.5) {
        failures.push(`${name}: surface ${seen.tip.left.toFixed(1)},${seen.tip.top.toFixed(1)}..${seen.tip.right.toFixed(1)},${seen.tip.bottom.toFixed(1)} outside the viewport ${seen.viewport.width}x${seen.viewport.height}`);
      }
      const side = c.position.split("-")[0] as "top" | "right" | "bottom" | "left";
      // A flip moves the surface to the opposite side of the target, so the
      // gap and the arrow's tip are measured on the side it actually sits.
      const vertical = side === "top" || side === "bottom";
      const below = seen.tip.top - seen.target.bottom;
      const above = seen.target.top - seen.tip.bottom;
      const rightward = seen.tip.left - seen.target.right;
      const leftward = seen.target.left - seen.tip.right;
      const sitsBelow = vertical ? below >= 0 : false;
      const sitsRight = !vertical ? rightward >= 0 : false;
      const gap = vertical
        ? (sitsBelow ? below : above)
        : (sitsRight ? rightward : leftward);
      near(failures, `${name}: gap`, gap, OFFSET);
      const arrowTipToTarget = Math.abs(
        vertical
          ? (sitsBelow ? seen.arrow.top - seen.target.bottom : seen.target.top - seen.arrow.bottom)
          : (sitsRight ? seen.arrow.left - seen.target.right : seen.target.left - seen.arrow.right),
      );
      near(failures, `${name}: arrow tip to target`, arrowTipToTarget, 0);
      // The arrow stays over the target's span along the cross axis
      const overlap = side === "top" || side === "bottom"
        ? seen.arrow.right - seen.target.left > 0 && seen.arrow.left < seen.target.right
        : seen.arrow.bottom - seen.target.top > 0 && seen.arrow.top < seen.target.bottom;
      if (!overlap) {
        failures.push(`${name}: arrow ${seen.arrow.left.toFixed(1)},${seen.arrow.top.toFixed(1)}..${seen.arrow.right.toFixed(1)},${seen.arrow.bottom.toFixed(1)} outside the target span`);
      }
      if (c.flippedTo && seen.arrowClass !== `mtrl-tooltip__arrow--${c.flippedTo}`) {
        failures.push(`${name}: arrow class ${seen.arrowClass} after the flip, expected --${c.flippedTo}`);
      }
      collisionRows.push({ name, ...seen, gap });
    }
  }
  // Back to the plain left-to-right page the scrolled section starts from
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => window.ready);

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

  // ── Scrolling containers ────────────────────────────────────────
  // Scroll events do not bubble, so a window "scroll" listener without
  // capture never hears a container scroll: the fixed surface stays where
  // the container's scroll left it, pointing away from its target. The
  // listener captures, so the surface follows the container too.
  const panelBox = () => page.evaluate(() => {
    const box = (element: Element) => {
      const { top, left, right, bottom } = element.getBoundingClientRect();
      return { top, left, right, bottom };
    };
    return { target: box(document.querySelector("#panel-target")!), tip: box(document.querySelector(".mtrl-tooltip")!) };
  });
  const containerRows: Record<string, unknown>[] = [];
  for (const layer of [undefined, "top"] as const) for (const position of ["bottom", "right"] as const) {
    const name = `container-scroll${layer ? " top-layer" : ""} ${position}`;
    await page.evaluate(({ position, layer }) => {
      document.querySelector("#panel")!.scrollTop = 100;
      window.mountPanelTooltip({ position, layer, text: "Search, and filter" });
    }, { position, layer });
    await page.waitForTimeout(30);
    const before = await panelBox();
    // 80px keeps the target inside the panel's visible box, so no viewport
    // clamp fires and the section measures following, not clamping
    await page.evaluate(() => { document.querySelector("#panel")!.scrollTop = 180; });
    await page.waitForTimeout(30);
    const after = await panelBox();
    const moved = { dx: after.target.left - before.target.left, dy: after.target.top - before.target.top };
    const followed = { dx: after.tip.left - before.tip.left, dy: after.tip.top - before.tip.top };
    if (moved.dx === 0 && moved.dy === 0) {
      failures.push(`${name}: scrolling the container moved the target by 0,0 -- the section's setup broke`);
    } else if (Math.abs(followed.dx - moved.dx) > 1 || Math.abs(followed.dy - moved.dy) > 1) {
      failures.push(
        `${name}: the container scrolled its target by ${moved.dx.toFixed(1)},${moved.dy.toFixed(1)} ` +
        `but the surface moved ${followed.dx.toFixed(1)},${followed.dy.toFixed(1)}`,
      );
    }
    containerRows.push({ name, position, layer: layer ?? "body", moved, followed });
    await page.evaluate(() => window.tooltip?.destroy());
  }

  // ── The offset and the clamped edge ─────────────────────────────
  // The surface is measured fractionally (its computed size, not the
  // integer-rounded offsetWidth), so the 8px offset is 8 on the axis that
  // measures a fractional width, and a clamp holds the surface inside the
  // edge it clamped to, not a fraction of a pixel past it.
  const offsetRows: Record<string, unknown>[] = [];
  for (const position of ["left", "left-start", "left-end", "top", "bottom"] as const) {
    const shown = await showAt(300, 280, position, undefined, 0, 0);
    // gap() is keyed by the bare side: the start/end variants share its axis
    const measured = gap(position.split("-")[0] as "left", shown.target, shown.tip);
    near(failures, `offset ${position}: gap`, measured, 8, 0.1);
    offsetRows.push({ name: `offset ${position}`, gap: measured });
  }
  {
    // A one-line label whose start-aligned surface clamps at the right edge
    const shown = await showAt(760, 280, "bottom-start", undefined, 0, 0);
    const overshoot = shown.tip.right - shown.viewport.width;
    near(failures, "clamped right edge: distance from the viewport edge", overshoot, 0, 0.1);
    offsetRows.push({ name: "clamped right edge off the viewport edge", overshoot });
  }

  assert.deepEqual(errors, []);
  // Every mismatch is collected, so one run names every failing case.
  await writeFile(`${artifacts}/report.json`, JSON.stringify({ rows, placements: placementRows, collision: collisionRows, scrolled: scrolledRows, container: containerRows, offset: offsetRows, failures, errors }, null, 2));
  assert.deepEqual(failures, []);
  console.log(JSON.stringify({ variants: variants.length, positions: positions.length, modes: 2, checks: rows.length, collision: collisionRows.length, scrolled: scrolledRows.length, container: containerRows.length, offset: offsetRows.length, errors }, null, 2));
} finally { await browser.close(); server.stop(true); }
