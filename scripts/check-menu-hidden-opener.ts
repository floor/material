#!/usr/bin/env bun
/** A real deferred import gate: hiding an ancestor must cancel before delivery. */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import * as sass from "sass";
import type { DeferredMenuComponent } from "../src/components/menu/deferred";

interface Lab { menu: DeferredMenuComponent; panel: HTMLElement; other: HTMLButtonElement; events: string[] }
declare global { interface Window { hiddenOpenerLab: Lab; createTestMenu: typeof import("../src/components/menu/deferred").default } }

const built = await Bun.build({
  entrypoints: ["hidden-opener-entry"], target: "browser", splitting: true, outdir: "analysis/menu-hidden-opener/bundle",
  plugins: [{ name: "entry", setup(build) {
    build.onResolve({ filter: /^hidden-opener-entry$/ }, () => ({ path: "entry", namespace: "probe" }));
    build.onLoad({ filter: /.*/, namespace: "probe" }, () => ({ loader: "js",
      contents: `import create from ${JSON.stringify(resolve("src/components/menu/deferred.ts"))}; window.createTestMenu = create;` }));
  } }],
});
assert(built.success, String(built.logs));
const assets = new Map(await Promise.all(built.outputs.map(async file => ["/" + file.path.split("/").at(-1), await file.text()] as const)));
const css = sass.compileString('@use "components/menu";', { loadPaths: [resolve("src/styles")], logger: sass.Logger.silent }).css;
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
  const path = new URL(request.url).pathname;
  if (assets.has(path)) return new Response(assets.get(path), { headers: { "content-type": "text/javascript" } });
  return new Response(`<!doctype html><style>${css}.gone{display:none}</style><script type="module" src="/hidden-opener-entry.js"></script>`,
    { headers: { "content-type": "text/html" } });
} });
const browser = await chromium.launch({ headless: true });
const rows: unknown[] = [];
try {
  for (const mode of ["inline", "class", "shadow-inner", "shadow-outer", "contents"] as const) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    try {
      await page.goto(server.url.href);
      await page.waitForFunction(() => typeof window.createTestMenu === "function");
      // Startup has finished; only the deferred implementation remains to load.
      await page.route("**/*.js", async route => { await gate; await route.continue(); });
      const pending = await page.evaluate(mode => {
        const outer = document.createElement("div");
        const panel = document.createElement("div");
        const opener = document.createElement("button"); opener.textContent = "Actions";
        panel.append(opener); outer.append(panel); document.body.append(outer);
        if (mode.startsWith("shadow")) {
          outer.attachShadow({ mode: "open" }).append(panel);
        }
        if (mode === "contents") panel.style.display = "contents";
        const other = document.createElement("button"); other.textContent = "Other";
        document.body.append(other); other.focus();
        const events: string[] = [];
        const menu = window.createTestMenu({ opener, items: [{ id: "one", text: "One" }],
          on: { open: () => events.push("open"), close: () => events.push("close") } });
        menu.open(undefined, "keyboard");
        const hidden = mode === "shadow-outer" ? outer : panel;
        window.hiddenOpenerLab = { menu, panel: hidden, other, events };
        if (mode === "class") hidden.className = "gone";
        else if (mode !== "contents") hidden.style.display = "none";
        return { busy: opener.getAttribute("aria-busy"), open: menu.isOpen() };
      }, mode);
      assert.deepEqual(pending, { busy: "true", open: true });
      await page.waitForFunction(() => true); // mutation delivery, without releasing the chunk
      const cancelled = await page.evaluate(() => {
        const { menu, other, events } = window.hiddenOpenerLab;
        return { open: menu.isOpen(), busy: menu.getOpener().getAttribute("aria-busy"),
          focused: document.activeElement === other, events };
      });
      // Release even when the assertion below fails, so the context can shut down.
      release();
      if (mode !== "contents") assert.deepEqual(cancelled,
        { open: false, busy: null, focused: true, events: ["open", "close"] }, `${mode}: hidden ancestor retained pending open`);
      await page.evaluate(() => window.hiddenOpenerLab.menu.preload());
      await page.waitForTimeout(160); // include the ordinary menu's delayed focus task
      const settled = await page.evaluate(() => {
        const { menu, other, events } = window.hiddenOpenerLab;
        return { open: menu.isOpen(), connected: !!menu.element?.isConnected,
          expanded: menu.getOpener().getAttribute("aria-expanded"), busy: menu.getOpener().getAttribute("aria-busy"),
          focused: document.activeElement === other, events };
      });
      if (mode !== "contents") {
        assert.deepEqual(settled, { open: false, connected: false, expanded: "false", busy: null,
          focused: true, events: ["open", "close"] }, `${mode}: late delivery painted or stole focus`);
        await page.evaluate(() => {
          const { panel, menu } = window.hiddenOpenerLab;
          panel.style.display = ""; panel.className = ""; menu.open(undefined, "keyboard");
        });
      }
      await page.waitForFunction(() => window.hiddenOpenerLab.menu.element?.isConnected);
      assert.equal(await page.evaluate(() => window.hiddenOpenerLab.menu.isOpen()), true, `${mode}: visible opener cannot reopen`);
      assert.deepEqual(errors, []);
      rows.push({ mode, cancelled, settled });
    } finally { release(); await context.close(); }
  }
} finally { await browser.close(); server.stop(true); }
await mkdir("analysis/menu-hidden-opener", { recursive: true });
await Bun.write("analysis/menu-hidden-opener/results.json", JSON.stringify(rows, null, 2) + "\n");
console.log(`menu-hidden-opener: ${rows.length} browser rows passed (cancellation, late delivery, focus, ARIA and visible reopen)`);
