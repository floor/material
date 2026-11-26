#!/usr/bin/env bun
// scripts/check-menu-container-space.ts
/**
 * A menu in a clipping container takes its side from the space it can be seen
 * in, and focusing it never scrolls the container onto its opener.
 *
 * The side used to be chosen from the viewport alone. With an explicit
 * container the menu is placed in the container's coordinates, so a side the
 * viewport has room for can be a side the container cuts: at 800×600 with a
 * 160 px menu, an 8 px offset and a scroller whose scrollport ends inside the
 * window, the menu opened below with 125 px clipped, and focusing it scrolled
 * the scroller until the menu sat over its opener (gap −117 px); another
 * geometry flipped above with 48 px clipped at the scroller's top.
 *
 * The check mounts the menu in a clipping scroller at two scroll offsets and
 * two opener positions, with autoFlip on and off, and asserts, on Chromium and
 * WebKit:
 *
 * 1. the menu's box lies inside the intersection of the window and the
 *    scroller's scrollport — no pixel of it is clipped by either;
 * 2. the menu keeps its side of the opener: a menu below starts at or after
 *    the opener's bottom, one above ends at or before its top;
 * 3. focusing an item does not scroll the scroller: its scrollTop is the one
 *    the case set, and the two rules above still hold after the focus.
 *
 * Body menus are the control: they are still placed from the window and are
 * not clipped by the scroller at all.
 *
 *   bun run scripts/check-menu-container-space.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium, webkit, type Browser, type Page } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";

const entry = resolve("scripts/menu-zoom-entry.ts");
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
<style>body{margin:0;padding:0;font-family:sans-serif} #scroller{position:absolute;left:24px;width:400px;overflow-y:auto;border:0;padding:0} #content{height:1200px;position:relative} #opener{position:absolute;left:24px;width:120px;height:32px}</style></head>
<body><script type="module">import "/components.js";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

type CaseConfig = {
  /** The scroller's viewport position and height. */
  scrollerTop: number;
  scrollerHeight: number;
  /** The opener's position inside the scroller's content. */
  openerTop: number;
  scrollTop: number;
  /** The preferred side: below or above the opener. */
  position: "bottom-start" | "top-start";
  /** Mount to the body (no container) instead of into the scroller. */
  body?: boolean;
  /** The scroller's border and zoom, for the scrollport's own box. */
  border?: number;
  zoom?: number;
};

type Measured = {
  scrollTopBefore: number;
  scrollTopAfterFocus: number;
  menu: { top: number; bottom: number; left: number; right: number };
  side: "top" | "bottom";
  opener: { top: number; bottom: number };
  viewport: { width: number; height: number };
  port: { top: number; bottom: number; left: number; right: number };
};

const runCase = (page: Page, config: CaseConfig) =>
  page.evaluate(async (options) => {
    const w = window as unknown as {
      mtrl: {
        createMenu: (settings: Record<string, unknown>) => { element: HTMLElement; open: () => void; close?: () => void };
      };
      __menu?: { element: HTMLElement; open: () => void; close?: () => void };
    };
    document.querySelectorAll("#scroller").forEach((node) => node.remove());
    w.__menu?.close?.();
    const scroller = document.createElement("div");
    scroller.id = "scroller";
    scroller.style.top = `${options.scrollerTop}px`;
    scroller.style.height = `${options.scrollerHeight}px`;
    if (options.border) scroller.style.border = `${options.border}px solid #333`;
    if (options.zoom && options.zoom !== 1) scroller.style.zoom = String(options.zoom);
    const content = document.createElement("div");
    content.id = "content";
    const opener = document.createElement("button");
    opener.id = "opener";
    opener.textContent = "Open";
    opener.style.top = `${options.openerTop}px`;
    content.append(opener);
    scroller.append(content);
    document.body.append(scroller);
    scroller.scrollTop = options.scrollTop;
    // The opener is the anchor; the menu lives in the scroller (the
    // container) or in the body.
    const menu = w.mtrl.createMenu({
      opener,
      position: options.position,
      offset: 8,
      container: options.body ? null : scroller,
      items: [{ text: "One" }, { text: "Two" }, { text: "Three" }, { text: "Four" }],
    });
    w.__menu = menu;
    await new Promise((done) => setTimeout(done, 250));
    menu.open();
    await new Promise((done) => setTimeout(done, 450));
    const before = scroller.scrollTop;
    // Focus the first item, the interaction the report measured.
    const item = menu.element.querySelector<HTMLElement>("[role='menuitem'], li, button");
    item?.focus();
    await new Promise((done) => setTimeout(done, 200));
    const after = scroller.scrollTop;
    const menuRect = menu.element.getBoundingClientRect();
    const openerRect = opener.getBoundingClientRect();
    const port = scroller.getBoundingClientRect();
    const clientTop = port.top + scroller.clientTop;
    const clientBottom = clientTop + scroller.clientHeight;
    return {
      scrollTopBefore: before,
      scrollTopAfterFocus: after,
      menu: { top: menuRect.top, bottom: menuRect.bottom, left: menuRect.left, right: menuRect.right },
      side: menu.element.className.includes("position-top") ? "top" : "bottom",
      opener: { top: openerRect.top, bottom: openerRect.bottom },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      port: { top: clientTop, bottom: clientBottom, left: port.left, right: port.right },
    } as Measured;
  }, config);

