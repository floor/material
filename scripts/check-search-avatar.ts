#!/usr/bin/env bun
/**
 * A clickable search avatar is reset and carries the trailing buttons' state
 * layer and focus ring, in the factory and inside `<m-search>`.
 *
 * Measured 2026-11-26 on main 1d663bb2, Chromium and WebKit, light and dark:
 * the factory's avatar (light DOM) is a 0px-border, transparent, 0-padding box
 * because the page's button reset styles it; the element's avatar (shadow DOM)
 * kept the user agent's button — 2px outset border, rgb(239,239,239) fill in
 * Chromium and rgb(192,192,192) in WebKit, 1/6/1/6 padding — and both paths had
 * no state layer and only the UA focus ring (1px Chromium, 3px WebKit), where
 * the Settings and Clear buttons in the same bar have 8/10/10% layers and the
 * 3px Secondary ring at +2. The avatar is a trailing element of the bar
 * (https://m3.material.io/m3/pages/search/specs, "Trailing icon and avatar
 * (optional)", avatar 30dp; read 2026-11-26), so it takes the same rule.
 *
 * The page mounts both paths with a clickable avatar and a trailing icon
 * button. For each path and engine it asserts:
 *
 * 1. the reset: border 0px none, background transparent at rest, padding 0,
 *    appearance none, the 48×48 box and the 30×30 image;
 * 2. the hover layer: the background changes and matches the trailing icon's;
 * 3. the focus ring: 3px solid Secondary at +2px on a control that matches
 *    :focus-visible.
 *
 * On main the element path keeps the UA button, so this fails there. Run on
 * main and on the branch:
 *
 *   bun run scripts/check-search-avatar.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium, webkit, type Browser, type Page } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";
import { settle } from "./browser-settle";

const bundle = await Bun.build({
  entrypoints: [resolve("scripts/search-avatar-entry.ts")],
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
// The shadow root adopts these two sheets: the search's component CSS and the
// ripple base a shadow tree does not inherit (src/elements/define.ts).
const sheets = {
  search: sass.compileString(`@use "components/search";`, sassOptions()).css,
  ripple: sass.compileString(`@use "utilities/ripple";`, sassOptions()).css,
};

const avatarContent = `<img alt="" width="30" height="30" src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'><circle cx='15' cy='15' r='15' fill='%23625B71'/></svg>">`;
// An avatar whose content reads currentColor: the state layer must not repaint it.
const currentColorAvatar = `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="15" fill="currentColor"></circle></svg>`;
const trailingIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"></path></svg>`;

const manifest = JSON.stringify({ avatarContent, currentColorAvatar, trailingIcon, sheets });

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/search.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    if (path === "/manifest.json") return new Response(manifest, { headers: { "Content-Type": "application/json" } });
    const avatarAttribute = avatarContent.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const iconAttribute = trailingIcon.replaceAll('"', "&quot;");
    const currentColorAttribute = currentColorAvatar.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;font-family:sans-serif;padding:40px;display:grid;gap:40px;justify-items:start}</style></head>
<body>
<div id="factory"></div>
<div id="factory-current"></div>
<m-search id="element" aria-label="Search" avatar="${avatarAttribute}" avatar-label="Account" trailing-icon="${iconAttribute}"></m-search>
<m-search id="element-current" aria-label="Search" avatar="${currentColorAttribute}" avatar-label="Account"></m-search>
<button id="reference" type="button">Reference</button>
<script type="module">
import "/search.js";
const m = await (await fetch("/manifest.json")).json();
const { registerStyles, defineSearch, createSearch } = window;
registerStyles(m.sheets);
defineSearch();
const scope = (which) => which === "factory"
  ? document.querySelector("#factory")
  : which === "factory-current"
    ? document.querySelector("#factory-current")
    : which === "element-current"
      ? document.querySelector("#element-current").shadowRoot
      : document.querySelector("#element").shadowRoot;
window.avatarOf = (which) => scope(which).querySelector(".mtrl-search__avatar");
window.trailingOf = (which) => scope(which).querySelector(".mtrl-search__trailing-icon");
window.toggleOf = (which) => scope(which).querySelector(".mtrl-search__leading-icon");
window.mountFactory = () => {
  for (const [host, content] of [["#factory", m.avatarContent], ["#factory-current", m.currentColorAvatar]]) {
    const search = createSearch({
      label: "Search",
      trailingItems: [
        { id: "settings", type: "icon", content: m.trailingIcon, ariaLabel: "Settings", onClick: () => {} },
        { id: "avatar", type: "avatar", content, ariaLabel: "Account", onClick: () => {} },
      ],
    });
    document.querySelector(host).append(search.element);
  }
};
window.ready = true;
</script>
</body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

type Reading = {
  box: { width: number; height: number };
  image: { width: number; height: number };
  border: { width: string; style: string };
  background: string;
  alpha: number;
  color: string;
  padding: { top: string; right: string; bottom: string; left: string };
  appearance: string;
  outline: { width: string; style: string; color: string; offset: string };
  focusVisible: boolean;
  active: boolean;
};

/* eslint-disable @typescript-eslint/no-explicit-any -- the page's helpers live on window. */
const readAvatar = async (page: Page, which: string): Promise<Reading> =>
  page.evaluate((which) => {
    const win = window as any;
    // The engines serialize a mix of currentColor two ways: rgba(0, 0, 0, 0)
    // and color(srgb 0 0 0 / 0). Read the alpha, not the spelling.
    const alphaOf = (value: string): number => {
      const slash = value.match(/\/\s*([\d.]+)\s*\)/);
      if (slash) return Number.parseFloat(slash[1]!);
      const parts = value.match(/rgba?\(([^)]+)\)/)?.[1]?.split(/[\s,/]+/).filter(Boolean);
      return parts && parts.length === 4 ? Number.parseFloat(parts[3]!) : 1;
    };
    const el = win.avatarOf(which) as HTMLElement;
    const cs = getComputedStyle(el);
    const image = el.firstElementChild as HTMLElement;
    const rect = el.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const root = el.getRootNode() as Document | ShadowRoot;
    return {
      box: { width: rect.width, height: rect.height },
      image: { width: imageRect.width, height: imageRect.height },
      border: { width: cs.borderTopWidth, style: cs.borderTopStyle },
      background: cs.backgroundColor,
      alpha: alphaOf(cs.backgroundColor),
      color: cs.color,
      padding: { top: cs.paddingTop, right: cs.paddingRight, bottom: cs.paddingBottom, left: cs.paddingLeft },
      appearance: cs.appearance,
      outline: { width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor, offset: cs.outlineOffset },
      focusVisible: el.matches(":focus-visible"),
      active: root.activeElement === el,
    };
  }, which);

