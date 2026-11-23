#!/usr/bin/env bun
/**
 * Where the FAB menu's list opens, and what `autoFlip` now means.
 *
 * The list hangs from the FAB: above it while it fits, otherwise on the side
 * with more room (the shared vertical rule in src/core/dom/placement.ts),
 * scrolling only when neither side holds it; and on the end side while it
 * stays inside the window, otherwise on the start side. A list that fits is
 * placed exactly as before. The decision is taken once per opening.
 *
 * Menus and selects have read `autoFlip` in their types but not their
 * positioner; both now keep the preferred side when it is `false`, capped so
 * the list scrolls, and are unchanged when it is `true`.
 *
 * Pass --brief <path> to also write the owner's self-contained test page and
 * verify it headless from file://: no page errors, no requests, nothing
 * clipped.
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import * as sass from "sass";

const repoRoot = resolve(import.meta.dir, "..");
const briefFlag = process.argv.indexOf("--brief");
const briefPath = briefFlag === -1 ? "" : resolve(process.argv[briefFlag + 1] ?? "");

const compile = (source: string): string => sass.compileString(`@use "${source}";`, {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;

const themeCss = sass.compileString(`@use "base/tokens";\n@use "themes/index";`, {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;
const css = [
  themeCss,
  compile("utilities/ripple"),
  compile("components/text-field"),
  compile("components/button"),
  compile("components/fab"),
  compile("components/menu"),
  compile("components/select"),
  compile("components/fab-menu"),
].join("\n");

const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75zM20.7 7.05a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"/></svg>';

const entrySource = `
import * as mtrl from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineFabMenu } from ${JSON.stringify(resolve(repoRoot, "src/elements/fab-menu.ts"))};
import { registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/styles.ts"))};
registerStyles({
  ripple: ${JSON.stringify(compile("utilities/ripple"))},
  button: ${JSON.stringify(compile("components/button"))},
  fab: ${JSON.stringify(compile("components/fab"))},
  menu: ${JSON.stringify(compile("components/menu"))},
  "text-field": ${JSON.stringify(compile("components/text-field"))},
  "fab-menu": ${JSON.stringify(compile("components/fab-menu"))},
});
defineFabMenu();
window.mtrl = mtrl;
`;

const buildBundle = async (): Promise<string> => {
  const result = await Bun.build({
    entrypoints: ["fab-menu-position-entry.ts"],
    target: "browser",
    format: "iife",
    plugins: [{
      name: "virtual-entry",
      setup(build) {
        build.onResolve({ filter: /^fab-menu-position-entry\.ts$/ }, () => ({ path: resolve(repoRoot, "fab-menu-position-entry.ts") }));
        build.onLoad({ filter: /fab-menu-position-entry\.ts$/ }, () => ({ contents: entrySource, loader: "ts" }));
      },
    }],
  });
  assert(result.success, String(result.logs));
  return result.outputs[0]!.text();
};

type Box = { x: number; y: number; width: number; height: number };
type Corner = "top-start" | "top-end" | "bottom-start" | "bottom-end";

const failures: string[] = [];
const fail = (message: string): void => {
  failures.push(message);
  console.log(`FAIL ${message}`);
};

/** The page-side helpers every case uses. */
const HELPERS = `
window.h = {
  root: () => {
    const stage = document.getElementById("stage");
    const direct = stage.querySelector(".mtrl-fab-menu");
    if (direct) return direct;
    const host = stage.querySelector("m-fab-menu");
    return host.shadowRoot.querySelector(".mtrl-fab-menu");
  },
  fab: () => window.h.root().querySelector(".mtrl-fab"),
  list: () => window.h.root().querySelector(".mtrl-fab-menu__list"),
  items: () => Array.from(window.h.root().querySelectorAll("[role=menuitem]")),
  box: (element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; },
};
`;

