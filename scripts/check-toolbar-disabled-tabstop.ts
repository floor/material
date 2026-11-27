#!/usr/bin/env bun
/** Disabled-state changes must not remove a live toolbar from real Tab order. */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { launchChromium } from "./browser-profile";
import { settle } from "./browser-settle";
import * as sass from "sass";
import { baseStyles, componentStyles, resolveStyleDependencies } from "./style-manifest";
import type createToolbar from "../src/components/toolbar";

interface Lab { create: typeof createToolbar; destroy(): void }
declare global { interface Window { disabledTabstop: Lab } }
const artifacts = "analysis/toolbar-disabled-tabstop";
await mkdir(artifacts, { recursive: true });
const compile = (sources: string[]) => sass.compileString(sources.map((s, i) => `@use "${s}" as sheet${i};`).join("\n"),
  { loadPaths: [resolve("src/styles")], logger: sass.Logger.silent }).css;
const registry = Object.fromEntries(resolveStyleDependencies(["toolbar", "button"]).map(name =>
  [name, compile([componentStyles[name]!.source])]));
const built = await Bun.build({ entrypoints: ["toolbar-tabstop-entry"], target: "browser", outdir: `${artifacts}/bundle`,
  plugins: [{ name: "entry", setup(build) {
    build.onResolve({ filter: /^toolbar-tabstop-entry$/ }, () => ({ path: "entry", namespace: "probe" }));
    build.onLoad({ filter: /.*/, namespace: "probe" }, () => ({ loader: "js", contents: `
import create from ${JSON.stringify(resolve("src/components/toolbar/index.ts"))};
import {defineToolbar} from ${JSON.stringify(resolve("src/elements/toolbar.ts"))};
import {defineButton} from ${JSON.stringify(resolve("src/elements/button.ts"))};
import {registerStyles} from ${JSON.stringify(resolve("src/elements/styles.ts"))};
registerStyles(${JSON.stringify(registry)}); defineToolbar(); defineButton();
window.disabledTabstop = {create, destroy(){}};` }));
  } }],
});
assert(built.success, String(built.logs));
const browser = await launchChromium({ headless: true });
const rows: unknown[] = [];
try {
  for (const mode of ["factory", "slotted-native", "slotted-element"] as const) {
    const page = await browser.browser()!.newPage({ reducedMotion: "reduce" });
    try {
      const errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.setContent(`<!doctype html><style>${compile(baseStyles)}${Object.values(registry).join("\n")}</style><body><button id="before">Before</button><button id="after">After</button></body>`);
      await page.addScriptTag({ content: await built.outputs[0]!.text() });
      await page.evaluate(mode => {
        const items = [0, 1, 2].map(i => {
          const item = document.createElement(mode === 'slotted-element' ? 'm-button' : 'button');
          item.id = `item-${i}`; item.textContent = `Item ${i}`; return item;
        });
        let root: HTMLElement;
        if (mode === 'factory') {
          const toolbar = window.disabledTabstop.create({ items }); root = toolbar.element;
          window.disabledTabstop.destroy = () => toolbar.destroy();
        } else { root = document.createElement('m-toolbar'); root.append(...items); }
        document.querySelector('#after')!.before(root);
        document.querySelector<HTMLButtonElement>('#before')!.focus();
      }, mode);
      await page.waitForFunction(() => document.querySelector<HTMLElement>('#item-0')?.tabIndex === 0);
      const indexes = () => page.evaluate(() => [0, 1, 2].map(i => document.querySelector<HTMLElement>(`#item-${i}`)!.tabIndex));
      const focus = () => page.evaluate(() => document.activeElement?.id);
      assert.deepEqual(await indexes(), [0, -1, -1]);
      await page.evaluate(mode => {
        const item = document.querySelector<HTMLButtonElement>('#item-0')!;
        if (mode === 'slotted-element') item.setAttribute('disabled', ''); else item.disabled = true;
      }, mode);
      await settle(page);
      const disabled = await indexes();
      rows.push({ mode, disabled });
      await Bun.write(`${artifacts}/results.json`, JSON.stringify(rows, null, 2));
      assert.deepEqual(disabled, [-1, 0, -1], `${mode}: disabling the tab stop left no enabled tab stop`);
      assert.equal(await focus(), 'before', 'resync must not move focus');
      await page.keyboard.press('Tab'); assert.equal(await focus(), 'item-1', `${mode}: Tab cannot enter`);
      await page.locator('#item-1').evaluate(item => item.setAttribute('aria-disabled', 'true'));
      await settle(page); assert.deepEqual(await indexes(), [-1, -1, 0]);
      await page.locator('#before').focus(); await page.keyboard.press('Tab'); assert.equal(await focus(), 'item-2');
      await page.evaluate(() => [0, 1, 2].forEach(i => document.querySelector(`#item-${i}`)!.setAttribute('disabled', '')));
      await settle(page); assert.deepEqual(await indexes(), [-1, -1, -1]);
      await page.locator('#before').focus(); await page.keyboard.press('Tab'); assert.equal(await focus(), 'after');
      await page.locator('#item-1').evaluate(item => { item.removeAttribute('disabled'); item.removeAttribute('aria-disabled'); });
      await settle(page); assert.deepEqual(await indexes(), [-1, 0, -1]);
      await page.locator('#before').focus(); await page.keyboard.press('Tab'); assert.equal(await focus(), 'item-1');
      await page.locator('#item-0').evaluate(item => item.removeAttribute('disabled'));
      await settle(page); assert.deepEqual(await indexes(), [-1, 0, -1], 'keep an enabled remembered tab stop');
      if (mode === 'factory') {
        const retained = await page.evaluate(async () => {
          const item = document.querySelector<HTMLElement>('#item-1')!;
          item.setAttribute('disabled', ''); window.disabledTabstop.destroy();
          item.tabIndex = 6; item.removeAttribute('disabled');
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          return item.tabIndex;
        });
        assert.equal(retained, 6, 'destroy retained a watcher');
      }
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
console.log(`toolbar-disabled-tabstop: ${rows.length} factory/slotted rows passed (native/ARIA disabled, real Tab, recovery and teardown)`);
