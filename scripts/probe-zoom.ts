#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-explicit-any -- page-side probes pass component handles through the window. */
// scripts/probe-zoom.ts — the FLO-1565 measurement: what a CSS `zoom` on a
// container does to each component. Not a check: it prints a table.
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium, firefox, webkit, type Browser, type Page } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";

const entry = resolve("scripts/zoom-entry.ts");
await Bun.write(entry, [
  'import { createButton } from "../src/components/button/index.ts";',
  'import { createIconButton } from "../src/components/icon-button/index.ts";',
  'import { createFab } from "../src/components/fab/index.ts";',
  'import { createSwitch } from "../src/components/switch/index.ts";',
  'import { createCheckbox } from "../src/components/checkbox/index.ts";',
  'import { createSlider } from "../src/components/slider/index.ts";',
  'import { createTextField } from "../src/components/text-field/index.ts";',
  'import { createSelect } from "../src/components/select/index.ts";',
  'import { createMenu } from "../src/components/menu/index.ts";',
  'import { createTooltip } from "../src/components/tooltip/index.ts";',
  'import { createCarousel } from "../src/components/carousel/index.ts";',
  'import { createDialog } from "../src/components/dialog/index.ts";',
  'const w = window as any;',
  'w.mtrl = { createButton, createIconButton, createFab, createSwitch, createCheckbox, createSlider, createTextField, createSelect, createMenu, createTooltip, createCarousel, createDialog };',
  'w.ready = true;',
].join("\n"));
const bundle = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
assert(bundle.success, String(bundle.logs));
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const css = sass.compileString(directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()), sassOptions()).css;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/components.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;padding:24px;font-family:sans-serif}#zoom{width:520px;transform-origin:0 0}</style></head>
<body><div id="zoom"></div><script type="module">import "/components.js";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

type Row = { probe: string; zoom: number; expected: string; measured: string; delta: number | null };

const mount = async (page: Page, zoom: number, build: (zoom: number) => void) => {
  await page.evaluate((zoom) => {
    // A surface that moved to the body (menus, tooltips, dialogs) outlives
    // its probe: clear the page of them before the next one mounts.
    for (const node of [...document.body.children]) {
      if (node.id !== "zoom" && node.tagName !== "SCRIPT") node.remove();
    }
    const holder = document.querySelector<HTMLElement>("#zoom")!;
    holder.replaceChildren();
    // md3.io zooms the preview's whole document, which keeps top-layer
    // surfaces inside the zoom; the container stays for the mounts only.
    document.documentElement.style.zoom = String(zoom);
    holder.style.zoom = "";
    (window as any).zoom = zoom;
    (window as any).__probeImage = (window as any).__probeImage ?? "data:image/gif;base64,R0lGODlhAQABAIAAAP8AAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
  }, zoom);
  await page.evaluate(build, zoom);
  await page.waitForTimeout(250);
};

