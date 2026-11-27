#!/usr/bin/env bun
/**
 * A card's focus, hover and dragged states follow the Material 3 tokens.
 *
 * Measured 2026-11-26 on main 44d7a29f, Chromium and WebKit, light and dark:
 * a focused filled or outlined card rose to elevation Level 1, where
 * FilledCardTokens.kt and OutlinedCardTokens.kt give FocusContainerElevation
 * Level 0 (ElevatedCardTokens.kt keeps Level 1); a hovered elevated card
 * painted no state layer, where md.sys.state.hover is 0.08; and a dragged card
 * of every variant painted no layer, where md.sys.state.dragged is 0.16.
 *
 * The page mounts one card per variant and reads, per state:
 *
 * 1. focus (a real Tab stop, so `:focus-visible` matches): filled and outlined
 *    keep Level 0 — no box-shadow — and elevated keeps Level 1; the 3px
 *    Secondary ring at +2 stays in every variant;
 * 2. hover on the elevated card: the `::before` layer is on-surface at 0.08;
 * 3. dragged on all three: the `::before` layer is on-surface at 0.16, with the
 *    variant's DraggedContainerElevation (4 elevated, 3 filled and outlined).
 *
 * On main the focus elevation, the hover layer and the dragged layer are wrong,
 * so this fails there. Run on main and on the branch:
 *
 *   bun run scripts/check-card-state-layers.ts
 *
 * A launch that fails is a failure: CI installs the engines, and the run that
 * cannot start one must go red. `--skip-missing-webkit` is the explicit local
 * skip.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium, webkit, type Browser, type Page } from "playwright";

import { settle } from "./browser-settle";
import { directionArmsPrelude, sassOptions } from "./build-styles";

const bundle = await Bun.build({
  entrypoints: [resolve("scripts/card-state-layers-entry.ts")],
  target: "browser",
  format: "esm",
  minify: true,
});
assert(bundle.success, String(bundle.logs));
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const css = sass.compileString(
  directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()),
  sassOptions(),
).css;

const variants = ["elevated", "filled", "outlined"] as const;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/card.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;font-family:sans-serif;padding:24px;display:grid;gap:24px;justify-items:start}
.card{width:220px}</style></head>
<body><div id="mount"></div>
<script type="module">
import "/card.js";
window.mount = (variant, draggable) => {
  document.querySelector("#mount").replaceChildren();
  const card = window.createCard({ variant, clickable: true, draggable });
  const content = document.createElement("div");
  content.className = "mtrl-card__content";
  content.textContent = "Card content";
  card.addContent(content);
  card.element.style.width = "220px";
  document.querySelector("#mount").append(card.element);
  if (draggable) card.element.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: new DataTransfer() }));
  return card.element.className;
};
window.ready = true;
</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

type Reading = {
  shadow: string;
  layer: { opacity: number; content: string; color: string };
  outline: { style: string; width: string; color: string; offset: string };
};

const OPACITY = (value: string): number => Number.parseFloat(value);

const read = async (page: Page): Promise<Reading> =>
  page.evaluate(() => {
    const el = document.querySelector(".mtrl-card") as HTMLElement;
    const style = getComputedStyle(el);
    const layer = getComputedStyle(el, "::before");
    return {
      shadow: style.boxShadow,
      layer: { opacity: Number.parseFloat(layer.opacity), content: layer.content, color: layer.backgroundColor },
      outline: { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor, offset: style.outlineOffset },
    };
  });

/** The settled reading: the shared helper, with this check's reading. */
// A reading is always returned when one is asked for: the helper throws instead.
const settled = async (page: Page): Promise<Reading> =>
  (await settle(page, { target: ".mtrl-card", read: () => read(page) })) as Reading;

const mount = async (page: Page, variant: string, draggable = false): Promise<void> => {
  await page.mouse.move(0, 0);
  await page.evaluate(({ variant, draggable }) => (window as unknown as { mount: (v: string, d: boolean) => string }).mount(variant, draggable), { variant, draggable });
  await page.waitForSelector(".mtrl-card");
  await settled(page);
};

const focusByKey = async (page: Page): Promise<void> => {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => document.querySelector(".mtrl-card")?.contains(document.activeElement) ?? false);
    if (inside) break;
  }
  const focused = await page.evaluate(() => document.querySelector(".mtrl-card")?.matches(":focus-visible") ?? false);
  assert.ok(focused, "the card takes keyboard focus and matches :focus-visible");
};