const readTrailingIcon = async (page: Page, which: string): Promise<{ alpha: number; appearance: string }> =>
  page.evaluate((which) => {
    const win = window as any;
    const alphaOf = (value: string): number => {
      const slash = value.match(/\/\s*([\d.]+)\s*\)/);
      if (slash) return Number.parseFloat(slash[1]!);
      const parts = value.match(/rgba?\(([^)]+)\)/)?.[1]?.split(/[\s,/]+/).filter(Boolean);
      return parts && parts.length === 4 ? Number.parseFloat(parts[3]!) : 1;
    };
    const el = win.trailingOf(which) as HTMLElement;
    return { alpha: alphaOf(getComputedStyle(el).backgroundColor), appearance: getComputedStyle(el).appearance };
  }, which);

const readCurrentAvatar = async (page: Page, which: string): Promise<{ color: string; fill: string; border: string; box: { width: number; height: number }; image: { width: number; height: number } }> =>
  page.evaluate((which) => {
    const win = window as any;
    const el = win.avatarOf(which) as HTMLElement;
    const circle = el.querySelector("circle")!;
    const rect = el.getBoundingClientRect();
    const content = (el.firstElementChild as HTMLElement).getBoundingClientRect();
    return {
      color: getComputedStyle(el).color,
      fill: getComputedStyle(circle).fill,
      border: getComputedStyle(el).borderTopWidth,
      box: { width: rect.width, height: rect.height },
      image: { width: content.width, height: content.height },
    };
  }, which);

