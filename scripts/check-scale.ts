#!/usr/bin/env bun
/**
 * The scale factor, in a real browser. Run after build.
 *
 * `--mtrl-scale` on `.mtrl-scale` / `[data-mtrl-scale]` is one number the
 * whole product scales by. The stylesheet rule is one line, but everything
 * that measures a box and writes a length back — ripples, popup placement,
 * scroll-into-view, a canvas backing store — gets it wrong on its own: a rect
 * read inside a zoomed subtree is in visual pixels, a length written there is
 * scaled again. This check renders each fixture twice, once at factor 1 and
 * once inside a scaled wrapper, and compares, so the z² defect cannot come
 * back through any of those sites.
 *
 * Every stage of the build adds its assertions here:
 *   1  the rule and `effectiveZoom`
 *   2  ripples (this section)
 *   3  placement and sizing sites
 *   4  overlays under body, and the fixed-position roots
 *   5  floors: focus rings and 1px lines
 *   6  nesting
 *
 *   bun run scripts/check-scale.ts
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

type Box = { width: number; height: number };
type Wave = { host: Box; wave: Box; centre: { x: number; y: number } };
type Measurement = {
  boxes: Record<string, Box>;
  zoom: Record<string, number | string>;
};
type PressedWave = Wave & { press: { x: number; y: number } };

declare global {
  interface Window {
    material: Record<string, unknown>;
    core: { effectiveZoom: (element: Element | null) => number };
    scale: {
      elements: Record<string, HTMLElement>;
      mount: () => void;
      mountOne: (host: string, name: string) => void;
      markAll: () => void;
      wave: () => Wave | null;
      probe: (x: number, y: number) => { viewport: Box; scroll: { x: number; y: number }; at: string };
      measure: () => Measurement;
    };
    ready: boolean;
  }
}

const FACTOR = 0.5;
const ICON = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg>';
const artifacts = resolve("analysis/scale");
await mkdir(artifacts, { recursive: true });

const bundle = async (entry: string): Promise<string> => {
  const built = await Bun.build({ entrypoints: [resolve(entry)], minify: true, target: "browser" });
  assert(built.success, String(built.logs));
  return built.outputs[0].text();
};
const js = {
  material: await bundle("src/index.ts"),
  core: await bundle("src/core/index.ts"),
};

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/material.js")
      return new Response(js.material, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/core.js")
      return new Response(js.core, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
    return new Response(
      `<!doctype html><html><head><link rel="stylesheet" href="/styles.css">
<style>
  body { margin: 0; }
  /* Enough room that a scaled fixture sits beside its factor-1 twin rather
     than wrapping into it: the comparison reads boxes, not positions. */
  main { display: inline-block; vertical-align: top; margin: 8px; }
</style></head><body>
<main id="host-plain"></main>
<div id="scale-class" class="mtrl-scale" style="--mtrl-scale: ${FACTOR}"><main id="host-class"></main></div>
<div id="scale-attr" data-mtrl-scale style="--mtrl-scale: ${FACTOR}"><main id="host-attr"></main></div>
<div id="scale-default" class="mtrl-scale"><main id="host-default"></main></div>
<script type="module">
import * as material from "/material.js";
import * as core from "/core.js";
window.material = material;
window.core = core;
window.scale = { elements: {}, mount: () => {}, mountOne: () => {}, markAll: () => {}, wave: () => null, measure: () => ({}) };
/** The helper where it exists, 1 where it does not: a missing export fails
    the assertions below instead of throwing out of the measurement. */
const effectiveZoom = (element) =>
  typeof window.core.effectiveZoom === "function" ? window.core.effectiveZoom(element) : 1;