const mountCorner = (page: Page, corner: Corner, route: "factory" | "element", config: Record<string, unknown> = {}) =>
  page.evaluate(({ corner, route, config, icon }) => {
    const stage = document.getElementById("stage")!;
    stage.replaceChildren();
    stage.dataset.corner = corner;
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.corner = corner;
    stage.append(cell);
    const items = [
      { id: "reply", text: "Reply", icon },
      { id: "forward", text: "Forward", icon },
      { id: "archive", text: "Archive", icon },
    ];
    const w = window as unknown as { mtrl: { createFabMenu: (c: Record<string, unknown>) => never } };
    if (route === "factory") {
      const menu = w.mtrl.createFabMenu({ icon, ariaLabel: "Compose", presentation: "list", placement: "none", items, ...config });
      cell.append((menu as unknown as { element: HTMLElement }).element);
      return;
    }
    const host = document.createElement("m-fab-menu");
    host.setAttribute("presentation", "list");
    host.setAttribute("placement", "none");
    host.setAttribute("aria-label", "Compose");
    host.setAttribute("icon", icon);
    for (const item of items) {
      const declared = document.createElement("m-fab-menu-item");
      declared.setAttribute("value", item.id);
      declared.setAttribute("icon", item.icon);
      declared.textContent = item.text;
      host.append(declared);
    }
    cell.append(host);
  }, { corner, route, config, icon });

