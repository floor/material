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
 *   2  ripples
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
type Stage3Chips = { scrollLeft: number; centreError: number };
type Stage3Select = { menuW: number; rootW: number; menuLeft: number; rootLeft: number; menuTop: number; rootBottom: number };
type Stage3Search = {
  top: number;
  left: number;
  widthRatio: number;
  zoom: number;
  bar: Record<string, number>;
  surfaceBox: Record<string, number>;
  written: Record<string, string>;
};
type Stage3Dial = { radius: string; selected: string | null };
type Stage3ProgressSite = {
  bitmapW: number;
  bitmapH: number;
  visualW: number;
  visualH: number;
  zoom: number;
  ink: number;
  rootRectW: number;
  rootOffsetW: number;
  canvasStyleW: string;
};
type Stage3Progress = { linear: Stage3ProgressSite; circular: Stage3ProgressSite };
type Stage3FabMenu = { zoom: number; rootTop: number; listTop: number; listHeight: number; maxHeight: string };

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
      settle: () => Promise<void>;
      stable: (read: () => number) => Promise<number>;
      chips: (index: number) => Promise<Stage3Chips>;
      select: () => Promise<Stage3Select>;
      search: () => Promise<Stage3Search>;
      timepicker: () => Stage3Dial;
      progress: () => Promise<Stage3Progress>;
      fabMenu: () => Promise<Stage3FabMenu>;
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
  chips: () => {
    // A scrollable set: its container is the scroller, and scrollToChip
    // centres one chip in it. The root has a definite width so there is
    // something to scroll: nine chips are wider than 300px.
    const set = material.createChips({
      label: "Row",
      scrollable: true,
      chips: Array.from({ length: 9 }, (_, i) => ({ label: "Chip " + i, value: "c" + i })),
    });
    set.element.style.width = "300px";
    return set;
  },
  select: () => material.createSelect({ label: "Pet", options: [{ id: "cat", text: "Cat" }, { id: "dog", text: "Dog" }] }),
  search: () => {
    // The bar 200px down the page: the surface's placement is the bar's
    // offset from the scaled container's corner, so a wrong frame shows up as
    // tens of pixels, not as the rounding of an 8px margin.
    const set = material.createSearch({ value: "ap", suggestions: ["Apple", "Banana"], collapseOnBlur: false });
    set.element.style.marginTop = "200px";
    return set;
  },
  timepicker: () => material.createTimePicker({ title: "Alarm", value: "09:30", format: "24h", open: true }),
  progress: () => {
    // A definite width for the linear bar, which measures its box: the
    // container's is the one the bitmap is mapped onto.
    const box = document.createElement("div");
    box.style.width = "420px";
    const linear = material.createProgress({ value: 80 });
    const circular = material.createProgress({ variant: "circular", value: 50 });
    box.append(linear.element, circular.element);
    return { element: box, linear: linear, circular: circular };
  },
  fabMenu: () => {
    // The clamp lives in the list presentation, and only bites when the room
    // above the FAB is smaller than the list: 16 items, pushed 400px down the
    // page.
    const menu = material.createFabMenu({
      icon: ICON,
      ariaLabel: "Create",
      presentation: "list",
      items: Array.from({ length: 16 }, (_, i) => ({ id: "i" + i, text: "Item " + i })),
    });
    menu.element.style.marginTop = "400px";
    return menu;
  },
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
/** Two animation frames and a moment: an opening surface has arrived. */
window.scale.settle = async () => {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await new Promise((resolve) => setTimeout(resolve, 150));
};
/** A number that stops moving: smooth scrolling, a stagger, a transition. */
window.scale.stable = async (read) => {
  let last = null;
  for (let i = 0; i < 40; i++) {
    const value = read();
    if (value === last) return value;
    last = value;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  return last;
};
/** Stage 3: the chips' scroller after scrollToChip, and how far off centre
    the chip it was asked to centre is. */
window.scale.chips = async (index) => {
  const set = window.scale.mounted;
  const container = set.chipContainer || set.element;
  set.scrollToChip(index);
  await window.scale.stable(() => container.scrollLeft);
  const chip = set.chipInstances[index].element;
  const c = container.getBoundingClientRect();
  const k = chip.getBoundingClientRect();
  return {
    scrollLeft: container.scrollLeft,
    centreError: (k.left + k.width / 2) - (c.left + c.width / 2),
  };
};
/** Stage 3: the select's menu against the select's own box. */
window.scale.select = async () => {
  const set = window.scale.mounted;
  set.open();
  await window.scale.settle();
  const menu = document.querySelector(".mtrl-select__menu");
  const r = set.element.getBoundingClientRect();
  const m = menu.getBoundingClientRect();
  return { menuW: m.width, menuLeft: m.left, menuTop: m.top, rootW: r.width, rootLeft: r.left, rootBottom: r.bottom };
};
/** Stage 3: the search surface against the bar it covers. */
window.scale.search = async () => {
  const set = window.scale.mounted;
  set.expand();
  await window.scale.settle();
  await window.scale.settle();
  const surface = set.element.querySelector(".mtrl-search__surface");
  const style = getComputedStyle(surface);
  const r = set.element.getBoundingClientRect();
  const s = surface.getBoundingClientRect();
  return {
    top: s.top - r.top,
    left: s.left - r.left,
    widthRatio: s.width / r.width,
    zoom: effectiveZoom(surface),
    bar: { top: r.top, left: r.left, width: r.width },
    surfaceBox: { top: s.top, left: s.left, width: s.width },
    written: {
      top: style.getPropertyValue("--mtrl-search-top"),
      left: style.getPropertyValue("--mtrl-search-left"),
      width: style.getPropertyValue("--mtrl-search-width"),
    },
  };
};
/** Stage 3: the dial's ring and the option it has selected. */
window.scale.timepicker = () => {
  const set = window.scale.mounted;
  const face = set.dialogElement.querySelector(".mtrl-time-picker__dial-face");
  let radius = "";
  for (const name of Array.from(face.style)) {
    if (name.indexOf("-time-picker-radius") !== -1) radius = face.style.getPropertyValue(name);
  }
  const selected = face.querySelector('[aria-selected="true"]');
  return { radius: radius.trim(), selected: selected ? (selected.textContent || "").trim() : null };
};
/** Stage 3: what the two progress canvases actually draw, and the scale their
    drawings are mapped onto the bitmaps with. */
window.scale.progress = async () => {
  // The canvas re-measures itself from a resize observation, which the library
  // debounces by 100 ms, and paints on the frame after that: without the wait
  // the bitmap read is still the one from before the fixture had a box.
  await window.scale.settle();
  const read = (root) => {
    const canvas = root.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const box = canvas.getBoundingClientRect();
    // The ink along the centre row, weighted by coverage and read as a length
    // of the box: the bar and its stop dot, or the ring's two sides. Weighted,
    // because alpha is sub-pixel accurate and survives an alias splitting a
    // run in two, where a run count does not.
    let ink = -1;
    try {
      const row = ctx.getImageData(0, Math.floor(canvas.height / 2), canvas.width, 1).data;
      let total = 0;
      for (let x = 0; x < canvas.width; x++) total += row[x * 4 + 3] / 255;
      ink = total * (box.width / canvas.width);
    } catch (error) {
      ink = -1;
    }
    return {
      bitmapW: canvas.width,
      bitmapH: canvas.height,
      // The box the canvas renders in, in the frame's visual pixels: what the
      // bitmap's pixels are spread over.
      visualW: box.width,
      visualH: box.height,
      zoom: effectiveZoom(root),
      ink: ink,
      // Raw inputs, for when a number here is not what it looks like it is.
      rootRectW: root.getBoundingClientRect().width,
      rootOffsetW: root.offsetWidth,
      canvasStyleW: canvas.style.width,
    };
  };
  const set = window.scale.mounted;
  return { linear: read(set.linear.element), circular: read(set.circular.element) };
};
/** Stage 3: the FAB menu's list top against the window top, its clamp active. */
window.scale.fabMenu = async () => {
  const set = window.scale.mounted;
  const root = set.element;
  const zoom = effectiveZoom(root);
  const rootTop = root.getBoundingClientRect().top;
  set.open();
  await window.scale.settle();
  const list = root.querySelector(".mtrl-fab-menu__list");
  await window.scale.stable(() => Math.round(list.getBoundingClientRect().top));
  const box = list.getBoundingClientRect();
  return {
    zoom: zoom,
    rootTop: rootTop,
    listTop: box.top,
    listHeight: box.height,
    maxHeight: list.style.maxHeight,
  };
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

  // ---- Stage 3: placement and sizing sites
  // Every site that measures a box and writes a length back. The rect read is
  // in visual pixels; the length written is layout pixels inside the element
  // and renders scaled a second time — `zoom` squared. Each site is measured
  // at both factors and compared with its own factor-1 render, and the
  // factor-1 render is asserted against what the site is for, so a site that
  // is simply wrong fails twice.
  const mountAt = async (host: string, name: string): Promise<void> => {
    await page.evaluate(({ host, name }) => window.scale.mountOne(host, name), { host, name });
    await page.waitForTimeout(50);
  };
  /** A measurement kept in the report without counting as an assertion. */
  const note = (label: string, actual: unknown): void => {
    rows.push({ label, actual, diagnostic: true });
  };

  // The chip set's scroller: `scrollToChip` mixes layout offsets with half of
  // two rects. The layout is the same at both factors — only the rendering
  // scales — so the scroller lands on the same offset, and the chip's
  // centring error is half at 0.5 what it is at 1 (the code does not centre
  // the chip exactly, because the container is wider than its padding box:
  // measured 8.09 at factor 1, unchanged by this build).
  await mountAt("plain", "chips");
  const chipsPlain = await page.evaluate(() => window.scale.chips(4));
  await mountAt("class", "chips");
  const chipsScaled = await page.evaluate(() => window.scale.chips(4));
  note("diagnostic: chips at (1)", chipsPlain);
  note("diagnostic: chips at (0.5)", chipsScaled);
  near("stage3 chips: scrollLeft at (0.5), as at (1)", chipsScaled.scrollLeft, chipsPlain.scrollLeft, 1);
  near("stage3 chips: centring error at (1)", chipsPlain.centreError, 0, 12);
  near("stage3 chips: centring error at (0.5), half of (1)", chipsScaled.centreError, chipsPlain.centreError * FACTOR, 3);

  // The select's menu: `width: "100%"` of the opener, at the opener's start
  // edge, just under its bottom.
  await mountAt("plain", "select");
  const selectPlain = await page.evaluate(() => window.scale.select());
  await mountAt("class", "select");
  const selectScaled = await page.evaluate(() => window.scale.select());
  near("stage3 select: menu width ÷ root width at (1)", selectPlain.menuW / selectPlain.rootW, 1, 0.02);
  near("stage3 select: menu width ÷ root width at (0.5)", selectScaled.menuW / selectScaled.rootW, 1, 0.02);
  near("stage3 select: menu left − root left at (1)", selectPlain.menuLeft - selectPlain.rootLeft, 0, 2);
  near("stage3 select: menu left − root left at (0.5)", selectScaled.menuLeft - selectScaled.rootLeft, 0, 2);
  near("stage3 select: menu top − root bottom at (1)", selectPlain.menuTop - selectPlain.rootBottom, 0, 2);
  near("stage3 select: menu top − root bottom at (0.5)", selectScaled.menuTop - selectScaled.rootBottom, 0, 2);

  // The search surface: docked, it covers the bar it belongs to.
  await mountAt("plain", "search");
  const searchPlain = await page.evaluate(() => window.scale.search());
  await mountAt("class", "search");
  const searchScaled = await page.evaluate(() => window.scale.search());
  note("diagnostic: search at (1)", searchPlain);
  note("diagnostic: search at (0.5)", searchScaled);
  near("stage3 search: surface top − bar top at (1)", searchPlain.top, 0, 2);
  near("stage3 search: surface top − bar top at (0.5)", searchScaled.top, 0, 2);
  near("stage3 search: surface left − bar left at (1)", searchPlain.left, 0, 2);
  near("stage3 search: surface left − bar left at (0.5)", searchScaled.left, 0, 2);
  near("stage3 search: surface width ÷ bar width at (1)", searchPlain.widthRatio, 1, 0.02);
  near("stage3 search: surface width ÷ bar width at (0.5)", searchScaled.widthRatio, 1, 0.02);

  // The dial: a press at 95% of the half-width sits outside the 24-hour inner
  // ring (OUTER 101, INNER 69 — the midpoint is 85) whatever the dial's box
  // is, so it belongs to hour 3 on the outer ring. At 0.5 the same press is
  // half as far out in the dial's own pixels, and a press that lands inside
  // the inner ring belongs to hour 15 instead.
  const dialAt = async (host: string): Promise<Stage3Dial> => {
    await mountAt(host, "timepicker");
    const box = await page.locator("#fixture .mtrl-time-picker__dial-face").boundingBox();
    if (!box) {
      failures.push(`stage3 timepicker: ${host}: no dial face to press`);
      rows.push({ label: `stage3 timepicker: ${host} dial face`, actual: null, expected: "an element", ok: false });
      return { radius: "", selected: null };
    }
    const x = box.x + box.width / 2 + 0.95 * (box.width / 2);
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(60);
    const read = await page.evaluate(() => window.scale.timepicker());
    await page.mouse.up();
    await page.mouse.move(1, 1);
    return read;
  };
  const dialPlain = await dialAt("plain");
  const dialScaled = await dialAt("class");
  near("stage3 timepicker: written radius at (1)", parseFloat(dialPlain.radius), 101, 0.5);
  near("stage3 timepicker: written radius at (0.5)", parseFloat(dialScaled.radius), 101, 0.5);
  const sameHour = dialPlain.selected === "3" && dialScaled.selected === "3";
  rows.push({
    label: "stage3 timepicker: hour at the same press at (1) and (0.5)",
    actual: `${dialPlain.selected} / ${dialScaled.selected}`,
    expected: '"3" / "3"',
    ok: sameHour,
  });
  if (!sameHour)
    failures.push(
      `stage3 timepicker: the same press selects hour ${dialPlain.selected} at (1) and ${dialScaled.selected} at (0.5), expected 3 at both`,
    );

  // The canvases (spike row 9). The quantity is the spike's: bitmap pixels per
  // *visual* pixel of the box the canvas renders in, 2.52 (linear) and 1
  // (circular) at both factors — a bitmap sized from the tokens alone does not
  // follow the factor. Ratios across the factors, so a device pixel of
  // snapping cancels. The two readings under it are the shape: the spike
  // judged the proportions right because the drawing is mapped onto the
  // measured box, but that box is a rect read — visual pixels — while the
  // lengths the drawing writes into it are tokens, so the space it is written
  // in and the ink it lays down are measured too.
  await mountAt("plain", "progress");
  const progressPlain = await page.evaluate(() => window.scale.progress());
  await mountAt("class", "progress");
  const progressScaled = await page.evaluate(() => window.scale.progress());
  note("diagnostic: progress at (1)", progressPlain);
  note("diagnostic: progress at (0.5)", progressScaled);
  type Which = "linear" | "circular";
  const density = (m: Stage3Progress, which: Which, axis: "W" | "H"): number =>
    axis === "W" ? m[which].bitmapW / m[which].visualW : m[which].bitmapH / m[which].visualH;
  for (const which of ["linear", "circular"] as const) {
    for (const axis of ["W", "H"] as const)
      near(
        `stage3 progress: ${which} bitmap ÷ rendered ${axis === "W" ? "width" : "height"} at (0.5), as at (1)`,
        density(progressScaled, which, axis) / density(progressPlain, which, axis),
        1,
        0.02,
      );
    // And the picture on it: the ink across the centre row, as a length of
    // the box it renders in, halves with the factor exactly as the box does,
    // as the spike's row found it did (the drawing is mapped onto the
    // measured box and the shapes scale to it) — the reading that says the
    // fix moved the resolution and not the picture.
    near(
      `stage3 progress: ${which} inked width at (0.5), half of (1)`,
      progressScaled[which].ink,
      progressPlain[which].ink * FACTOR,
      Math.max(1.5, progressPlain[which].ink * 0.02),
    );
  }

  // The FAB menu's clamp: with it active, the list's top sits one window
  // margin (16) below the window top — a length the component writes in its
  // own pixels, so it renders at the factor: 16 at (1), 8 at (0.5).
  await mountAt("plain", "fabMenu");
  const fabPlain = await page.evaluate(() => window.scale.fabMenu());
  await mountAt("class", "fabMenu");
  const fabScaled = await page.evaluate(() => window.scale.fabMenu());
  note("diagnostic: fab menu at (1)", fabPlain);
  note("diagnostic: fab menu at (0.5)", fabScaled);
  near("stage3 fab menu: list top − window top at (1)", fabPlain.listTop, 16 * fabPlain.zoom, 2);
  near("stage3 fab menu: list top − window top at (0.5)", fabScaled.listTop, 16 * fabScaled.zoom, 2);

  await writeFile(`${artifacts}/report.json`, JSON.stringify({ rows, failures, errors }, null, 2));
  for (const failure of failures) console.log(`FAIL ${failure}`);
  console.log(`scale:check ${rows.filter((row) => "ok" in row).length} assertions, ${failures.length} failed`);
  assert.deepEqual(errors, [], "page errors");
  assert.deepEqual(failures, [], "scale failures");
} finally {
  await browser.close();
  server.stop(true);
}