const run = async (browser: Browser, engine: string): Promise<string[]> => {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 800, height: 650 });
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  const rows: string[] = [];

  const restOf = new Map<string, Reading>();

  // 1. Focus, in every variant, before anything hovers: filled and outlined
  // keep Level 0, elevated keeps Level 1, and the ring stays in all three.
  for (const variant of variants) {
    await mount(page, variant);
    const rest = await settled(page);
    restOf.set(variant, rest);
    await focusByKey(page);
    const focus = await settled(page);
    if (variant === "elevated") {
      assert.notEqual(focus.shadow, "none", `${engine} ${variant}: a focused elevated card keeps its Level 1 shadow (${focus.shadow})`);
      assert.equal(focus.shadow, rest.shadow, `${engine} ${variant}: focus does not change the elevated elevation`);
    } else {
      assert.equal(focus.shadow, "none", `${engine} ${variant}: a focused ${variant} card stays at Level 0 (shadow ${focus.shadow})`);
    }
    assert.deepEqual(
      { width: focus.outline.width, offset: focus.outline.offset },
      { width: "3px", offset: "2px" },
      `${engine} ${variant}: the focus ring stays 3px at +2 (${JSON.stringify(focus.outline)})`,
    );

    // A pointer click focuses the card but is not :focus-visible, so it paints
    // no ring; the factory's --focused class alone must not draw one.
    await mount(page, variant);
    await page.click(".mtrl-card");
    const clicked = await settled(page);
    const clickedVisible = await page.evaluate(() => document.querySelector(".mtrl-card")?.matches(":focus-visible") ?? false);
    assert.equal(clickedVisible, false, `${engine} ${variant}: a click leaves :focus-visible false`);
    assert.equal(clicked.outline.style, "none", `${engine} ${variant}: a click paints no focus ring (${clicked.outline.style} ${clicked.outline.width})`);
    rows.push(`${engine} ${variant}: focus shadow ${focus.shadow === "none" ? "Level 0" : "Level 1"}, ring ${focus.outline.width}/${focus.outline.offset}, click ring ${clicked.outline.style}`);
  }

  // 2. Hover: the elevated card paints the 0.08 layer.
  await mount(page, "elevated");
  await page.hover(".mtrl-card");
  const hover = await settled(page);
  assert.equal(hover.layer.content, '""', `${engine} elevated: the hovered card has a state layer (${hover.layer.content})`);
  assert.equal(hover.layer.opacity, 0.08, `${engine} elevated: the hover layer is 0.08 (${hover.layer.opacity})`);
  rows.push(`${engine} elevated hover: layer ${hover.layer.opacity}`);

  // 3. Dragged: every variant paints the 0.16 layer, with its pointer still on
  // the card, as a real drag has it, so the dragged state wins over hover.
  const draggedOf = new Map<string, Reading>();
  for (const variant of variants) {
    await mount(page, variant, true);
    await page.hover(".mtrl-card");
    const dragged = await settled(page);
    draggedOf.set(variant, dragged);
    assert.equal(dragged.layer.content, '""', `${engine} ${variant}: the dragged card has a state layer (${dragged.layer.content})`);
    assert.equal(dragged.layer.opacity, OPACITY("0.16"), `${engine} ${variant}: the dragged layer is 0.16 (${dragged.layer.opacity})`);
    assert.notEqual(dragged.shadow, restOf.get(variant)!.shadow, `${engine} ${variant}: the dragged elevation differs from rest`);
    rows.push(`${engine} ${variant} dragged: layer ${dragged.layer.opacity}`);
  }

  // 4. Pressed: a pointer down on the card returns it to its pressed elevation
  // (Level 1 elevated, Level 0 filled and outlined) and the 0.10 layer, not
  // the hover it sat in.
  const pressedOf = new Map<string, Reading>();
  for (const variant of variants) {
    await mount(page, variant);
    await page.hover(".mtrl-card");
    await settled(page);
    await page.mouse.down();
    const pressed = await settled(page);
    pressedOf.set(variant, pressed);
    const expected = variant === "elevated" ? restOf.get(variant)!.shadow : "none";
    assert.equal(pressed.shadow, expected, `${engine} ${variant}: pressed returns to its pressed elevation (${pressed.shadow})`);
    assert.equal(pressed.layer.opacity, 0.1, `${engine} ${variant}: the pressed layer is 0.10 (${pressed.layer.opacity})`);
    await page.mouse.up();
    rows.push(`${engine} ${variant} pressed: layer ${pressed.layer.opacity}`);
  }

  // 5. Dragging while pressed: the drag replaces the press too, keeping the
  // dragged elevation and the 0.16 layer.
  for (const variant of variants) {
    await mount(page, variant, true);
    await page.hover(".mtrl-card");
    await page.mouse.down();
    const dragPressed = await settled(page);
    assert.equal(dragPressed.shadow, draggedOf.get(variant)!.shadow, `${engine} ${variant}: a drag under the pointer keeps the dragged elevation (${dragPressed.shadow})`);
    assert.equal(dragPressed.layer.opacity, OPACITY("0.16"), `${engine} ${variant}: the pressed drag layer stays 0.16 (${dragPressed.layer.opacity})`);
    await page.mouse.up();
    rows.push(`${engine} ${variant} drag+pressed: layer ${dragPressed.layer.opacity}`);
  }

  await page.close();
  return rows;
};

const results: string[] = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try { results.push(...await run(chromiumBrowser, "chromium")); } finally { await chromiumBrowser.close(); }

const skipMissingWebkit = process.argv.includes("--skip-missing-webkit");
let webkitBrowser: Browser | null = null;
try {
  webkitBrowser = await webkit.launch({ headless: true });
} catch (error) {
  if (!skipMissingWebkit) throw error;
  console.log("card state layers: WebKit not installed here, skipped by --skip-missing-webkit");
}
if (webkitBrowser) {
  try { results.push(...await run(webkitBrowser, "webkit")); } finally { await webkitBrowser.close(); }
}
server.stop(true);
for (const row of results) console.log(row);
console.log("Card state layers check passed.");