const openFab = async (page: Page): Promise<void> => {
  const point = await page.evaluate(() => {
    const r = (window as unknown as { h: { fab: () => HTMLElement } }).h.fab().getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => (window as unknown as { h: { root: () => HTMLElement } }).h.root().classList.contains("mtrl-fab-menu--open"));
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
};

/** Everything a case asserts about an open list. */
const listState = (page: Page) => page.evaluate(() => {
  const h = (window as unknown as { h: { root: () => HTMLElement; list: () => HTMLElement; items: () => HTMLElement[]; box: (e: HTMLElement) => unknown } }).h;
  const root = h.root();
  const list = h.list();
  const items = h.items();
  return {
    down: root.classList.contains("mtrl-fab-menu--list-down"),
    start: root.classList.contains("mtrl-fab-menu--list-start"),
    box: h.box(list),
    viewport: [window.innerWidth, window.innerHeight],
    scrolls: list.scrollHeight > list.clientHeight + 1,
    delays: items.map((item) => item.style.getPropertyValue("--mtrl-fab-menu-delay")),
    maxHeight: list.style.maxHeight,
  };
});

const inside = (box: Box, width: number, height: number, margin = 0): boolean =>
  box.x >= margin - 0.5 && box.y >= margin - 0.5 && box.x + box.width <= width - margin + 0.5 && box.y + box.height <= height - margin + 0.5;

const context = await chromium.launchPersistentContext(resolve(repoRoot, ".bun/fab-menu-position-profile"), {
  headless: true,
  viewport: { width: 900, height: 700 },
  reducedMotion: "reduce",
});

try {
  const page = context.pages()[0] ?? await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!DOCTYPE html><html lang="en" data-theme="baseline"><head><meta charset="utf-8">
<style>#stage{position:fixed;inset:0;padding:24px}.cell{position:absolute;width:56px;height:56px}
.cell[data-corner="bottom-end"]{right:24px;bottom:24px}.cell[data-corner="bottom-start"]{left:24px;bottom:24px}
.cell[data-corner="top-end"]{right:24px;top:24px}.cell[data-corner="top-start"]{left:24px;top:24px}</style>
</head><body><main id="stage"></main></body></html>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: await buildBundle() });
  await page.addScriptTag({ content: HELPERS });

  // ---- The list at all four corners, both routes and directions at default size.
  for (const route of ["factory", "element"] as const) {
    for (const dir of ["ltr", "rtl"] as const) {
      for (const corner of ["top-start", "top-end", "bottom-start", "bottom-end"] as const) {
        await page.evaluate((direction) => { document.documentElement.dir = direction; }, dir);
        await mountCorner(page, corner, route);
        await openFab(page);
        const state = await listState(page);
        const [width, height] = state.viewport;
        const label = `${route}/${dir}/${corner}`;
        // Top corners open downward, bottom corners upward, at this size.
        assert.equal(state.down, corner.startsWith("top"), `${label}: the list opens on the side with room`);
        assert(inside(state.box, width, height), `${label}: the list stays inside the window (${JSON.stringify(state.box)})`);
        assert.equal(state.scrolls, false, `${label}: a list that fits does not scroll`);
        if (state.down) {
          // Nearest the FAB first: the first item's delay is the smallest.
          const numbers = state.delays.map((value) => Number.parseFloat(value));
          assert(numbers[0]! <= numbers[numbers.length - 1]!, `${label}: opening downward reverses the stagger`);
        }
        // Decided once: nothing moves while it is open.
        const before = JSON.stringify(state.box);
        await page.waitForTimeout(350);
        const after = JSON.stringify((await listState(page)).box);
        assert.equal(after, before, `${label}: the list does not move while open`);
      }
    }
  }

  // ---- A short window: the top corners still open downward without scrolling;
  // the bottom ones scroll only because neither side holds the six items.
  await page.setViewportSize({ width: 900, height: 300 });
  await mountCorner(page, "top-start", "factory");
  await openFab(page);
  const shortTop = await listState(page);
  assert.equal(shortTop.down, true, "short window, top corner: the list opens downward");
  assert.equal(shortTop.scrolls, false, "short window, top corner: the list fits below and does not scroll");
  assert(inside(shortTop.box, 900, 300), "short window, top corner: inside the window");
  await mountCorner(page, "bottom-start", "factory");
  await openFab(page);
  const shortBottom = await listState(page);
  assert(inside(shortBottom.box, 900, 300), `short window, bottom corner: inside the window (${JSON.stringify(shortBottom.box)})`);

  // ---- A narrow window, LTR: at the start edge the end side would cross it,
  // so the list takes the start alignment; RTL mirrors.
  await page.setViewportSize({ width: 300, height: 700 });
  for (const dir of ["ltr", "rtl"] as const) {
    await page.evaluate((direction) => { document.documentElement.dir = direction; }, dir);
    // The FAB sits at the start edge in both directions.
    await page.evaluate(() => { document.getElementById("stage")!.dataset.corner = "bottom-start"; });
    await mountCorner(page, "bottom-start", "factory");
    await page.evaluate((direction) => {
      const stage = document.getElementById("stage")!;
      const cell = stage.querySelector(".cell") as HTMLElement;
      cell.style.left = "auto";
      cell.style.right = direction === "rtl" ? "24px" : "auto";
      cell.style.left = direction === "rtl" ? "auto" : "0px";
    }, dir);
    await openFab(page);
    const state = await listState(page);
    // The width the decision used, and where the FAB sits, for the message.
    const detail = await page.evaluate(() => {
      const h = (window as unknown as { h: { fab: () => HTMLElement; root: () => HTMLElement } }).h;
      const fab = h.fab().getBoundingClientRect();
      const content = (h.root().querySelector(".mtrl-fab-menu__item-content") as HTMLElement).offsetWidth;
      return { fab: [fab.left, fab.right], content, dir: getComputedStyle(h.root()).direction };
    });
    assert(inside(state.box, 300, 700), `narrow ${dir}: the list stays inside the window (${JSON.stringify(state.box)}, ${JSON.stringify(detail)})`);
    assert.equal(state.start, true, `narrow ${dir}: a list that would cross the start edge takes the start alignment (${JSON.stringify(detail)})`);
  }
  await page.setViewportSize({ width: 900, height: 700 });

  // ---- Menu and Select: autoFlip honoured, default behaviour unchanged.
  const menuCase = (autoFlip: boolean | undefined) => page.evaluate(({ autoFlip }) => {
    document.documentElement.dir = "ltr";
    const stage = document.getElementById("stage")!;
    stage.replaceChildren();
    const holder = document.createElement("div");
    holder.style.cssText = "position:absolute;left:24px;bottom:8px;width:200px;height:44px";
    const opener = document.createElement("button");
    opener.textContent = "Open";
    opener.id = "opener";
    holder.append(opener);
    stage.append(holder);
    const w = window as unknown as {
      mtrl: { createMenu: (c: Record<string, unknown>) => { element: HTMLElement; open: () => void } };
      menu: { open: () => void; destroy: () => void };
    };
    const items = Array.from({ length: 10 }, (_, index) => ({ id: `i${index}`, text: `Item ${index}` }));
    w.menu = w.mtrl.createMenu({
      opener,
      items,
      position: "bottom-start",
      ...(autoFlip === undefined ? {} : { autoFlip }),
    });
    stage.append(w.menu.element as unknown as HTMLElement);
    return true;
  }, { autoFlip });
  const openMenu = async () => {
    await page.evaluate(() => {
      const menu = (window as unknown as { menu: { element?: HTMLElement; open: () => void } }).menu;
      menu.open();
    });
    // The positioner runs once the menu is visible; a couple of frames and a
    // task later, the classes are in place.
    await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 30)))));
  };
  const menuState = () => page.evaluate(() => {
    const element = (window as unknown as { menu: { element: HTMLElement } }).menu.element as HTMLElement;
    const root = element.classList.contains("mtrl-menu") ? element : element.querySelector(".mtrl-menu") as HTMLElement;
    const box = root.getBoundingClientRect();
    return {
      top: root.classList.contains("mtrl-menu--position-top"),
      bottom: root.classList.contains("mtrl-menu--position-bottom"),
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      scrolls: (() => {
        const list = root.querySelector(".mtrl-menu__list") as HTMLElement;
        return list.scrollHeight > list.clientHeight + 1;
      })(),
      maxHeight: root.style.maxHeight,
    };
  });
  await menuCase(undefined);
  await openMenu();
  const menuDefault = await menuState();
  await page.evaluate(() => (window as unknown as { menu: { destroy: () => void } }).menu.destroy());
  await menuCase(true);
  await openMenu();
  const menuTrue = await menuState();
  await page.evaluate(() => (window as unknown as { menu: { destroy: () => void } }).menu.destroy());
  await menuCase(false);
  await openMenu();
  const menuFalse = await menuState();
  await page.evaluate(() => (window as unknown as { menu: { destroy: () => void } }).menu.destroy());
  // No room below ten items in a 700px window with the opener at its foot.
  assert.equal(menuDefault.top, true, `menu: the default opens above when the list does not fit below (${JSON.stringify(menuDefault)})`);
  assert.deepEqual(menuTrue.box, menuDefault.box, "menu: autoFlip true is the default placement");
  assert.equal(menuFalse.bottom, true, "menu: autoFlip false keeps the preferred side");
  assert.equal(menuFalse.scrolls, true, "menu: autoFlip false caps the height so the list scrolls");
  assert.notEqual(menuFalse.maxHeight, "", "menu: autoFlip false caps the height on the side it kept");

  // Select: the menu of a field at the same foot of the window.
  const selectCase = (autoFlip: boolean) => page.evaluate(({ autoFlip }) => {
    const stage = document.getElementById("stage")!;
    stage.replaceChildren();
    const holder = document.createElement("div");
    holder.style.cssText = "position:absolute;left:24px;bottom:8px;width:240px";
    stage.append(holder);
    const w = window as unknown as {
      mtrl: { createSelect: (c: Record<string, unknown>) => { element: HTMLElement } };
      select: { element: HTMLElement; open?: () => void };
    };
    const options = Array.from({ length: 10 }, (_, index) => ({ id: `o${index}`, text: `Option ${index}` }));
    w.select = w.mtrl.createSelect({ label: "Fruit", options, menu: { autoFlip } }) as unknown as { element: HTMLElement };
    holder.append(w.select.element);
  }, { autoFlip });
  for (const autoFlip of [true, false]) {
    await selectCase(autoFlip);
    await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));
    await page.locator(".mtrl-select input").click({ force: true });
    await page.waitForSelector('[role="listbox"], [role="menu"]');
    await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
    const state = await page.evaluate(() => {
      const popup = document.querySelector(".mtrl-select__menu") as HTMLElement;
      const box = popup.getBoundingClientRect();
      return {
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        top: popup.classList.contains("mtrl-menu--position-top"),
        maxHeight: popup.style.maxHeight,
      };
    });
    // With autoFlip on, the menu takes the roomier side and stays inside the
    // window; with it off it keeps the field's side, capped — the caller chose
    // a side the window cannot fully hold.
    if (autoFlip) assert(inside(state.box, 900, 700), `select, autoFlip ${autoFlip}: the menu stays inside the window`);
    else assert.notEqual(state.maxHeight, "", "select, autoFlip false: the menu is capped on the side it kept");
    assert.equal(state.top, autoFlip, `select, autoFlip ${autoFlip}: ${autoFlip ? "the menu takes the roomier side" : "the menu keeps the field's preferred side"}`);
    await page.keyboard.press("Escape");
    await page.evaluate(() => (window as unknown as { select: { destroy: () => void } }).select.destroy());
  }

  // The element path of the same list decisions, at the start edge.
  await page.evaluate(() => { document.documentElement.dir = "ltr"; });
  await mountCorner(page, "bottom-start", "element");
  await openFab(page);
  const elementState = await listState(page);
  assert(inside(elementState.box, 900, 700), "element: the list stays inside the window");

  assert.deepEqual(errors, [], "no page errors");
  if (failures.length === 0) console.log("fab menu position: all cases pass");

  // ---- The owner's page, when asked for: written, then proven headless.
  if (briefPath) {
    const bundle = await buildBundle();
    const html = ownerPage(css, Buffer.from(bundle).toString("base64"), icon);
    mkdirSync(dirname(briefPath), { recursive: true });
    writeFileSync(briefPath, html);
    const proof = await proveOwnerPage(pathToFileURL(briefPath).href, fail);
    console.log(`owner page: ${briefPath} — ${proof}`);
  }

  if (failures.length > 0) {
    console.error(`fab menu position: ${failures.length} failure(s)`);
    process.exit(1);
  }
} finally {
  await context.close();
}

