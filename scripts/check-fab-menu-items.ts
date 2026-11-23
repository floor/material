#!/usr/bin/env bun
/**
 * A FAB menu list item is a button. A press draws the ripple at that point,
 * and the list's own behaviour stays: the item class, role="menuitem", the
 * keys, focus returning to the FAB, the width reveal anchored at the end,
 * the colour sets, the 56dp height, both directions, and forced colours.
 * destroy() takes the button, its ripple and the press listener with it.
 *
 * The pressed state is a ripple at the point of input
 * (https://m3.material.io/foundations/interaction/states/applying-states,
 * Pressed, read 2026-11-23). List items are 56dp pills
 * (https://m3.material.io/components/fab-menu/specs, read 2026-11-23).
 *
 * Pass --brief <path> to also write the owner's self-contained page.
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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
const rippleCss = compile("utilities/ripple");
const buttonCss = compile("components/button");
const fabCss = compile("components/fab");
const menuCss = compile("components/menu");
const fabMenuCss = compile("components/fab-menu");
const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75zM20.7 7.05a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"/></svg>';

const entrySource = `
import * as mtrl from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineFabMenu } from ${JSON.stringify(resolve(repoRoot, "src/elements/fab-menu.ts"))};
import { registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/styles.ts"))};
registerStyles({
  ripple: ${JSON.stringify(rippleCss)},
  button: ${JSON.stringify(buttonCss)},
  fab: ${JSON.stringify(fabCss)},
  menu: ${JSON.stringify(menuCss)},
  "fab-menu": ${JSON.stringify(fabMenuCss)},
});
defineFabMenu();
window.mtrl = mtrl;
`;
const bundleBuild = await Bun.build({
  entrypoints: ["fab-menu-items-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^fab-menu-items-entry\.ts$/ }, () => ({
        path: resolve(repoRoot, "fab-menu-items-entry.ts"),
      }));
      build.onLoad({ filter: /fab-menu-items-entry\.ts$/ }, () => ({ contents: entrySource, loader: "ts" }));
    },
  }],
});
assert(bundleBuild.success, String(bundleBuild.logs));
const bundle = await bundleBuild.outputs[0]!.text();

const pageCss = `${themeCss}\n${rippleCss}\n${buttonCss}\n${fabCss}\n${menuCss}\n${fabMenuCss}`;

type Route = "factory" | "element";
type Dir = "ltr" | "rtl";
type Color = "primary" | "secondary" | "tertiary";
type Box = { x: number; y: number; width: number; height: number };

const userDataDir = resolve(repoRoot, ".bun/fab-menu-items-profile");
mkdirSync(userDataDir, { recursive: true });
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  viewport: { width: 1100, height: 800 },
  reducedMotion: "reduce",
});

const failures: string[] = [];
const fail = (message: string) => {
  failures.push(message);
  console.log(`FAIL ${message}`);
};

try {
  const page = context.pages()[0] ?? await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent('<!DOCTYPE html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body><main id="stage" style="padding:280px 80px 64px"></main></body></html>');
  await page.addStyleTag({ content: pageCss });
  await page.addScriptTag({ content: bundle });
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "none" });

  const settle = () => page.evaluate(() => new Promise<void>((done) => {
    requestAnimationFrame(() => requestAnimationFrame(() => done()));
  }));

  const mount = (route: Route, dir: Dir, color: Color) => page.evaluate(({ route, dir, color, icon }) => {
    document.documentElement.dir = dir;
    const stage = document.getElementById("stage")!;
    stage.replaceChildren();
    const items = [
      { id: "reply", text: "Reply", icon },
      { id: "forward", text: "Forward", icon },
      { id: "archive", text: "Archive", icon },
    ];
    const w = window as unknown as {
      mtrl: { createFabMenu: (config: Record<string, unknown>) => { element: HTMLElement; open: () => void; destroy: () => void } };
    };
    if (route === "factory") {
      const menu = w.mtrl.createFabMenu({
        icon, ariaLabel: "Compose", color, presentation: "list", placement: "none", items,
      });
      (window as unknown as { menu: { destroy: () => void } }).menu = menu;
      stage.append(menu.element);
      return;
    }
    const host = document.createElement("m-fab-menu");
    host.setAttribute("presentation", "list");
    host.setAttribute("color", color);
    host.setAttribute("aria-label", "Compose");
    host.setAttribute("icon", icon);
    for (const item of items) {
      const declared = document.createElement("m-fab-menu-item");
      declared.setAttribute("value", item.id);
      declared.setAttribute("icon", item.icon);
      declared.textContent = item.text;
      host.append(declared);
    }
    stage.append(host);
    (window as unknown as { menu?: { destroy: () => void } }).menu = undefined;
  }, { route, dir, color, icon });

  const open = async () => {
    const box = await page.evaluate(() => {
      const rect = fab().getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    await page.mouse.click(box.x, box.y);
    await page.waitForFunction(() => root().classList.contains("mtrl-fab-menu--open"));
    await settle();
  };

  await page.evaluate(() => {
    const rootOf = (): HTMLElement => {
      const host = document.getElementById("stage")!.firstElementChild as HTMLElement;
      return host.classList.contains("mtrl-fab-menu")
        ? host
        : host.shadowRoot!.querySelector(".mtrl-fab-menu") as HTMLElement;
    };
    (window as unknown as { root: () => HTMLElement; fab: () => HTMLElement; itemEls: () => HTMLElement[] }).root = rootOf;
    (window as unknown as { fab: () => HTMLElement }).fab = () => rootOf().querySelector(".mtrl-fab") as HTMLElement;
    (window as unknown as { itemEls: () => HTMLElement[] }).itemEls = () =>
      Array.from(rootOf().querySelectorAll<HTMLElement>("[role=menuitem]"));
  });

  for (const route of ["factory", "element"] as const) {
    for (const dir of ["ltr", "rtl"] as const) {
      for (const color of ["primary", "secondary", "tertiary"] as const) {
        await mount(route, dir, color);
        await settle();
        await open();
        const report = await page.evaluate(({ dir }) => {
          const box = (element: HTMLElement): Box => {
            const rect = element.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          };
          const root = (window as unknown as { root: () => HTMLElement }).root();
          const items = (window as unknown as { itemEls: () => HTMLElement[] }).itemEls();
          const probe = document.createElement("div");
          probe.style.backgroundColor = getComputedStyle(root).getPropertyValue("--mtrl-fab-menu-item");
          root.append(probe);
          const expected = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return items.map((item) => {
            const content = item.querySelector(".mtrl-fab-menu__item-content") as HTMLElement;
            const narrow = item.style.width;
            item.style.width = "40px";
            const itemBox = box(item);
            const contentBox = box(content);
            item.style.width = narrow;
            const itemEnd = dir === "rtl" ? itemBox.x : itemBox.x + itemBox.width;
            const contentEnd = dir === "rtl" ? contentBox.x : contentBox.x + contentBox.width;
            const style = getComputedStyle(item);
            return {
              classes: item.className,
              role: item.getAttribute("role"),
              tag: item.tagName,
              height: style.height,
              justify: style.justifyContent,
              delay: item.style.getPropertyValue("--mtrl-fab-menu-delay"),
              width: style.width,
              contentWidth: content.getBoundingClientRect().width,
              itemWidth: item.getBoundingClientRect().width,
              endDelta: itemEnd - contentEnd,
              background: style.backgroundColor,
              expected,
              hasRipple: item.querySelector(".mtrl-ripple") !== null,
              hasIcon: item.querySelector(".mtrl-fab-menu__item-icon") !== null,
              hasText: item.querySelector(".mtrl-fab-menu__item-text") !== null,
            };
          });
        }, { dir, color });

        report.forEach((item, index) => {
          const where = `${route} ${dir} ${color} item ${index}`;
          console.log(`MEASURE ${where} height=${item.height} justify=${item.justify} delay=${item.delay} width=${item.itemWidth.toFixed(2)} content=${item.contentWidth.toFixed(2)} end=${item.endDelta.toFixed(2)} bg=${item.background}`);
          if (!item.classes.split(" ").includes("mtrl-fab-menu__item")) fail(`${where}: missing the item class`);
          if (!item.classes.split(" ").includes("mtrl-button")) fail(`${where}: missing the button class`);
          if (item.role !== "menuitem" || item.tag !== "BUTTON") fail(`${where}: ${item.tag} role=${item.role}`);
          if (item.height !== "56px") fail(`${where}: height ${item.height}`);
          if (item.justify !== "flex-end") fail(`${where}: justify-content ${item.justify}`);
          if (item.delay !== "0ms") fail(`${where}: reduced-motion delay ${item.delay}`);
          if (Math.abs(item.itemWidth - item.contentWidth) > 1) fail(`${where}: item width ${item.itemWidth} is not the content width ${item.contentWidth}`);
          if (Math.abs(item.endDelta) > 1) fail(`${where}: content end is ${item.endDelta.toFixed(2)}px off the item end`);
          if (item.background !== item.expected) fail(`${where}: background ${item.background} is not the colour set ${item.expected}`);
          if (!item.hasRipple || !item.hasText) fail(`${where}: ripple or label missing`);
          if (index === 0 && !item.hasIcon) fail(`${where}: icon missing`);
        });

        const target = await page.evaluate(() => {
          const item = (window as unknown as { itemEls: () => HTMLElement[] }).itemEls()[1]!;
          const rect = item.getBoundingClientRect();
          return { x: rect.x + 18, y: rect.y + rect.height / 2 };
        });
        await page.mouse.move(target.x, target.y);
        await page.mouse.down();
        await settle();
        const press = await page.evaluate(() => {
          const item = (window as unknown as { itemEls: () => HTMLElement[] }).itemEls()[1]!;
          const box = (element: HTMLElement): Box => {
            const rect = element.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          };
          const wave = item.querySelector(".mtrl-ripple-wave") as HTMLElement;
          const container = item.querySelector(".mtrl-ripple") as HTMLElement;
          return { item: box(item), wave: box(wave), container: box(container) };
        });
        const waveCentre = { x: press.wave.x + press.wave.width / 2, y: press.wave.y + press.wave.height / 2 };
        const dx = waveCentre.x - target.x;
        const dy = waveCentre.y - target.y;
        console.log(`MEASURE ${route} ${dir} ${color} press pointer=${target.x.toFixed(2)},${target.y.toFixed(2)} wave=${waveCentre.x.toFixed(2)},${waveCentre.y.toFixed(2)} dx=${dx.toFixed(2)} dy=${dy.toFixed(2)}`);
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) fail(`${route} ${dir} ${color}: wave is ${dx.toFixed(2)}px, ${dy.toFixed(2)}px from the pointer`);
        if (Math.abs(press.container.x - press.item.x) > 1 || Math.abs(press.container.y - press.item.y) > 1
          || Math.abs(press.container.width - press.item.width) > 1 || Math.abs(press.container.height - press.item.height) > 1) {
          fail(`${route} ${dir} ${color}: ripple container is not the item`);
        }
        await page.mouse.up();
        await settle();
      }

      if (!await page.evaluate(() => (window as unknown as { root: () => HTMLElement }).root().classList.contains("mtrl-fab-menu--open"))) await open();
      await page.evaluate(() => (window as unknown as { fab: () => HTMLElement }).fab().focus());
      await page.keyboard.press("ArrowDown");
      const first = await focusedText(page);
      await page.keyboard.press("ArrowDown");
      const second = await focusedText(page);
      await page.keyboard.press("End");
      const last = await focusedText(page);
      await page.keyboard.press("Home");
      const home = await focusedText(page);
      await page.keyboard.press("Escape");
      await settle();
      const returned = await page.evaluate(() => {
        const root = (window as unknown as { root: () => HTMLElement }).root();
        const fab = (window as unknown as { fab: () => HTMLElement }).fab();
        const active = root.getRootNode() instanceof ShadowRoot
          ? (root.getRootNode() as ShadowRoot).activeElement
          : document.activeElement;
        return {
          open: root.classList.contains("mtrl-fab-menu--open"),
          onFab: active === fab,
        };
      });
      console.log(`MEASURE ${route} ${dir} keys first=${first} second=${second} end=${last} home=${home} open=${returned.open} onFab=${returned.onFab}`);
      if (first !== "Reply" || second !== "Forward" || last !== "Archive" || home !== "Reply") {
        fail(`${route} ${dir}: keys focused ${first}, ${second}, ${last}, ${home}`);
      }
      if (returned.open || !returned.onFab) fail(`${route} ${dir}: Escape left open=${returned.open} focus on the FAB=${returned.onFab}`);
    }

    await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "none" });
    await mount(route, "ltr", "primary");
    await settle();
    await open();
    const delays = await page.evaluate(() =>
      (window as unknown as { itemEls: () => HTMLElement[] }).itemEls().map((item) => item.style.getPropertyValue("--mtrl-fab-menu-delay")));
    console.log(`MEASURE ${route} stagger ${delays.join(" ")}`);
    if (delays.length !== 3 || new Set(delays).size < 2) fail(`${route}: stagger delays ${delays.join(" ")}`);
    if (!delays.every((delay) => delay.endsWith("ms") && delay !== "0ms")) fail(`${route}: stagger delays ${delays.join(" ")}`);

    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
    await mount(route, "ltr", "primary");
    await settle();
    await open();
    await page.evaluate(() => (window as unknown as { itemEls: () => HTMLElement[] }).itemEls()[0]!.focus());
    const forced = await page.evaluate(() => {
      const item = (window as unknown as { itemEls: () => HTMLElement[] }).itemEls()[0]!;
      const style = getComputedStyle(item);
      const channels = style.outlineColor.match(/[\d.]+/g) ?? [];
      const alpha = style.outlineColor.startsWith("rgba") ? Number(channels[3]) : style.outlineColor === "transparent" ? 0 : 1;
      return { height: style.height, role: item.getAttribute("role"), outline: style.outlineWidth, alpha };
    });
    console.log(`MEASURE ${route} forced-colors height=${forced.height} outline=${forced.outline} alpha=${forced.alpha}`);
    if (forced.height !== "56px" || forced.role !== "menuitem") fail(`${route}: forced-colours item ${forced.height} role=${forced.role}`);
    if (forced.outline === "0px" || forced.alpha <= 0) fail(`${route}: forced-colours outline ${forced.outline} ${forced.alpha}`);
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "none" });

    const gone = await page.evaluate(async () => {
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      const add = document.addEventListener;
      const remove = document.removeEventListener;
      let presses = 0;
      document.addEventListener = ((name: string, listener: EventListener, options?: boolean | AddEventListenerOptions) => {
        if (name === "pointerup") presses += 1;
        add.call(document, name, listener, options);
      }) as typeof document.addEventListener;
      document.removeEventListener = ((name: string, listener: EventListener, options?: boolean | EventListenerOptions) => {
        if (name === "pointerup") presses -= 1;
        remove.call(document, name, listener, options);
      }) as typeof document.removeEventListener;
      const item = (window as unknown as { itemEls: () => HTMLElement[] }).itemEls()[0]!;
      item.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 8, clientY: 8 }));
      const during = presses;
      const host = document.getElementById("stage")!.firstElementChild as HTMLElement;
      const menu = (window as unknown as { menu?: { destroy: () => void } }).menu;
      if (menu) menu.destroy();
      else {
        host.remove();
        await new Promise<void>((done) => queueMicrotask(() => done()));
      }
      document.addEventListener = add;
      document.removeEventListener = remove;
      const left = document.querySelectorAll(".mtrl-ripple").length
        + (host.shadowRoot?.querySelectorAll(".mtrl-ripple").length ?? 0);
      return { during, presses, left };
    });
    console.log(`MEASURE ${route} destroy presses=${gone.during}->${gone.presses} ripples=${gone.left}`);
    // A second removeEventListener for a listener already gone still passes
    // through the counter. What matters is that every listener the press added
    // was removed, and no ripple element remains.
    if (gone.during <= 0 || gone.presses > 0 || gone.left !== 0) {
      fail(`${route}: destroy left presses ${gone.during}->${gone.presses}, ripples ${gone.left}`);
    }
  }

  const selected = await page.evaluate((icon) => {
    const w = window as unknown as {
      mtrl: { createFabMenu: (config: Record<string, unknown>) => { element: HTMLElement; on: (name: string, handler: (event: { id: string }) => void) => void } };
    };
    const stage = document.getElementById("stage")!;
    stage.replaceChildren();
    let id = "";
    const menu = w.mtrl.createFabMenu({
      icon, ariaLabel: "Compose", presentation: "list", placement: "none",
      items: [{ id: "reply", text: "Reply", icon }, { id: "forward", text: "Forward", icon }],
    });
    menu.on("select", (event) => { id = event.id; });
    stage.append(menu.element);
    return new Promise<string>((done) => {
      menu.element.querySelector<HTMLElement>(".mtrl-fab")!.click();
      requestAnimationFrame(() => {
        menu.element.querySelectorAll<HTMLElement>("[role=menuitem]")[1]!.click();
        done(id);
      });
    });
  }, icon);
  console.log(`MEASURE select ${selected}`);
  if (selected !== "forward") fail(`select emitted ${selected}`);

  assert.equal(errors.length, 0, errors.join("\n"));
  assert.equal(failures.length, 0, failures.join("\n"));
  console.log("fab menu items: ripple on the press, pill and keys unchanged, both directions, factory and element");

  if (briefPath) {
    const html = ownerPage(pageCss, bundle);
    mkdirSync(dirname(briefPath), { recursive: true });
    writeFileSync(briefPath, html);
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light", forcedColors: "none" });
    const brief = await page.evaluate(() => {
      const menus = Array.from(document.querySelectorAll<HTMLElement>(".mtrl-fab-menu"));
      const items = Array.from(document.querySelectorAll<HTMLElement>("[role=menuitem]"));
      return {
        menus: menus.length,
        open: menus.filter((menu) => menu.classList.contains("mtrl-fab-menu--open")).length,
        items: items.length,
        buttons: items.filter((item) => item.classList.contains("mtrl-button") && item.querySelector(".mtrl-ripple")).length,
        height: items[0] ? getComputedStyle(items[0]).height : "",
      };
    });
    console.log(`MEASURE brief menus=${brief.menus} open=${brief.open} items=${brief.items} buttons=${brief.buttons} height=${brief.height}`);
    if (brief.menus !== 9 || brief.open !== 9 || brief.items !== 18 || brief.buttons !== 18 || brief.height !== "56px") {
      throw new Error(`owner page: ${JSON.stringify(brief)}`);
    }
    await page.click("#theme");
    const dark = await page.evaluate(() => document.documentElement.getAttribute("data-theme-mode"));
    await page.click("#dir");
    const dir = await page.evaluate(() => document.documentElement.dir);
    if (dark !== "dark" || dir !== "rtl") throw new Error(`owner controls: theme=${dark} dir=${dir}`);
    console.log(`owner page: ${briefPath}`);
  }
} finally {
  await context.close();
}

function focusedText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const root = (window as unknown as { root: () => HTMLElement }).root();
    const node = root.getRootNode();
    const active = node instanceof ShadowRoot ? node.activeElement : document.activeElement;
    return (active as HTMLElement | null)?.querySelector(".mtrl-fab-menu__item-text")?.textContent ?? "";
  });
}

function ownerPage(css: string, script: string): string {
  const sizes = ["default", "medium", "large"];
  const colors = ["primary", "secondary", "tertiary"];
  const menus = sizes.flatMap((size) => colors.map((color) => `
    <section class="case">
      <h2>${size} · ${color}</h2>
      <div class="slot" data-size="${size}" data-color="${color}"></div>
    </section>`)).join("");
  return `<!DOCTYPE html>
<html lang="en" data-theme="baseline">
<head>
<meta charset="utf-8">
<title>FAB menu list items</title>
<style>
${css}
body { margin: 0; font: 14px/1.4 sans-serif; background: var(--mtrl-sys-color-surface); color: var(--mtrl-sys-color-on-surface); }
header { display: flex; gap: 12px; align-items: center; padding: 16px 24px; position: sticky; top: 0; background: var(--mtrl-sys-color-surface); }
button.control { font: inherit; padding: 8px 12px; }
main { display: flex; flex-wrap: wrap; gap: 32px; padding: 24px; }
.case { width: 280px; position: relative; }
.case h2 { margin: 0 0 12px; font-size: 14px; font-weight: 500; }
.slot { position: relative; height: 260px; display: flex; align-items: flex-end; }
</style>
</head>
<body>
<header>
  <button class="control" id="theme" type="button">Dark</button>
  <button class="control" id="dir" type="button">RTL</button>
</header>
<main>${menus}</main>
<script>${script}</script>
<script>
const icon = ${JSON.stringify(icon)};
const items = [
  { id: "reply", text: "Reply", icon },
  { id: "forward", text: "Forward", icon },
];
for (const slot of document.querySelectorAll(".slot")) {
  const menu = mtrl.createFabMenu({
    icon, ariaLabel: "Compose",
    size: slot.getAttribute("data-size"),
    color: slot.getAttribute("data-color"),
    presentation: "list",
    placement: "none",
    items,
  });
  slot.append(menu.element);
  menu.open();
}
document.getElementById("theme").addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.getAttribute("data-theme-mode") === "dark";
  root.toggleAttribute("data-theme-mode", !dark);
  if (!dark) root.setAttribute("data-theme-mode", "dark");
  else root.removeAttribute("data-theme-mode");
  document.getElementById("theme").textContent = dark ? "Dark" : "Light";
});
document.getElementById("dir").addEventListener("click", () => {
  const root = document.documentElement;
  const rtl = root.dir === "rtl";
  root.dir = rtl ? "ltr" : "rtl";
  document.getElementById("dir").textContent = rtl ? "RTL" : "LTR";
});
</script>
</body>
</html>
`;
}
