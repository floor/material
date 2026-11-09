#!/usr/bin/env bun
/** Packed public entries, styled input, deterministic network gates. Build in CI first. */
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { build } from "vite";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";
import { chromium, type Page, type Route } from "playwright";
import { createPackageFixture, run } from "./package-fixture";
import type { DeferredMenuComponent, DeferredMenuConfig } from "../src/components/menu/deferred";
import type { MenuComponent } from "../src/components/menu/types";
import type { MenuElement } from "../src/elements/menu";

interface Lab {
  menu: DeferredMenuComponent;
  createDeferredMenu(config: DeferredMenuConfig): DeferredMenuComponent;
  createEagerMenu(config: Omit<DeferredMenuConfig, "on">): Promise<MenuComponent>;
  events: unknown[][];
  errors: string[];
  host: MenuElement;
  prefix: string;
  load(): Promise<string>;
}
const fixture = await createPackageFixture();
await mkdir("tmp", { recursive: true });
const scratch = await mkdtemp(resolve("tmp/menu-deferred-"));
await mkdir(join(scratch, "node_modules"));
await symlink(fixture.installed, join(scratch, "node_modules/material"), "dir");
const sources = resolve("scripts/fixtures/menu-deferred");
const cases = ["factory", "eager", "element", "diagnostic"] as const;
const outputs = new Map<string, { directory: string; gates: string[]; initial: string[] }>();
const artifacts = resolve("analysis/browser/menu-deferred");
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results: string[] = [];
try {
  // Resolve the actual packed export map on Node with no synthetic globals.
  const probe = join(fixture.directory, "deferred-import.mjs");
  await writeFile(probe, `import assert from 'node:assert/strict';
import * as factory from 'material/components/menu/deferred';
import * as elements from 'material/elements/menu';
assert.equal(typeof document, 'undefined');
assert.equal(typeof factory.createDeferredMenu, 'function');
assert.deepEqual(Object.keys(elements).sort(), ['defineMenu','menuElement','menuItemDeclaration']);
const {renderElement} = await import('material/ssr');
const {preupgradeStyles} = await import('material/elements/preupgrade');
console.log(JSON.stringify({customPreupgrade:preupgradeStyles('lazy-test'),closed:renderElement('m-menu',{anchor:'opener'},'<m-menu-item value="one">One</m-menu-item>'),
  nested:renderElement('m-menu',{},'<m-menu-item value="parent">Parent<m-menu-item value="child">Child</m-menu-item></m-menu-item>')}));`);
  const ssr = JSON.parse(await run(["node", probe], fixture.directory)) as { closed: string; nested: string; customPreupgrade: string };
  assert(ssr.closed.includes('shadowrootmode="open"'), "closed SSR keeps declarative content");
  // Nested menus retain the existing eager client fallback; this entry adds no SSR hook.
  assert(!ssr.nested.includes('shadowrootmode="open"'), "nested SSR fallback changed");
  for (const kind of cases) {
    const directory = join(scratch, kind);
    await mkdir(directory);
    for (const name of [kind, "broker"]) await copyFile(join(sources, `${name}.js`), join(directory, `${name}.js`));
    if (kind === "diagnostic") await writeFile(join(directory, "baseline-helper.js"),
      `export { createOnDemandMenu } from ${JSON.stringify(join(fixture.installed, "components/menu/on-demand.js"))};`);
    const style = kind === "element" ? 'material/elements/preupgrade/menu.css' : 'material/styles/menu';
    await writeFile(join(directory, "index.html"), `<!doctype html><html data-theme="baseline" data-theme-mode="light"><head>
<script>window.defined=[]; const define=customElements.define.bind(customElements);customElements.define=(name,...args)=>{window.defined.push(name);return define(name,...args)};</script>
</head><body><button id="opener">Actions</button><button id="other">Outside</button>
<script type="module">import 'material/styles/base'; import '${style}'; import './${kind}.js';</script></body></html>`);
    const result = await build({ root: directory, base: "./", configFile: false, envFile: false, logLevel: "error",
      build: { outDir: join(directory, "out"), sourcemap: "hidden", minify: true, cssMinify: true, modulePreload: { polyfill: false } } });
    assert(!Array.isArray(result) && "output" in result);
    const chunks = result.output.filter(item => item.type === "chunk");
    const chunkInventory = chunks.map(chunk => ({ file: chunk.fileName,
      modules: [...new Set([...Object.keys(chunk.modules), ...chunk.moduleIds])], sources: chunk.map?.sources ?? [] }));
    await writeFile(join(artifacts, `chunks-${kind}.json`), JSON.stringify(chunkInventory, null, 2));
    const gates = chunkInventory.filter(chunk => [...chunk.modules, ...chunk.sources].some(id =>
      /components\/menu\/features\/controller(?:\.[cm]?[jt]s)?(?:\?.*)?$/.test(id))).map(chunk => chunk.file);
    assert(gates.length, `${kind}: menu controller chunk missing`);
    const initial = new Set<string>();
    const htmlAsset = result.output.find(item => item.fileName === "index.html");
    assert(htmlAsset?.type === "asset");
    const html = String(htmlAsset.source);
    for (const match of html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)) initial.add(match[1]);
    const visit = (file: string): void => {
      const chunk = chunks.find(item => item.fileName === file);
      for (const imported of chunk?.imports ?? []) if (!initial.has(imported)) { initial.add(imported); visit(imported); }
    };
    for (const file of [...initial]) visit(file);
    if (kind !== "eager") assert(gates.every(file => !initial.has(file)), `${kind}: controller leaked into initial graph`);
    outputs.set(kind, { directory: join(directory, "out"), gates, initial: [...initial] });
  }
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
    const url = new URL(request.url);
    const [, kind, ...parts] = url.pathname.split("/");
    const output = outputs.get(kind);
    if (!output || parts.some(part => part === "..")) return new Response("missing", { status: 404 });
    const file = parts.join("/") || "index.html";
    if (file === "index.html") {
      let html = await readFile(join(output.directory, file), "utf8");
      if (url.searchParams.has("ssr")) html = html.replace("</body>", `${ssr.closed}</body>`);
      if (url.searchParams.get("prefix") === "lazy-test") html = html.replace("</head>", `<style>${ssr.customPreupgrade}</style></head>`);
      return new Response(html, { headers: { "content-type": "text/html" } });
    }
    return new Response(Bun.file(join(output.directory, file)));
  } });
  try {
    const fresh = async (kind = "factory", query = "") => {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(String(error)));
      page.on("console", message => { if (/has no CSS|missing CSS|A listener .* threw/i.test(message.text())) errors.push(message.text()); });
      const waiting: Route[] = [];
      let unlocked = false;
      const gateFiles = outputs.get(kind)!.gates;
      await page.route("**/*", async route => {
        const path = new URL(route.request().url()).pathname;
        if (kind !== "eager" && !unlocked && gateFiles.some(file => path.endsWith(`/${file}`))) waiting.push(route);
        else await route.continue();
      });
      await page.goto(`${server.url}${kind}/?${query}`);
      await page.waitForSelector('body[data-ready="true"]');
      if (!query.includes("initial")) assert.equal(waiting.length, 0, "implementation requested without intent");
      const release = async (fail = false) => {
        await page.waitForFunction(() => true); // drain the current input dispatch, never a timing sleep
        await assertEventually(() => waiting.length > 0, "no menu implementation request");
        unlocked = true;
        for (const route of waiting.splice(0)) {
          if (fail) await route.abort("failed"); else await route.continue();
        }
      };
      const finish = async () => { assert.deepEqual(errors, []); await context.close(); };
      return { page, waiting, release, finish };
    };
    // Measured behavioral baseline, rather than a meaningless missing-import red.
    // The private helper remains unchanged; it supports its owning components,
    // but never promised this new public API's cold-delivery contract.
    {
      const { page, release, finish } = await fresh("diagnostic");
      const before = await page.evaluate(() => {
        const menu = (window as unknown as { lab: { menu: DeferredMenuComponent } }).lab.menu;
        const result = { elementIsNull: menu.element === null, hasOff: typeof menu.off === "function" };
        menu.open();
        return { ...result, expanded: document.querySelector("#opener")?.getAttribute("aria-expanded"),
          preloadIsPromise: menu.preload() instanceof Promise };
      });
      assert.deepEqual(before, { elementIsNull: false, hasOff: false, expanded: "true", preloadIsPromise: false });
      await release();
      await page.waitForSelector(".mtrl-menu--visible");
      results.push("unchanged private helper: four absent public guarantees recorded");
      await finish();
    }
    for (const kind of ["factory", "eager"]) for (const gesture of ["click", "Enter", "Space", "ArrowDown", "ArrowUp"]) {
      const { page, release, finish } = await fresh(kind);
      await page.locator("#opener").focus();
      if (gesture === "click") await page.locator("#opener").click();
      else await page.locator("#opener").press(gesture);
      if (kind === "factory") {
        assert.deepEqual(await page.evaluate(() => {
          const menu = (window as unknown as { lab: Lab }).lab.menu;
          const opener = document.querySelector("#opener")!;
          return [menu.isOpen(), menu.isReady(), menu.element, opener.getAttribute("aria-expanded"),
            opener.getAttribute("aria-busy"), opener.hasAttribute("aria-controls"), document.activeElement?.id];
        }), [true, false, null, "false", "true", false, "opener"]);
        await release();
      }
      await shown(page, gesture);
      await page.getByRole("menu").first().getByRole("menuitem", { name: "Disabled" }).evaluate(item => {
        if (item.getAttribute("aria-disabled") !== "true") throw new Error("disabled item lost state");
      });
      if (kind === "factory") assert.deepEqual(await page.evaluate(() => (window as unknown as { lab: Lab }).lab.events), [["open", true]]);
      results.push(`${kind} ${gesture} focus/ARIA/style`);
      await finish();
    }
    for (const action of ["close", "Escape", "Tab", "outside", "toggle", "replace", "remove", "disable", "destroy", "reopen"]) {
      const { page, release, finish } = await fresh();
      await page.locator("#opener").click();
      if (action === "Escape" || action === "Tab") await page.keyboard.press(action);
      else if (action === "outside") await page.locator("#other").click();
      else await page.evaluate(action => {
        const menu = (window as unknown as { lab: Lab }).lab.menu;
        if (action === "close") menu.close(undefined, false);
        if (action === "toggle") menu.toggle();
        if (action === "replace") menu.setOpener("#other");
        if (action === "remove") menu.getOpener().remove();
        if (action === "disable") (menu.getOpener() as HTMLButtonElement).disabled = true;
        if (action === "destroy") menu.destroy();
        if (action === "reopen") menu.close().open(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      }, action);
      await release();
      if (action === "reopen") await shown(page, "ArrowUp");
      else {
        await page.evaluate(async () => {
          const menu = (window as unknown as { lab: Lab }).lab.menu;
          try { await menu.preload(); } catch (error) { if ((error as Error).name !== "AbortError") throw error; }
        });
        assert.deepEqual(await page.evaluate(() => {
          const menu = (window as unknown as { lab: Lab }).lab.menu;
          return [menu.isOpen(), !!menu.element?.isConnected, document.querySelector(".mtrl-menu--visible") !== null];
        }), [false, false, false]);
      }
      results.push(`cold ${action}`); await finish();
    }
    // preload is a real promise boundary, with no open event or focus change.
    {
      const { page, release, finish } = await fresh();
      await page.locator("#opener").focus();
      await page.evaluate(() => {
        const { menu } = (window as unknown as { lab: Lab }).lab;
        const first = menu.preload();
        if (first !== menu.preload()) throw new Error("preload did not coalesce");
      });
      await release();
      await page.evaluate(async () => { await (window as unknown as { lab: Lab }).lab.menu.preload(); });
      assert.deepEqual(await page.evaluate(() => {
        const { menu, events } = (window as unknown as { lab: Lab }).lab;
        return [menu.isReady(), menu.isOpen(), menu.element?.isConnected, events.length, document.activeElement?.id];
      }), [true, false, false, 0, "opener"]);
      results.push("preload closed/no focus"); await finish();
    }
    {
      const { page, release, finish } = await fresh();
      await page.evaluate(() => {
        const state = (window as unknown as { lab: Lab }).lab;
        const { menu } = state;
        const removed = () => { throw new Error("off handler survived"); };
        menu.on("select", removed).off("select", removed);
        menu.setItems([{ id: "one", text: "One", data: { answer: 42 } }]).setPosition("top-end").setSelected("one");
        menu.on("select", event => {
          if (event.menu !== menu || event.value !== "one" || event.itemId !== "one") throw new Error("selection identity");
          if ((event.itemData as { answer: number }).answer !== 42) throw new Error("item data");
          event.preventDefault();
        });
        menu.on("select", event => { state.events.push(["select", event.menu === menu, event.defaultPrevented]); });
        menu.open();
      });
      await release();
      await page.evaluate(async () => { await (window as unknown as { lab: Lab }).lab.menu.preload(); });
      await page.getByRole("menuitem", { name: "One" }).click();
      assert.deepEqual(await page.evaluate(() => {
        const { menu, events } = (window as unknown as { lab: Lab }).lab;
        return [menu.isOpen(), menu.getPosition(), menu.getSelected(), events];
      }), [true, "top-end", "one", [["open", true], ["select", true, true]]]);
      results.push("queued setters/on-off/live selection identity and cancellation"); await finish();
    }
    {
      const { page, release, finish } = await fresh();
      await page.evaluate(() => {
        const state = (window as unknown as { lab: Lab & { second: DeferredMenuComponent } }).lab;
        state.second = state.createDeferredMenu({ opener: "#other", items: [{ id: "other", text: "Other" }] });
        state.menu.open(); state.second.open();
      });
      await release();
      await page.evaluate(async () => {
        const state = (window as unknown as { lab: Lab & { second: DeferredMenuComponent } }).lab;
        await Promise.all([state.menu.preload(), state.second.preload()]);
        if (state.menu.isOpen() || !state.second.isOpen() || state.menu.element?.isConnected) throw new Error("pending ownership");
        const eager = await state.createEagerMenu({ opener: "#opener", items: [] });
        eager.open();
        if (state.second.isOpen() || !eager.isOpen()) throw new Error("eager ownership");
        state.menu.open();
        if (eager.isOpen() || !state.menu.isOpen()) throw new Error("deferred ownership");
        eager.destroy(); state.second.destroy();
      });
      results.push("two handles share code but keep state; eager/pending registry ownership"); await finish();
    }
    {
      const { page, release, finish } = await fresh();
      await page.locator("#opener").press("ArrowDown");
      await page.locator("#opener").press("ArrowUp");
      await release(); await shown(page, "ArrowUp");
      assert.deepEqual(await page.evaluate(() => (window as unknown as { lab: Lab }).lab.events), [["open", true]]);
      results.push("later cold arrow updates focus intent without activation"); await finish();
    }
    {
      const { page, release, finish } = await fresh();
      await page.evaluate(() => {
        const opener = document.querySelector("#opener")!;
        const dialog = document.createElement("dialog");
        opener.replaceWith(dialog); dialog.append(opener); dialog.showModal();
      });
      await page.locator("#opener").click();
      await page.locator("dialog").evaluate(dialog => (dialog as HTMLDialogElement).close());
      await release();
      await page.evaluate(async () => {
        const { menu } = (window as unknown as { lab: Lab }).lab;
        await menu.preload();
        if (menu.isOpen() || menu.element?.isConnected) throw new Error("closed dialog received a late menu");
      });
      results.push("containing dialog close cancels cold request"); await finish();
    }
    // A construction failure clears the slot; an explicit retry uses current items.
    {
      const { page, release, finish } = await fresh();
      await page.evaluate(() => {
        const { menu } = (window as unknown as { lab: Lab }).lab;
        menu.setItems([{ get id(): string { throw new Error("synthetic construction failure"); }, text: "Broken" }]);
        menu.open();
      });
      await release();
      await page.waitForFunction(() => (window as unknown as { lab: Lab }).lab.events.some(row => row[0] === "loaderror"));
      assert.deepEqual(await page.evaluate(() => (window as unknown as { lab: Lab }).lab.events.map(row => row[0])), ["open", "close", "loaderror"]);
      await page.evaluate(async () => {
        const { menu } = (window as unknown as { lab: Lab }).lab;
        menu.setItems([{ id: "one", text: "One" }]);
        await menu.preload(); menu.open();
      });
      await page.waitForSelector(".mtrl-menu--visible");
      assert.deepEqual(await page.evaluate(() => (window as unknown as { lab: Lab }).lab.errors), []);
      results.push("construction failure/order/explicit retry"); await finish();
    }
    {
      const { page, release, finish } = await fresh();
      await page.locator("#opener").click();
      await release(true);
      await page.waitForFunction(() => (window as unknown as { lab: Lab }).lab.events.some(row => row[0] === "loaderror"));
      assert.deepEqual(await page.evaluate(() => {
        const { menu, events, errors } = (window as unknown as { lab: Lab }).lab;
        return [menu.isOpen(), menu.isReady(), events.map(row => row[0]), errors];
      }), [false, false, ["open", "close", "loaderror"], []]);
      results.push("network failure/order/no unhandled rejection"); await finish();
    }
    for (const prefix of ["m", "lazy-test"]) for (const gesture of ["click", "ArrowUp"]) {
      const { page, release, finish } = await fresh("element", `prefix=${prefix}`);
      assert.equal(await page.locator(`${prefix}-menu`).evaluate(host => getComputedStyle(host).display), "none");
      if (gesture === "click") await page.locator("#opener").click(); else await page.locator("#opener").press(gesture);
      assert.equal(await page.evaluate(prefix => customElements.get(`${prefix}-menu`) === undefined, prefix), true);
      await release();
      await page.waitForFunction(() => (window as unknown as { lab: Lab }).lab.host.open);
      assert.deepEqual(await page.evaluate(() => (window as unknown as { lab: Lab }).lab.events), ["open"]);
      assert.equal(await page.evaluate(prefix => {
        const order = (window as unknown as { defined: string[] }).defined;
        return order.indexOf(`${prefix}-menu-item`) < order.indexOf(`${prefix}-menu`);
      }, prefix), true);
      assert.equal(await page.locator("#opener").getAttribute("aria-controls"), null, "cross-shadow IDREF added");
      results.push(`element ${prefix} ${gesture} once/registration order`); await finish();
    }
    {
      const { page, release, finish } = await fresh("element");
      await page.evaluate(() => { void (window as unknown as { lab: Lab }).lab.load(); });
      await release();
      await page.evaluate(async () => { await (window as unknown as { lab: Lab }).lab.load(); });
      await page.locator("#opener").click();
      await page.waitForFunction(() => (window as unknown as { lab: Lab }).lab.host.open);
      assert.deepEqual(await page.evaluate(() => {
        const { host, events } = (window as unknown as { lab: Lab }).lab;
        return [host.anchor === document.querySelector("#opener"), events];
      }), [true, ["open"]]);
      results.push("element explicit preload hands off warm anchor once/own anchor retained"); await finish();
    }
    // Browser cancellation semantics are exercised against actual cold inputs.
    for (const action of ["Escape", "Tab", "outside", "toggle", "remove"]) {
      const { page, release, finish } = await fresh("element");
      await page.locator("#opener").click();
      if (action === "Escape" || action === "Tab") await page.keyboard.press(action);
      else if (action === "outside") await page.locator("#other").click();
      else if (action === "toggle") await page.locator("#opener").click();
      else await page.locator("m-menu").evaluate(host => host.remove());
      await release();
      await page.evaluate(async () => { await (window as unknown as { lab: Lab }).lab.load(); });
      assert.deepEqual(await page.evaluate(() => {
        const { host, events, errors } = (window as unknown as { lab: Lab }).lab;
        return [host.open, events, errors];
      }), [false, [], []]);
      results.push(`element cold ${action} cancels`); await finish();
    }
    {
      const { page, release, finish } = await fresh("element", "ssr");
      assert.equal(await page.evaluate(() => !!(window as unknown as { lab: Lab }).lab.host.shadowRoot), true);
      await page.evaluate(() => { void (window as unknown as { lab: Lab }).lab.load(); });
      await release();
      await page.evaluate(async () => { await (window as unknown as { lab: Lab }).lab.load(); });
      assert.deepEqual(await page.evaluate(() => {
        const state = (window as unknown as { lab: Lab & { shadowBefore: ShadowRoot } }).lab;
        return [state.host.shadowRoot === state.shadowBefore, state.host.open, state.events.length,
          !!state.host.shadowRoot?.querySelector("style,link"), state.host.querySelectorAll("m-menu-item").length];
      }), [true, false, 0, true, 1]);
      results.push("closed SSR keeps root/styles/children and quiet state"); await finish();
    }
    // Initially open own state starts registration eagerly and upgrades quietly.
    {
      const { page, release, finish } = await fresh("element", "initial");
      await release();
      await page.waitForFunction(() => customElements.get("m-menu") !== undefined);
      assert.deepEqual(await page.evaluate(() => {
        const { host, events, errors } = (window as unknown as { lab: Lab }).lab;
        return [host.open, events, errors];
      }), [true, [], []]);
      results.push("initial open uses eager registration and quiet own-property upgrade"); await finish();
    }
    // Same pinned Vite/HTML build, minified JS/CSS and static closure for all
    // four 16-component consumers. Every emitted shared/dynamic asset counts
    // once in full, including the facade, broker and delayed shadow CSS.
    const sizes: Record<string, { initial: number; full: number; initialBrotli: number; fullBrotli: number }> = {};
    const families = ["button", "text-field", "checkbox", "switch", "radios", "select", "dialog", "menu", "tabs", "list", "chips", "progress", "icon-button", "fab", "slider", "divider"];
    for (const mode of ["factories", "elements"]) for (const delivery of (mode === "elements" ? ["eager", "deferred", "barrel"] : ["eager", "deferred"])) {
      const name = `${mode}-${delivery}`;
      const directory = join(scratch, name);
      await mkdir(directory);
      for (const file of [`app-${mode}`, "broker"]) await copyFile(join(sources, `${file}.js`), join(directory, `${file}.js`));
      if (delivery === "barrel") {
        const broker = await readFile(join(directory, "broker.js"), "utf8");
        await writeFile(join(directory, "broker.js"), broker.replace("'material/elements/menu'", "'material/elements'"));
      }
      let main = "import 'material/styles/base';\n";
      if (mode === "factories") {
        main += families.map(family => `import 'material/styles/${family}';`).join("\n");
        main += `\nimport {mount} from './app-factories.js';\n`;
        main += delivery === "eager" ? "import createMenu from 'material/components/menu';\n"
          : "import createMenu from 'material/components/menu/deferred';\n";
        main += "window.menu=createMenu({opener:mount(),items:[{id:'one',text:'One'}]});";
      } else {
        main += families.filter(family => family !== "menu" || delivery === "eager")
          .map(family => `import 'material/elements/css/${family}';`).join("\n");
        main += "\nimport 'material/elements/preupgrade/menu.css';\nimport {mount} from './app-elements.js';\n";
        main += delivery === "eager" ? "import {defineMenu} from 'material/elements/menu';defineMenu();mount();"
          : "import {menuLoader,brokerMenu} from './broker.js';const {anchor,host}=mount();brokerMenu(anchor,host,menuLoader('m'),console.error);";
      }
      await writeFile(join(directory, "main.js"), main);
      await writeFile(join(directory, "index.html"), '<!doctype html><html><body><script type="module" src="./main.js"></script></body></html>');
      const measured = await build({ root: directory, configFile: false, envFile: false, logLevel: "error",
        build: { outDir: join(directory, "out"), minify: true, cssMinify: true, modulePreload: { polyfill: false } } });
      assert(!Array.isArray(measured) && "output" in measured);
      const html = measured.output.find(file => file.fileName === "index.html");
      assert(html?.type === "asset");
      const initial = new Set([...String(html.source).matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map(match => match[1]));
      const visit = (name: string): void => {
        const chunk = measured.output.find(file => file.fileName === name);
        if (chunk?.type !== "chunk") return;
        // Vite extracts CSS beside a JS chunk; HTML references initial CSS.
        const metadata = chunk as typeof chunk & { viteMetadata?: { importedCss?: Set<string> } };
        for (const imported of [...chunk.imports, ...metadata.viteMetadata?.importedCss ?? []]) {
          if (!initial.has(imported)) { initial.add(imported); visit(imported); }
        }
      };
      for (const file of [...initial]) visit(file);
      const assets = measured.output.filter(file => /\.(js|css)$/.test(file.fileName)).map(file => {
        const source = file.type === "chunk" ? file.code : file.source;
        const bytes = typeof source === "string" ? Buffer.from(source) : Buffer.from(source);
        return { file: file.fileName, initial: initial.has(file.fileName),
          gzip: gzipSync(bytes, { level: 9 }).length,
          brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length };
      });
      sizes[name] = { initial: assets.filter(file => file.initial).reduce((sum, file) => sum + file.gzip, 0),
        full: assets.reduce((sum, file) => sum + file.gzip, 0),
        initialBrotli: assets.filter(file => file.initial).reduce((sum, file) => sum + file.brotli, 0),
        fullBrotli: assets.reduce((sum, file) => sum + file.brotli, 0) };
      await writeFile(join(artifacts, `${name}.json`), JSON.stringify({ ...sizes[name], assets, initial: [...initial] }, null, 2));
    }
    for (const mode of ["factories", "elements"]) {
      console.log(`${mode} initial gzip ${sizes[`${mode}-eager`].initial} -> ${sizes[`${mode}-deferred`].initial}; fully loaded ${sizes[`${mode}-eager`].full} -> ${sizes[`${mode}-deferred`].full}`);
      assert(sizes[`${mode}-deferred`].initial < sizes[`${mode}-eager`].initial, `${mode}: complete deferred fixture saves no initial bytes`);
    }
    console.log(`Ad-hoc element barrel loader initial gzip: ${sizes["elements-barrel"].initial}; dedicated entry: ${sizes["elements-deferred"].initial}`);
    await writeFile(join(artifacts, "sizes.json"), JSON.stringify({ sizes, vite: "8.2.2", node: process.version }, null, 2));
    await writeFile(join(artifacts, "results.json"), JSON.stringify({ results, outputs: Object.fromEntries(outputs) }, null, 2));
    console.log(`Deferred menu: ${results.length} packed styled cases passed`);
  } finally { server.stop(true); }
} finally { await browser.close(); await fixture.cleanup(); }

async function shown(page: Page, gesture: string): Promise<void> {
  await page.waitForSelector(".mtrl-menu--visible");
  await page.waitForFunction(gesture => {
    const menu = (window as unknown as { lab: { menu: MenuComponent } }).lab.menu;
    const active = document.activeElement;
    return gesture === "click" ? active === menu.element : active?.getAttribute("data-id") === (gesture === "ArrowUp" ? "last" : "one");
  }, gesture);
  assert.equal(await page.getByRole("menu", { name: "Actions" }).first().evaluate(menu => getComputedStyle(menu).position), "absolute");
}
async function assertEventually(check: () => boolean, message: string): Promise<void> {
  // Request routing is asynchronous on the Node side; wait on its own event loop,
  // bounded by a deadline, rather than giving the browser a timing grace period.
  const until = Date.now() + 5000;
  while (!check()) {
    assert(Date.now() < until, message);
    await new Promise<void>(resolve => setImmediate(resolve));
  }
}
