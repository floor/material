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
 *   1  the rule and `effectiveZoom` (this section)
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

declare global {
  interface Window {
    material: Record<string, unknown>;
    core: { effectiveZoom: (element: Element | null) => number };
    scale: {
      elements: Record<string, HTMLElement>;
      mount: () => void;
      measure: () => Record<string, unknown>;
    };
    ready: boolean;
  }
}

const FACTOR = 0.5;
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
window.scale = { elements: {}, mount: () => {}, measure: () => ({}) };
/** The helper where it exists, 1 where it does not: a missing export fails
    the assertions below instead of throwing out of the measurement. */
const effectiveZoom = (element) =>
  typeof window.core.effectiveZoom === "function" ? window.core.effectiveZoom(element) : 1;
const fixtures = {
  button: () => material.createButton({ text: "Save" }),
  textField: () => material.createTextField({ label: "Name", value: "Ada" }),
  card: () => {
    const card = material.createCard({ variant: "filled" });
    card.element.style.width = "344px";
    card.setHeader(material.createCardHeader({ title: "Trip", subtitle: "Paris" }));
    return card;
  },
};
window.scale.mount = () => {
  for (const host of ["plain", "class", "attr", "default"]) {
    const node = document.querySelector("#host-" + host);
    for (const [name, create] of Object.entries(fixtures)) {
      const instance = create();
      node.append(instance.element);
      window.scale.elements[host + ":" + name] = instance.element;
    }
  }
};
const round = (value) => Math.round(value * 1000) / 1000;
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

type Box = { width: number; height: number };
type Measurement = {
  boxes: Record<string, Box>;
  zoom: Record<string, number | string>;
};

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
  const measured = (await page.evaluate(() => window.scale.measure())) as Measurement;

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

  await writeFile(`${artifacts}/report.json`, JSON.stringify({ rows, failures, errors }, null, 2));
  for (const failure of failures) console.log(`FAIL ${failure}`);
  console.log(`scale:check ${rows.filter((row) => "ok" in row).length} assertions, ${failures.length} failed`);
  assert.deepEqual(errors, [], "page errors");
  assert.deepEqual(failures, [], "scale failures");
} finally {
  await browser.close();
  server.stop(true);
}