const run = async (browser: Browser, engine: string): Promise<Row[]> => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
  const rows: Row[] = [];

  for (const zoom of [1, 0.7, 0.5]) {
    // The factory's `label` is the accessible name; a button's visible text is
    // its content, so every button here carries a span.
    // 1. The ripple the button paints under the press: its centre must sit
    // under the pointer that pressed it.
    await mount(page, zoom, () => {
      const w = window as any;
      const button = w.mtrl.createButton({ label: "Press me", ripple: true });
      button.element.append(Object.assign(document.createElement("span"), { textContent: "Press me" }));
      button.element.id = "probe-button";
      document.querySelector("#zoom")!.append(button.element);
    });
    const press = await page.evaluate(() => {
      const r = document.querySelector<HTMLElement>("#probe-button")!.getBoundingClientRect();
      return { x: r.left + r.width * 0.7, y: r.top + r.height * 0.35, r: { left: r.left, top: r.top, width: r.width, height: r.height } };
    });
    await page.mouse.move(press.x, press.y);
    await page.mouse.down();
    await page.waitForTimeout(80);
    const ripple = await page.evaluate(() => {
      const wave = document.querySelector<HTMLElement>(".mtrl-ripple-wave");
      if (!wave) return null;
      const r = wave.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width };
    });
    await page.mouse.up();
    rows.push({
      probe: `${engine} ripple under the pointer`,
      zoom,
      expected: "0 px from the press",
      measured: ripple ? `${(ripple.cx - press.x).toFixed(1)} / ${(ripple.cy - press.y).toFixed(1)} px` : "no ripple element",
      delta: ripple ? Math.hypot(ripple.cx - press.x, ripple.cy - press.y) : null,
    });

    // 1b. Rects and hit testing under the zoom: the used values scale, and a
    // point taken from a rect must land on the element.
    const scaling = await page.evaluate(() => {
      const button = document.querySelector<HTMLElement>(".mtrl-button")!;
      const r = button.getBoundingClientRect();
      const inside = (x: number, y: number) => {
        const el = document.elementFromPoint(x, y);
        return el === button || button.contains(el);
      };
      const z = Number(document.documentElement.style.zoom) || 1;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const label = button.querySelector("span")!;
      const labelRect = label.getBoundingClientRect();
      return {
        width: r.width,
        height: r.height,
        fontSize: getComputedStyle(button).fontSize,
        hit: inside(cx, cy),
        hitTimesZoom: inside(cx * z, cy * z),
        hitOverZoom: inside(cx / z, cy / z),
        cx,
        cy,
        label: `${labelRect.width.toFixed(1)} × ${labelRect.height.toFixed(1)} px, font ${getComputedStyle(label).fontSize}`,
      };
    });
    rows.push({
      probe: `${engine} button rect under the zoom`,
      zoom,
      expected: zoom === 1 ? "the button's own size" : "the button's size × the zoom",
      measured: `${scaling.width.toFixed(1)} × ${scaling.height.toFixed(1)} px, font ${scaling.fontSize}; the rect centre hits: ${scaling.hit}; its label ${scaling.label}`,
      delta: null,
    });

    // 2. A menu under its opener: the gap it leaves at zoom 1 is the token's.
    await mount(page, zoom, () => {
      const w = window as any;
      const button = w.mtrl.createButton({ label: "Open" });
      button.element.append(Object.assign(document.createElement("span"), { textContent: "Open" }));
      button.element.id = "probe-opener";
      document.querySelector("#zoom")!.append(button.element);
      const menu = w.mtrl.createMenu({ opener: button.element, items: [{ text: "One" }, { text: "Two" }] });
      (window as any).probeMenu = menu;
    });
    const menu = await page.evaluate(async () => {
      const opener = document.querySelector<HTMLElement>("#probe-opener")!.getBoundingClientRect();
      const w = window as any;
      w.probeMenu.open();
      await new Promise((r) => setTimeout(r, 350));
      const surface = (w.probeMenu.element as HTMLElement | undefined)?.getBoundingClientRect();
      if (!surface) return null;
      return {
        openerBottom: opener.bottom, menuTop: surface.top, menuHeight: surface.height, openerHeight: opener.height,
        inZoom: true,
        openerAt: `${opener.left.toFixed(0)},${opener.top.toFixed(0)}`,
        menuAt: `${surface.left.toFixed(0)},${surface.top.toFixed(0)}`,
      };
    });
    rows.push({
      probe: `${engine} menu gap under its opener`,
      zoom,
      expected: "the same gap at every zoom",
      measured: menu ? `gap ${(menu.menuTop - menu.openerBottom).toFixed(1)} px; menu ${menu.menuHeight.toFixed(0)} px tall vs opener ${menu.openerHeight.toFixed(0)}; anchor at ${menu.openerAt}, menu at ${menu.menuAt}; in the zoom: ${menu.inZoom}` : "no menu surface",
      delta: menu ? menu.menuTop - menu.openerBottom : null,
    });

    // 3. The tooltip above its target.
    await mount(page, zoom, () => {
      const w = window as any;
      const button = w.mtrl.createButton({ label: "Hover" });
      button.element.append(Object.assign(document.createElement("span"), { textContent: "Hover" }));
      button.element.id = "probe-tooltip-target";
      document.querySelector("#zoom")!.append(button.element);
      const tooltip = w.mtrl.createTooltip({ text: "Tip text" });
      tooltip.setTarget(button.element);
      (window as any).probeTooltip = tooltip;
    });
    const tip = await page.evaluate(async () => {
      const w = window as any;
      const target = document.querySelector<HTMLElement>("#probe-tooltip-target")!.getBoundingClientRect();
      w.probeTooltip.show(true);
      await new Promise((r) => setTimeout(r, 300));
      const surface = (w.probeTooltip.element as HTMLElement | undefined)?.getBoundingClientRect();
      if (!surface) return null;
      return { targetTop: target.top, tipBottom: surface.bottom, tipHeight: surface.height, targetHeight: target.height, inZoom: true };
    });
    rows.push({
      probe: `${engine} tooltip above its target`,
      zoom,
      expected: "the same gap at every zoom",
      measured: tip ? `gap ${(tip.targetTop - tip.tipBottom).toFixed(1)} px; tooltip ${tip.tipHeight.toFixed(0)} px vs target ${tip.targetHeight.toFixed(0)}; in the zoom: ${tip.inZoom}` : "no tooltip",
      delta: tip ? tip.targetTop - tip.tipBottom : null,
    });

    // 3b. A select's listbox over its field.
    await mount(page, zoom, () => {
      const w = window as any;
      const select = w.mtrl.createSelect({ label: "Pick", options: [{ id: "one", text: "One" }, { id: "two", text: "Two" }, { id: "three", text: "Three" }] });
      select.element.id = "probe-select";
      (window as any).probeSelect = select;
      document.querySelector("#zoom")!.append(select.element);
    });
    const listbox = await page.evaluate(async () => {
      const w = window as any;
      const field = document.querySelector<HTMLElement>("#probe-select")!.getBoundingClientRect();
      w.probeSelect.open();
      await new Promise((r) => setTimeout(r, 350));
      const surface = document.querySelector<HTMLElement>(".mtrl-select__menu, .mtrl-menu")?.getBoundingClientRect();
      if (!surface) return null;
      return { fieldWidth: field.width, menuWidth: surface.width, fieldAt: `${field.left.toFixed(0)},${field.top.toFixed(0)}`, menuAt: `${surface.left.toFixed(0)},${surface.top.toFixed(0)}` };
    });
    rows.push({
      probe: `${engine} select listbox over its field`,
      zoom,
      expected: "the listbox as wide as the field",
      measured: listbox ? `listbox ${listbox.menuWidth.toFixed(0)} px wide vs field ${listbox.fieldWidth.toFixed(0)}; field at ${listbox.fieldAt}, listbox at ${listbox.menuAt}` : "no listbox",
      delta: listbox ? Math.abs(listbox.menuWidth - listbox.fieldWidth) : null,
    });

    // 4. The slider's value for a click at 25, 50 and 75 per cent of the track.
    await mount(page, zoom, () => {
      const w = window as any;
      const slider = w.mtrl.createSlider({ min: 0, max: 100, value: 0 });
      slider.element.id = "probe-slider";
      document.querySelector("#zoom")!.append(slider.element);
    });
    const values: string[] = [];
    const deviations: number[] = [];
    const track = await page.evaluate(() => {
      const r = document.querySelector<HTMLElement>("#probe-slider .mtrl-slider__track")!.getBoundingClientRect();
      return { left: r.left, width: r.width, y: r.top + r.height / 2 };
    });
    for (const fraction of [0.25, 0.5, 0.75]) {
      await page.mouse.click(track.left + track.width * fraction, track.y);
      await page.waitForTimeout(200);
      const value = await page.evaluate(() => Number(document.querySelector<HTMLElement>("#probe-slider [role='slider']")!.getAttribute("aria-valuenow")));
      values.push(`${Math.round(fraction * 100)}% → ${value}`);
      deviations.push(Math.abs(value - fraction * 100));
    }
    rows.push({
      probe: `${engine} slider value at 25/50/75 %`,
      zoom,
      expected: "25, 50, 75",
      measured: values.join(", "),
      delta: Math.max(...deviations),
    });

    // 5. A carousel drag: how far the strip moves for a 120 px pointer drag.
    await mount(page, zoom, () => {
      const w = window as any;
      const carousel = w.mtrl.createCarousel({
        variant: "multi-browse", snap: false, gap: 8, padding: 16,
        slides: Array.from({ length: 8 }, (_, i) => ({ title: `Slide ${i}`, image: (window as any).__probeImage, width: 200, height: 160 })),
      });
      carousel.element.id = "probe-carousel";
      carousel.element.style.width = "480px";
      carousel.element.style.height = "200px";
      document.querySelector("#zoom")!.append(carousel.element);
    });
    const dragResult = await page.evaluate(async () => {
      const scroller = document.querySelector<HTMLElement>("#probe-carousel .mtrl-carousel__scroller")!;
      scroller.scrollLeft = 200;
      await new Promise((r) => requestAnimationFrame(r));
      const box = scroller.getBoundingClientRect();
      return { x: box.left + box.width * 0.7, y: box.top + box.height / 2, before: scroller.scrollLeft };
    });
    await page.mouse.move(dragResult.x, dragResult.y);
    await page.mouse.down();
    await page.waitForTimeout(60);
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(dragResult.x - (120 * i) / 8, dragResult.y);
      await page.waitForTimeout(18);
    }
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(600);
    const afterDrag = await page.evaluate(() => document.querySelector<HTMLElement>("#probe-carousel .mtrl-carousel__scroller")!.scrollLeft);
    rows.push({
      probe: `${engine} carousel: 120 px pointer drag`,
      zoom,
      expected: "the strip moves 120 px",
      measured: `${(afterDrag - dragResult.before).toFixed(1)} px moved`,
      delta: Math.abs(afterDrag - dragResult.before - 120),
    });

    // 6. A dialog's surface: does the top layer come out at the container's zoom?
    await mount(page, zoom, () => {
      const w = window as any;
      const dialog = w.mtrl.createDialog({ title: "Dialog" });
      dialog.element.id = "probe-dialog";
      dialog.element.style.height = "300px";
      (window as any).probeDialog = dialog;
      document.querySelector("#zoom")!.append(dialog.element);
    });
    const dialog = await page.evaluate(async () => {
      const w = window as any;
      w.probeDialog.open();
      await new Promise((r) => setTimeout(r, 300));
      const el = w.probeDialog.element as HTMLElement;
      const surface = el.getBoundingClientRect();
      return { height: surface.height, width: surface.width, top: surface.top, inZoom: true, parent: el.parentElement?.tagName ?? "?" };
    });
    rows.push({
      probe: `${engine} dialog surface height`,
      zoom,
      expected: `300 px × the zoom (${Math.round(300 * zoom)})`,
      measured: dialog ? `${dialog.height.toFixed(0)} px; in the zoom: ${dialog.inZoom}; parent ${dialog.parent}` : "no dialog surface",
      delta: dialog ? Math.abs(dialog.height - 300 * zoom) : null,
    });

    assert(errors.length === 0, `${engine}: page errors ${errors.join("; ")}`);
  }
  await page.close();
  return rows;
};

const all: Row[] = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try { all.push(...await run(chromiumBrowser, "chromium")); } finally { await chromiumBrowser.close(); }
for (const [name, launcher] of [["webkit", webkit], ["firefox", firefox]] as const) {
  let browser: Browser | null = null;
  try { browser = await launcher.launch({ headless: true }); } catch { console.log(`${name} is not installed here, skipped`); continue; }
  try { all.push(...await run(browser, name)); } finally { await browser.close(); }
}
server.stop(true);

console.log("\n| probe | zoom | expected | measured | delta |");
console.log("| --- | ---: | --- | --- | ---: |");
for (const row of all) {
  console.log(`| ${row.probe} | ${row.zoom} | ${row.expected} | ${row.measured} | ${row.delta === null ? "—" : row.delta.toFixed(1)} |`);
}
console.log(`\n${all.length} rows.`);