const referenceColor = async (page: Page): Promise<string> =>
  page.evaluate(() => getComputedStyle(document.querySelector("#reference")!).color);

const secondaryColor = async (page: Page): Promise<string> =>
  page.evaluate(() => {
    const probe = document.createElement("i");
    probe.style.color = "var(--mtrl-sys-color-secondary)";
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });

const centerOf = async (page: Page, which: string, part: "avatar" | "trailing" = "avatar"): Promise<{ x: number; y: number }> =>
  page.evaluate(({ which, part }) => {
    const win = window as any;
    const el = (part === "avatar" ? win.avatarOf(which) : win.trailingOf(which)) as HTMLElement;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, { which, part });

/** The settled reading: the shared helper, with this check's reading. */
const settleOn = <T>(page: Page, read: () => Promise<T>): Promise<T | undefined> => settle(page, { read });

const focusByKey = async (page: Page, which: string): Promise<boolean> => {
  // A key press first makes the next focus a keyboard one, so :focus-visible
  // matches; `focus({ focusVisible: true })` where the engine takes it.
  await page.keyboard.press("Tab");
  const focused = await page.evaluate((which) => {
    const win = window as any;
    const el = win.avatarOf(which) as HTMLElement;
    const options = { focusVisible: true } as unknown as FocusOptions;
    try {
      el.focus(options);
    } catch {
      el.focus();
    }
    if (!el.matches(":focus-visible")) el.focus();
    return el.matches(":focus-visible");
  }, which);
  if (focused) return true;
  // Fall back to walking the tab order to the control.
  for (let press = 0; press < 30; press += 1) {
    await page.keyboard.press("Tab");
    const reached = await page.evaluate((which) => {
      const win = window as any;
      const el = win.avatarOf(which) as HTMLElement;
      return (el.getRootNode() as Document | ShadowRoot).activeElement === el;
    }, which);
    if (reached) return true;
  }
  return false;
};

const run = async (browser: Browser, engine: string): Promise<string[]> => {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 800, height: 650 });
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  await page.evaluate(() => (window as unknown as { mountFactory: () => void }).mountFactory());
  await page.waitForFunction(() => {
    const host = document.querySelector("m-search") as HTMLElement & { shadowRoot: ShadowRoot | null };
    return !!document.querySelector("#factory .mtrl-search__avatar")
      && !!document.querySelector("#factory-current .mtrl-search__avatar")
      && !!host?.shadowRoot?.querySelector(".mtrl-search__avatar");
  });

  const secondary = await secondaryColor(page);
  const reference = await referenceColor(page);
  const referenceAppearance = await page.evaluate(() => getComputedStyle(document.querySelector("#reference")!).appearance);
  const rows: string[] = [];
  for (const which of ["element", "factory"] as const) {
    const rest = await readAvatar(page, which);
    assert.deepEqual(
      { width: rest.border.width, style: rest.border.style },
      { width: "0px", style: "none" },
      `${engine} ${which}: the avatar's border is reset (${rest.border.width} ${rest.border.style})`,
    );
    assert.equal(rest.alpha, 0, `${engine} ${which}: the avatar's background is transparent at rest (${rest.background})`);
    assert.deepEqual(
      rest.padding,
      { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      `${engine} ${which}: the avatar has no padding (${JSON.stringify(rest.padding)})`,
    );
    assert.equal(rest.appearance, "none", `${engine} ${which}: appearance is none (${rest.appearance})`);
    // The layer must not repaint supplied content that reads currentColor: the
    // avatar's own colour stays the button text it had, as a bare button shows.
    assert.equal(
      rest.color,
      reference,
      `${engine} ${which}: the avatar's colour is the button text, so an inline SVG keeps its resting colour (${rest.color} vs ${reference})`,
    );
    assert.deepEqual(rest.box, { width: 48, height: 48 }, `${engine} ${which}: the avatar keeps its 48x48 box (${rest.box.width}x${rest.box.height})`);
    assert.deepEqual(rest.image, { width: 30, height: 30 }, `${engine} ${which}: the image stays 30x30 (${rest.image.width}x${rest.image.height})`);

    // Hover: the state layer, the same one the trailing icon paints.
    const center = await centerOf(page, which);
    await page.mouse.move(center.x, center.y);
    const hover = await settleOn(page, () => readAvatar(page, which));
    await page.mouse.move(0, 0);
    await settleOn(page, () => readAvatar(page, which));
    const trailingCenter = await centerOf(page, which, "trailing");
    await page.mouse.move(trailingCenter.x, trailingCenter.y);
    const trailing = await settleOn(page, () => readTrailingIcon(page, which));
    await page.mouse.move(0, 0);
    await settleOn(page, () => readAvatar(page, which));
    assert.ok(hover.alpha > 0, `${engine} ${which}: the avatar paints a hover layer (${hover.background})`);
    // `appearance: none` is the avatar's: the icon buttons keep theirs.
    assert.equal(trailing.appearance, referenceAppearance, `${engine} ${which}: the trailing icon's appearance is untouched (${trailing.appearance} vs a bare button's ${referenceAppearance})`);
    assert.equal(
      hover.alpha,
      trailing.alpha,
      `${engine} ${which}: the avatar's hover layer is the trailing icon's (${hover.background} vs alpha ${trailing.alpha})`,
    );

    // The focus ring: 3px Secondary at +2.
    const focused = await focusByKey(page, which);
    assert.ok(focused, `${engine} ${which}: the avatar takes keyboard focus`);
    const focus = await readAvatar(page, which);
    assert.ok(focus.focusVisible && focus.active, `${engine} ${which}: the avatar is focused and focus-visible`);
    assert.deepEqual(
      { width: focus.outline.width, style: focus.outline.style, offset: focus.outline.offset },
      { width: "3px", style: "solid", offset: "2px" },
      `${engine} ${which}: the focus ring is 3px solid at +2 (${JSON.stringify(focus.outline)})`,
    );
    assert.equal(focus.outline.color, secondary, `${engine} ${which}: the focus ring is the Secondary role (${focus.outline.color} vs ${secondary})`);
    rows.push(
      `${engine} ${which}: box ${rest.box.width}x${rest.box.height}, image ${rest.image.width}x${rest.image.height}, border ${rest.border.width} ${rest.border.style}, rest ${rest.background}, hover ${hover.background}, padding ${rest.padding.top}, ring ${focus.outline.width} ${focus.outline.style} ${focus.outline.color} at ${focus.outline.offset}`,
    );
  }
  // An inline SVG avatar that reads currentColor keeps the colour it had on
  // main: the layer names its own token instead of colouring the content.
  for (const which of ["element-current", "factory-current"] as const) {
    const current = await readCurrentAvatar(page, which);
    assert.equal(current.border, "0px", `${engine} ${which}: the reset still applies (border ${current.border})`);
    assert.deepEqual(current.box, { width: 48, height: 48 }, `${engine} ${which}: the box is 48x48`);
    assert.deepEqual(current.image, { width: 30, height: 30 }, `${engine} ${which}: the SVG is 30x30`);
    assert.equal(current.color, reference, `${engine} ${which}: the avatar's colour is the button text (${current.color} vs ${reference})`);
    assert.equal(current.fill, reference, `${engine} ${which}: a currentColor SVG paints in the button text (${current.fill} vs ${reference})`);
    rows.push(`${engine} ${which}: currentColor SVG fill ${current.fill}, button colour ${current.color}, border ${current.border}`);
  }
  await page.close();
  return rows;
};

const results: string[] = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try { results.push(...await run(chromiumBrowser, "chromium")); } finally { await chromiumBrowser.close(); }
let webkitBrowser: Browser | null = null;
try { webkitBrowser = await webkit.launch({ headless: true }); } catch { console.log("search avatar: WebKit not installed here, skipped"); }
if (webkitBrowser) {
  try { results.push(...await run(webkitBrowser, "webkit")); } finally { await webkitBrowser.close(); }
}
server.stop(true);
for (const row of results) console.log(row);
console.log("Search avatar check passed.");