const ICON = ${JSON.stringify(ICON)};
const fixtures = {
  button: () => material.createButton({ text: "Save" }),
  textField: () => material.createTextField({ label: "Name", value: "Ada" }),
  card: () => {
    // "clickable" wires withRipple in, "ripple" is what mounts the wave:
    // without it a card is clickable and silent (the spike's row 1 note).
    const card = material.createCard({ variant: "filled", clickable: true, ripple: true });
    card.element.style.width = "344px";
    card.setHeader(material.createCardHeader({ title: "Trip", subtitle: "Paris" }));
    return card;
  },
  iconButton: () => material.createIconButton({ icon: ICON, ariaLabel: "More" }),
  fab: () => material.createFab({ icon: ICON, ariaLabel: "Compose" }),
  extendedFab: () => material.createExtendedFab({ icon: ICON, text: "Compose" }),
  chip: () => material.createFilterChip({ label: "Plain" }),
  tab: () => material.createTabs({ tabs: [{ text: "One", value: "one" }, { text: "Two", value: "two" }] }),
  splitButton: () => material.createSplitButton({ text: "Save", items: [{ id: "a", text: "Alpha" }] }),
  buttonGroup: () => material.createButtonGroup({ kind: "connected", selection: "single", buttons: [{ value: "a", text: "Left" }, { value: "b", text: "Right" }] }),
  drawer: () => material.createDrawer({ variant: "standard", open: true, items: [{ id: "inbox", label: "Inbox" }, { id: "sent", label: "Sent" }] }),
  navigationBar: () => {
    // The bar is inline-size 100% with flex 1 1 0 items, so against the host's
    // shrink-to-fit inline-block it collapses to zero width; a consumer gives
    // it a block context. 400px is a definite width for the measurement.
    const bar = material.createNavigationBar({ items: [{ id: "a", label: "Home", icon: ICON }, { id: "b", label: "Search", icon: ICON }] });
    bar.element.style.width = "400px";
    return bar;
  },
  navigationRail: () => material.createNavigationRail({ items: [{ id: "a", label: "Inbox", icon: ICON }, { id: "b", label: "Sent", icon: ICON }] }),
};
/** Stage-1 fixtures, all four hosts at once, for the box comparison. */
window.scale.mount = () => {
  for (const host of ["plain", "class", "attr", "default"]) {
    const node = document.querySelector("#host-" + host);
    for (const name of ["button", "textField", "card"]) {
      const instance = fixtures[name]();
      node.append(instance.element);
      window.scale.elements[host + ":" + name] = instance.element;
    }
  }
};
/** One fixture at a time, in one host, so nothing overlaps a press. */
window.scale.mountOne = (host, name) => {
  for (const other of ["plain", "class", "attr", "default"]) {
    const node = document.querySelector("#host-" + other);
    node.replaceChildren();
    // Only the host under test is in the layout: a fixture that leaves the
    // flow (a fixed rail, an open drawer) would otherwise sit over, or under,
    // whatever the other hosts render and the press would land on that.
    node.style.display = other === host ? "" : "none";
  }
  const instance = fixtures[name]();
  instance.element.id = "fixture";
  document.querySelector("#host-" + host).append(instance.element);
  window.scale.mounted = instance;
};
/** What is under a point, for a press that produces no wave. */
window.scale.probe = (x, y) => {
  const chain = [];
  for (let element = document.elementFromPoint(x, y); element && chain.length < 4; element = element.parentElement)
    chain.push(element.tagName.toLowerCase() + "." + String(element.className));
  return {
    viewport: { width: innerWidth, height: innerHeight },
    scroll: { x: window.scrollX, y: window.scrollY },
    at: chain.join(" < "),
  };
};
/** Marks everything on the page now; the press adds the wave after this. */
window.scale.markAll = () => {
  document.querySelectorAll("*").forEach((element) => element.setAttribute("data-wave-seen", ""));
};
const round = (value) => Math.round(value * 1000) / 1000;
window.scale.wave = () => {
  const wave = [...document.querySelectorAll("*")].find(
    (element) => !element.hasAttribute("data-wave-seen") && /ripple/.test(element.className),
  );
  if (!wave) return null;
  // The wave animates from scale(0): freeze it at its layout box so the
  // measurement is the size the script wrote, not where the animation is.
  // The animation scales about the centre, so the settled centre is the
  // centre of that box.
  wave.style.animation = "none";
  wave.style.transform = "none";
  const rect = wave.getBoundingClientRect();
  const host = wave.parentElement.getBoundingClientRect();
  const out = {
    host: { width: round(host.width), height: round(host.height) },
    wave: { width: round(rect.width), height: round(rect.height) },
    centre: { x: round(rect.left + rect.width / 2), y: round(rect.top + rect.height / 2) },
  };
  wave.remove();
  document.querySelectorAll("[data-wave-seen]").forEach((element) => element.removeAttribute("data-wave-seen"));
  return out;
};
window.scale.measure = () => {
  const out = { boxes: {}, zoom: {} };
  for (const [key, element] of Object.entries(window.scale.elements)) {
    const rect = element.getBoundingClientRect();
    out.boxes[key] = { width: round(rect.width), height: round(rect.height) };
  }
  for (const [key, element] of Object.entries(window.scale.elements))
    out.zoom[key] = round(effectiveZoom(element));
  for (const host of ["class", "attr", "default"]) {
    const wrapper = document.querySelector("#scale-" + host);
    out.zoom["wrapper:" + host] = round(effectiveZoom(wrapper));
    out.zoom["computed:" + host] = getComputedStyle(wrapper).zoom;
  }
  out.zoom["outside"] = round(effectiveZoom(document.body));
  return out;
};
window.ready = true;
</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  },
});