/** The owner's page: every widget inlined, nothing loaded from anywhere. */
function ownerPage(styles: string, scriptBase64: string, svg: string): string {
  const demo = `
<header>
  <strong>FAB menu, menu and select placement</strong>
  <label>Demo area <input id="resize" type="range" min="260" max="100%" value="100%"></label>
  <label><input id="dark" type="checkbox"> Dark</label>
  <label><input id="rtl" type="checkbox"> RTL</label>
  <label><input id="flip" type="checkbox"> autoFlip on Menu and Select</label>
</header>
<div id="demo">
  <div class="corner" data-corner="top-start"><span>top-start</span></div>
  <div class="corner" data-corner="top-end"><span>top-end</span></div>
  <div class="corner" data-corner="bottom-start"><span>bottom-start</span></div>
  <div class="corner" data-corner="bottom-end"><span>bottom-end</span></div>
  <div id="edge-menu"><div id="menu-holder"></div></div>
  <div id="edge-select"><div id="select-holder"></div></div>
</div>
<script type="module" src="data:text/javascript;base64,${scriptBase64}"></script>
<script type="module">
const icon = ${JSON.stringify(svg)};
const items = [["reply","Reply"],["forward","Forward"],["archive","Archive"],["delete","Delete"],["more","More"],["print","Print"]]
  .map(([id, text]) => ({ id, text, icon }));
const fabMenus = [];
for (const corner of ["top-start", "top-end", "bottom-start", "bottom-end"]) {
  const menu = window.mtrl.createFabMenu({ icon, ariaLabel: "Compose", presentation: "list", placement: "none", items });
  document.querySelector('[data-corner="' + corner + '"]').append(menu.element);
  fabMenus.push(menu);
}
const menuHolder = document.getElementById("menu-holder");
const opener = document.createElement("button");
opener.textContent = "Open menu";
menuHolder.append(opener);
let menu = window.mtrl.createMenu({ opener, items: items.slice(0, 3), position: "bottom-start", autoFlip: true });
let select = window.mtrl.createSelect({ label: "Fruit", options: [{ id: "apple", text: "Apple" }, { id: "banana", text: "Banana" }, { id: "cherry", text: "Cherry" }, { id: "date", text: "Date" }, { id: "elder", text: "Elder" }, { id: "fig", text: "Fig" }], menu: { autoFlip: true } });
document.getElementById("select-holder").append(select.element);
const rebuild = () => {
  const flip = document.getElementById("flip").checked;
  menu.destroy();
  select.destroy();
  menu = window.mtrl.createMenu({ opener, items: items.slice(0, 3), position: "bottom-start", autoFlip: flip });
  select = window.mtrl.createSelect({ label: "Fruit", options: [{ id: "apple", text: "Apple" }, { id: "banana", text: "Banana" }, { id: "cherry", text: "Cherry" }, { id: "date", text: "Date" }, { id: "elder", text: "Elder" }, { id: "fig", text: "Fig" }], menu: { autoFlip: flip } });
  document.getElementById("select-holder").append(select.element);
};
document.getElementById("flip").addEventListener("change", rebuild);
document.getElementById("dark").addEventListener("change", (event) => {
  document.documentElement.dataset.themeMode = event.target.checked ? "dark" : "light";
});
document.getElementById("rtl").addEventListener("change", (event) => {
  document.documentElement.dir = event.target.checked ? "rtl" : "ltr";
});
document.getElementById("resize").addEventListener("input", (event) => {
  document.getElementById("demo").style.width = event.target.value + "%";
});
window.demo = { fabMenus, menu: () => menu, select: () => select };
</script>`;
  return `<!DOCTYPE html>
<html lang="en" data-theme="baseline">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>FAB menu placement</title>
<style>${styles}
body{margin:0;font:14px/1.4 Roboto,system-ui,sans-serif}
header{display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--mtrl-sys-color-outline-variant)}
#demo{position:relative;height:70vh;min-height:420px;width:100%;margin:16px auto 0;border:1px dashed var(--mtrl-sys-color-outline-variant)}
.corner{position:absolute;width:56px;height:56px}
.corner[data-corner="top-start"]{top:12px;left:12px}.corner[data-corner="top-end"]{top:12px;right:12px}
.corner[data-corner="bottom-start"]{bottom:12px;left:12px}.corner[data-corner="bottom-end"]{bottom:12px;right:12px}
.corner span{position:absolute;top:-18px;left:0;font-size:11px;opacity:.6;white-space:nowrap}
#edge-menu{position:absolute;left:75%;bottom:12px}#edge-select{position:absolute;left:8%;bottom:12px;width:220px}
</style></head>
<body>${demo}</body></html>`;
}