const run = async (browser: Browser, engine: string) => {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
  const failures: string[] = [];
  const rows: string[] = [];
  const cases: (CaseConfig & { id: string })[] = [];
  // The brief's measured set: an explicit container, two scroll offsets, the
  // preferred side below (normal) and above (inverse).
  for (const position of ["bottom-start", "top-start"] as const) {
    for (const scrollTop of [0, 120]) {
      for (const openerTop of [120, 300, 380]) {
        cases.push({ id: `container ${position} scrollTop=${scrollTop} opener=${openerTop}`, scrollerTop: 100, scrollerHeight: 400, openerTop, scrollTop, position });
      }
    }
  }
  // The scroller whose top is inside the window and whose end is too: the
  // roomier side is below, inside the window.
  cases.push({ id: "container deep scroller bottom-start scrollTop=120 opener=380", scrollerTop: 260, scrollerHeight: 500, openerTop: 380, scrollTop: 120, position: "bottom-start" });
  // The scrollport's own box: a border is not room, and a zoomed scroller's
  // client box is not its rect.
  for (const border of [12]) {
    cases.push({ id: `container top-start scrollTop=120 opener=380 border=${border}`, scrollerTop: 100, scrollerHeight: 400, openerTop: 380, scrollTop: 120, position: "top-start", border });
  }
  cases.push({ id: "container top-start scrollTop=120 opener=380 zoom=0.7", scrollerTop: 100, scrollerHeight: 400, openerTop: 380, scrollTop: 120, position: "top-start", zoom: 0.7 });

  // The control: the same geometry with the menu in the body, which the
  // scroller cannot clip.
  for (const scrollTop of [0, 120]) {
    cases.push({ id: `body scrollTop=${scrollTop} opener=300`, scrollerTop: 100, scrollerHeight: 400, openerTop: 300, scrollTop, position: "bottom-start", body: true });
  }

  for (const testCase of cases) {
    const measured = await runCase(page, testCase);
    const within = (value: number, low: number, high: number) => value >= low - 0.5 && value <= high + 0.5;
    const body = testCase.body === true;
    const clipTop = body ? 0 : Math.max(0, measured.port.top);
    const clipBottom = body ? measured.viewport.height : Math.min(measured.viewport.height, measured.port.bottom);
    if (!within(measured.menu.top, clipTop, clipBottom) || !within(measured.menu.bottom, clipTop, clipBottom)) {
      failures.push(`${testCase.id}: the menu is seen whole (menu ${measured.menu.top.toFixed(1)}..${measured.menu.bottom.toFixed(1)}, visible ${clipTop}..${clipBottom})`);
    }
    // The side it took is a side of its opener, not over it.
    const above = measured.side === "top"
      ? measured.menu.bottom <= measured.opener.top + 0.5
      : measured.menu.top >= measured.opener.bottom - 0.5;
    if (!above) {
      failures.push(`${testCase.id}: the menu keeps its ${measured.side} side of the opener (menu ${measured.menu.top.toFixed(1)}..${measured.menu.bottom.toFixed(1)}, opener ${measured.opener.top.toFixed(1)}..${measured.opener.bottom.toFixed(1)})`);
    }
    // Focusing an item does not scroll the container.
    if (Math.abs(measured.scrollTopAfterFocus - measured.scrollTopBefore) > 0.5) {
      failures.push(`${testCase.id}: focusing an item leaves the container where it was (scrollTop ${measured.scrollTopBefore} -> ${measured.scrollTopAfterFocus})`);
    }
    rows.push(`${testCase.id} menu ${measured.menu.top.toFixed(0)}..${measured.menu.bottom.toFixed(0)} scroll ${measured.scrollTopBefore}->${measured.scrollTopAfterFocus}`);
  }
  // The body control: a menu in the body with autoFlip: false scrolls the
  // document on open exactly as main does — 62 px in Chromium, 63 in WebKit in
  // this geometry, once the reveal settles. Nothing here may change it.
  const bodyOpen = await page.evaluate(async () => {
    document.querySelectorAll("#scroller").forEach((node) => node.remove());
    document.querySelectorAll(".mtrl-menu").forEach((node) => node.remove());
    window.scrollTo(0, 0);
    const pageElement = document.createElement("div");
    pageElement.style.cssText = "height:1600px;position:relative";
    const opener = document.createElement("button");
    opener.id = "opener";
    opener.textContent = "Open";
    opener.style.cssText = "position:absolute;left:40px;top:540px;width:120px;height:36px";
    pageElement.append(opener);
    document.body.append(pageElement);
    const menu = (window as unknown as { mtrl: { createMenu: (settings: Record<string, unknown>) => { element: HTMLElement; open: () => void } } }).mtrl.createMenu({
      opener,
      position: "bottom-start",
      offset: 8,
      autoFlip: false,
      items: Array.from({ length: 6 }, (_, index) => ({ text: `Item ${index + 1}` })),
    });
    await new Promise((done) => setTimeout(done, 200));
    menu.open();
    // The browser's own focus scroll lands once the reveal settles.
    await new Promise((done) => setTimeout(done, 1200));
    return window.scrollY;
  });
  // Main settles at 62 px in Chromium and 63 in WebKit; the browser's own
  // focus scroll can land a few pixels off across runs, so the guard keeps a
  // band between 37 and 88 px rather than an exact value: a regression to no scroll (0)
  // or to a scroll of the whole surface fails.
  const expectedBodyScroll = engine === "webkit" ? 63 : 62;
  if (!(bodyOpen >= expectedBodyScroll - 25 && bodyOpen <= expectedBodyScroll + 25)) {
    failures.push(`body autoFlip:false open: the window scroll stays near main's (${expectedBodyScroll}, measured ${bodyOpen})`);
  }
  rows.push(`body autoFlip:false open scroll ${bodyOpen} (main ${expectedBodyScroll})`);

  // A positioned host: the opener under a zoomed child, and the menu written
  // in the host's own space (its border and scroll taken out and back).
  const hostCases = await page.evaluate(async () => {
    const results: { name: string; offsetParentIsHost: boolean; openerLeft: number; openerRight: number; openerTop: number; openerBottom: number; menuLeft: number; menuRight: number; menuTop: number; menuBottom: number; menuWidth: number; clientTop: number; clientBottom: number; clientLeft: number; clientRight: number }[] = [];
    for (const kind of ["host-zoom", "host-zoom pre-mounted", "host-zoom on host", "host-border"] as const) {
      document.querySelectorAll(".mtrl-menu").forEach((node) => node.remove());
      const host = document.createElement("div");
      host.id = "host";
      host.style.cssText = "position:absolute;left:100px;top:100px;width:420px;height:400px";
      const content = document.createElement("div");
      content.style.cssText = "height:900px;position:relative";
      const zoomed = document.createElement("div");
      zoomed.style.zoom = "0.7";
      const opener = document.createElement("button");
      opener.id = "opener";
      opener.textContent = "Open";
      opener.style.cssText = "position:absolute;left:24px;top:200px;width:200px;height:36px";
      zoomed.append(opener);
      content.append(zoomed);
      host.append(content);
      document.body.append(host);
      if (kind === "host-zoom on host") host.style.cssText += ";overflow:hidden;zoom:0.7", zoomed.style.zoom = "1";
      else if (kind === "host-zoom" || kind === "host-zoom pre-mounted") host.style.overflow = "hidden";
      else {
        host.style.cssText += ";overflow:auto;border:12px solid #333;box-sizing:border-box";
        host.scrollTop = 120;
      }
      const create = (window as unknown as { mtrl: { createMenu: (settings: Record<string, unknown>) => { element: HTMLElement; open: () => void } } }).mtrl.createMenu;
      const settings: Record<string, unknown> = { opener, offset: 8, items: [{ text: "One" }, { text: "Two" }, { text: "Three" }] };
      if (kind === "host-zoom") Object.assign(settings, { position: "bottom-end", container: host, width: "100%" });
      else if (kind === "host-zoom pre-mounted" || kind === "host-zoom on host") Object.assign(settings, { position: "bottom-end", width: "100%" });
      else Object.assign(settings, { position: "bottom-start" });
      const menu = create(settings);
      // The pre-mounted cases put the menu in the host itself, so the host is
      // its offsetParent and the space being guarded is the host's own.
      if (kind !== "host-zoom") host.append(menu.element);
      await new Promise((done) => setTimeout(done, 250));
      menu.open();
      await new Promise((done) => setTimeout(done, 500));
      const rect = (element: Element) => element.getBoundingClientRect();
      const m = rect(menu.element);
      const o = rect(opener);
      const port = rect(host);
      results.push({
        name: kind,
        offsetParentIsHost: menu.element.offsetParent === host,
        openerLeft: o.left, openerRight: o.right, openerTop: o.top, openerBottom: o.bottom,
        menuLeft: m.left, menuRight: m.right, menuTop: m.top, menuBottom: m.bottom, menuWidth: m.width,
        clientTop: port.top + host.clientTop, clientBottom: port.top + host.clientTop + host.clientHeight,
        clientLeft: port.left + host.clientLeft, clientRight: port.left + host.clientLeft + host.clientWidth,
      });
      host.remove();
    }
    return results;
  });
  for (const hostCase of hostCases) {
    const label = `positioned host ${hostCase.name}`;
    if (hostCase.name !== "host-zoom" && !hostCase.offsetParentIsHost) {
      failures.push(`${label}: the menu's offsetParent is the host (the case guards the host's conversion)`);
    }
    if (hostCase.name !== "host-border") {
      // 100% of the opener, right-aligned to it.
      if (Math.abs(hostCase.menuRight - hostCase.openerRight) > 1) failures.push(`${label}: the menu's end meets the opener's end (menu ${hostCase.menuRight.toFixed(1)}, opener ${hostCase.openerRight.toFixed(1)})`);
      if (Math.abs(hostCase.menuWidth - (hostCase.openerRight - hostCase.openerLeft)) > 1) failures.push(`${label}: the menu is the opener's width (menu ${hostCase.menuWidth.toFixed(1)}, opener ${(hostCase.openerRight - hostCase.openerLeft).toFixed(1)})`);
    } else {
      // Below the opener, clear of it, inside the host's client box.
      if (!(hostCase.menuTop >= hostCase.openerBottom - 0.5)) failures.push(`${label}: the menu is below the opener (menu top ${hostCase.menuTop.toFixed(1)}, opener bottom ${hostCase.openerBottom.toFixed(1)})`);
      if (!(hostCase.menuTop >= hostCase.clientTop - 0.5 && hostCase.menuBottom <= hostCase.clientBottom + 0.5)) failures.push(`${label}: the menu is inside the host's client box (${hostCase.menuTop.toFixed(1)}..${hostCase.menuBottom.toFixed(1)} in ${hostCase.clientTop.toFixed(1)}..${hostCase.clientBottom.toFixed(1)})`);
    }
    rows.push(`${label} menu ${hostCase.menuLeft.toFixed(0)}..${hostCase.menuRight.toFixed(0)} x ${hostCase.menuTop.toFixed(0)}..${hostCase.menuBottom.toFixed(0)} opener ${hostCase.openerLeft.toFixed(0)}..${hostCase.openerRight.toFixed(0)} x ${hostCase.openerTop.toFixed(0)}..${hostCase.openerBottom.toFixed(0)}`);
  }

  // The keyboard reveal: End on a 25-item menu scrolls the menu's own list,
  // in every layer and at a zoom, until the last item is whole inside it.
  const layerVariants = [
    { name: "body" },
    { name: "top" },
    { name: "container" },
    { name: "container zoom=0.7", zoom: 0.7 },
    { name: "top nested zoom=0.7", zoom: 0.7, layer: "top" },
  ] as const;
  for (const variant of layerVariants) {
    const reveal = await page.evaluate(async (options) => {
      document.querySelectorAll("#scroller").forEach((node) => node.remove());
      document.querySelectorAll(".mtrl-menu").forEach((node) => node.remove());
      const scroller = document.createElement("div");
      scroller.id = "scroller";
      scroller.style.top = "100px";
      scroller.style.height = "400px";
      if (options.zoom && options.zoom !== 1) scroller.style.zoom = String(options.zoom);
      const content = document.createElement("div");
      content.id = "content";
      const opener = document.createElement("button");
      opener.id = "opener";
      opener.textContent = "Open";
      opener.style.cssText = "position:absolute;left:24px;top:120px;width:120px;height:32px";
      // A body case carries no scroller; the container and nested top-layer
      // cases keep the opener inside the scroller's content.
      let host: HTMLElement = document.body;
      if (options.name !== "body") {
        content.append(opener);
        scroller.append(content);
        document.body.append(scroller);
        host = content;
      } else {
        opener.style.cssText = "position:absolute;left:24px;top:120px;width:120px;height:32px";
        host.append(opener);
      }
      const create = (window as unknown as { mtrl: { createMenu: (settings: Record<string, unknown>) => { element: HTMLElement; open: (event?: Event, kind?: string) => void } } }).mtrl.createMenu;
      const menu = create({
        opener,
        position: "bottom-start",
        offset: 8,
        layer: options.layer,
        // A container is the explicit-container case; the nested top-layer one
        // omits it, so the top layer is what places the menu.
        container: options.name === "container" || options.name === "container zoom=0.7" ? host.parentElement : undefined,
        items: Array.from({ length: 25 }, (_, index) => ({ text: `Item ${index + 1}` })),
      });
      menu.open(undefined, "keyboard");
      await new Promise((done) => setTimeout(done, 450));
      (document.activeElement as HTMLElement | null)?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
      await new Promise((done) => setTimeout(done, 250));
      const list = menu.element.querySelector<HTMLElement>(".mtrl-menu__list");
      const items = menu.element.querySelectorAll<HTMLElement>(".mtrl-menu__item");
      const last = items[items.length - 1];
      const listRect = (list ?? menu.element).getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      return {
        scrollTop: list?.scrollTop ?? 0,
        lastTop: lastRect.top,
        lastBottom: lastRect.bottom,
        listTop: listRect.top,
        listBottom: listRect.bottom,
      };
    }, variant);
    const label = `long menu ${variant.name}`;
    if (!(reveal.scrollTop > 0)) failures.push(`${label}: End scrolls the menu's own list (scrollTop stays ${reveal.scrollTop})`);
    // Sub-pixel zoom rounding leaves the reveal within a pixel of the edge.
    if (!(reveal.lastTop >= reveal.listTop - 1.5 && reveal.lastBottom <= reveal.listBottom + 1.5)) {
      failures.push(`${label}: the last item is whole in the list after End (item ${reveal.lastTop.toFixed(1)}..${reveal.lastBottom.toFixed(1)}, list ${reveal.listTop.toFixed(1)}..${reveal.listBottom.toFixed(1)})`);
    }
    rows.push(`${label} last item ${reveal.lastTop.toFixed(0)}..${reveal.lastBottom.toFixed(0)} in list ${reveal.listTop.toFixed(0)}..${reveal.listBottom.toFixed(0)} scrollTop ${reveal.scrollTop}`);
  }
  await page.close();
  assert.deepEqual(failures, [], `${engine}: a menu in a container is placed where it can be seen, focus does not scroll it onto its opener, and End reveals the last item in every layer`);
  return { engine, rows };
};

const results = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try { results.push(await run(chromiumBrowser, "chromium")); } finally { await chromiumBrowser.close(); }
let webkitBrowser: Browser | null = null;
try { webkitBrowser = await webkit.launch({ headless: true }); } catch { console.log("menu container space: WebKit not installed here, skipped"); }
if (webkitBrowser) {
  try { results.push(await run(webkitBrowser, "webkit")); } finally { await webkitBrowser.close(); }
}
server.stop(true);
for (const result of results) for (const row of result.rows) console.log(`${result.engine} ${row}`);
console.log("Menu container space check passed.");