const browser = await chromium.launch({ headless: true });
const rows: Record<string, unknown>[] = [];
const failures: string[] = [];

/** One measured number against its expected value; every miss is collected. */
const near = (label: string, actual: unknown, expected: number, tolerance: number): void => {
  const ok = typeof actual === "number" && Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
  rows.push({ label, actual, expected, tolerance, ok });
  if (!ok) failures.push(`${label}: ${String(actual)}, expected ${expected} ±${tolerance}`);
};

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => window.ready);
  await page.evaluate(() => window.scale.mount());
  await page.waitForTimeout(50);
  const measured = await page.evaluate(() => window.scale.measure());

  // ---- Stage 1: the helper is exported
  // From `material/core` (and `material/core/dom`); not from the root, whose
  // export list is fixed.
  const exported = await page.evaluate(() => typeof window.core.effectiveZoom);
  rows.push({ label: "stage1 helper: core exports effectiveZoom", actual: exported, expected: "function", ok: exported === "function" });
  if (exported !== "function") failures.push(`stage1 helper: core exports effectiveZoom: ${exported}, expected function`);

  // ---- Stage 1: the rule
  // `.mtrl-scale` with `--mtrl-scale: 0.5` on it renders its subtree at half
  // size; the attribute does the same; the class with no custom property set
  // leaves the subtree alone.
  near("stage1 rule: .mtrl-scale zoom with --mtrl-scale: 0.5", Number(measured.zoom["computed:class"]), FACTOR, 0);
  near("stage1 rule: [data-mtrl-scale] zoom with --mtrl-scale: 0.5", Number(measured.zoom["computed:attr"]), FACTOR, 0);
  near("stage1 rule: .mtrl-scale zoom with no --mtrl-scale", Number(measured.zoom["computed:default"]), 1, 0);

  // ---- Stage 1: the helper
  // `effectiveZoom` reads the cumulative zoom: 0.5 inside a scaled wrapper, 1
  // outside one, 1 under `.mtrl-scale` with no factor set.
  near("stage1 helper: body effectiveZoom", measured.zoom["outside"], 1, 0.001);
  near("stage1 helper: wrapper:.mtrl-scale", measured.zoom["wrapper:class"], FACTOR, 0.001);
  near("stage1 helper: wrapper:[data-mtrl-scale]", measured.zoom["wrapper:attr"], FACTOR, 0.001);
  near("stage1 helper: wrapper:.mtrl-scale with no --mtrl-scale", measured.zoom["wrapper:default"], 1, 0.001);

  // ---- Stage 1: boxes
  // Each fixture's box, rendered in a scaled wrapper, is half its factor-1
  // box: the rule reaches the components, and it reaches them through the
  // attribute as well as the class.
  for (const host of ["class", "attr", "default"] as const) {
    const factor = host === "default" ? 1 : FACTOR;
    for (const name of ["button", "textField", "card"] as const) {
      const plain = measured.boxes[`plain:${name}`];
      const scaled = measured.boxes[`${host}:${name}`];
      near(`stage1 helper: ${host} ${name} effectiveZoom`, measured.zoom[`${host}:${name}`], factor, 0.001);
      near(`stage1 box: ${host} ${name} width ratio`, scaled.width / plain.width, factor, 0.005);
      near(`stage1 box: ${host} ${name} height ratio`, scaled.height / plain.height, factor, 0.005);
    }
  }

  // ---- Stage 2: ripples
  // A wave is written in the host's own layout pixels from a rect read in
  // visual ones: `size = max(host box) * 2`, centred on the press point.
  // Inside a scaled container both need the host's zoom divided out. Each
  // host keeps its factor-1 wave-to-host ratio, and its wave stays under the
  // pointer at both factors. Every host the spike lists, and the two ripple
  // implementations (compose, and the rail's own).
  const RIPPLE_TARGETS: Record<string, string> = {
    button: "#fixture",
    iconButton: "#fixture",
    fab: "#fixture",
    extendedFab: "#fixture",
    card: "#fixture",
    chip: "#fixture .mtrl-chip__action",
    tab: "#fixture [role=tab]",
    splitButton: "#fixture .mtrl-split-button__leading",
    buttonGroup: "#fixture .mtrl-button",
    drawer: "#fixture .mtrl-drawer__item",
    navigationBar: "#fixture .mtrl-navigation-bar__item",
    navigationRail: "#fixture .mtrl-navigation-rail__item",
  };
  const pressWave = async (host: string, name: string, target: string): Promise<PressedWave | null> => {
    await page.evaluate(({ host, name }) => window.scale.mountOne(host, name), { host, name });
    await page.waitForTimeout(30);
    await page.evaluate(() => window.scale.markAll());
    const box = await page.locator(target).first().boundingBox();
    if (!box) {
      failures.push(`stage2 ripple: ${host} ${name}: nothing matched ${target}`);
      rows.push({ label: `stage2 ripple: ${host} ${name} target`, actual: target, expected: "an element", ok: false });
      return null;
    }
    const press = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.7 };
    await page.mouse.move(press.x, press.y);
    await page.mouse.down();
    await page.waitForTimeout(60);
    const wave = await page.evaluate(() => window.scale.wave());
    await page.mouse.up();
    await page.mouse.move(1, 1);
    if (!wave) {
      const probe = await page.evaluate(({ x, y }) => window.scale.probe(x, y), press);
      failures.push(
        `stage2 ripple: ${host} ${name}: no wave appeared under a press on ${target} — press ${Math.round(press.x)},${Math.round(press.y)} of ${probe.viewport.width}x${probe.viewport.height}, scroll ${probe.scroll.x},${probe.scroll.y}, under the pointer ${probe.at}`,
      );
      rows.push({ label: `stage2 ripple: ${host} ${name} wave`, actual: null, expected: "a wave element", ok: false });
      return null;
    }
    return { ...wave, press };
  };
  const ripplesAt = async (host: string): Promise<Record<string, PressedWave | null>> => {
    const out: Record<string, PressedWave | null> = {};
    for (const [name, target] of Object.entries(RIPPLE_TARGETS)) out[name] = await pressWave(host, name, target);
    return out;
  };
  const ripples = { plain: await ripplesAt("plain"), class: await ripplesAt("class") };
  for (const name of Object.keys(RIPPLE_TARGETS)) {
    const plain = ripples.plain[name];
    const scaled = ripples.class[name];
    if (!plain || !scaled) continue;
    // The wave keeps its size relative to its host at both factors: the host
    // is half as large at 0.5, and so is the wave. Compared in visual pixels
    // against half the factor-1 render rather than as a ratio — the browser
    // snaps a zoomed box to device pixels, and a ratio would turn that half
    // pixel either way into a relative miss.
    near(`stage2 ripple: ${name} host width at (0.5), half of (1)`, scaled.host.width, plain.host.width * FACTOR, 1);
    near(`stage2 ripple: ${name} host height at (0.5), half of (1)`, scaled.host.height, plain.host.height * FACTOR, 1);
    // The wave is twice its host's rendered box, so it inherits the box's
    // rounding twice over. A 1px border renders at one device pixel at 0.5
    // rather than half of one (Chromium), which puts a bordered box up to
    // 1.008 px off its ideal half and the wave up to 2.016 px — measured on
    // the connected button group, whose buttons share the group's border
    // (stage 5's floors are about this same snapping).
    near(`stage2 ripple: ${name} wave width at (0.5), half of (1)`, scaled.wave.width, plain.wave.width * FACTOR, 3);
    near(`stage2 ripple: ${name} wave height at (0.5), half of (1)`, scaled.wave.height, plain.wave.height * FACTOR, 3);
    near(`stage2 ripple: ${name} wave centre x − press x (1)`, plain.centre.x - plain.press.x, 0, 2);
    near(`stage2 ripple: ${name} wave centre y − press y (1)`, plain.centre.y - plain.press.y, 0, 2);
    near(`stage2 ripple: ${name} wave centre x − press x (0.5)`, scaled.centre.x - scaled.press.x, 0, 2);
    near(`stage2 ripple: ${name} wave centre y − press y (0.5)`, scaled.centre.y - scaled.press.y, 0, 2);
  }

  await writeFile(`${artifacts}/report.json`, JSON.stringify({ rows, failures, errors }, null, 2));
  for (const failure of failures) console.log(`FAIL ${failure}`);
  console.log(`scale:check ${rows.filter((row) => "ok" in row).length} assertions, ${failures.length} failed`);
  assert.deepEqual(errors, [], "page errors");
  assert.deepEqual(failures, [], "scale failures");
} finally {
  await browser.close();
  server.stop(true);
}