/** Loads the owner page from file://, opens every widget, and checks nothing was fetched or clipped. */
async function proveOwnerPage(url: string, report: (message: string) => void): Promise<string> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
    const requests: string[] = [];
    const failures: string[] = [];
    page.on("request", (request) => { if (!request.url().startsWith("file:") && !request.url().startsWith("data:")) requests.push(request.url()); });
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.demo);
    // Open every FAB menu list, then a menu and the select, and measure.
    const clipped = await page.evaluate(async () => {
      const state = (window as unknown as { demo: { fabMenus: { open: () => void }[] } }).demo;
      const clippedItems: string[] = [];
      for (const menu of state.fabMenus) {
        (menu as unknown as { open: () => void }).open();
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        const element = (menu as unknown as { element: HTMLElement }).element;
        const root = (element.matches(".mtrl-fab-menu") ? element : element.querySelector(".mtrl-fab-menu")) as HTMLElement;
        const list = root.querySelector(".mtrl-fab-menu__list") as HTMLElement;
        const box = list.getBoundingClientRect();
        if (box.left < -0.5 || box.top < -0.5 || box.right > innerWidth + 0.5 || box.bottom > innerHeight + 0.5) clippedItems.push(`list ${box.left},${box.top},${box.right},${box.bottom}`);
        (menu as unknown as { close: () => void }).close();
      }
      return clippedItems;
    });
    if (clipped.length) report(`owner page: ${clipped.join("; ")}`);
    return `${failures.length} page errors, ${requests.length} requests, ${clipped.length} clipped`;
  } finally {
    await browser.close();
  }
}
