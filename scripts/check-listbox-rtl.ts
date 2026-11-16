#!/usr/bin/env bun
/** Control-local direction and disabled keyboard handling in a real browser. */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { baseStyles } from "./style-manifest";
import { compileThemeSources, inBaseLayer, styleLayerOrder } from "./build-styles";
import type { ListboxComponent } from "../src/components/listbox/types";

declare global { interface Window { directionListbox: ListboxComponent } }
const artifacts = "analysis/listbox-rtl";
await mkdir(artifacts, { recursive: true });
const css = `${styleLayerOrder()}${inBaseLayer(compileThemeSources(baseStyles))}@layer mtrl.listbox{${compileThemeSources(["components/listbox"])}}`;
const entry = await Bun.build({ entrypoints: ["listbox-direction-entry"], target: "browser", outdir: `${artifacts}/bundle`,
  plugins: [{ name: "entry", setup(build) {
    build.onResolve({ filter: /^listbox-direction-entry$/ }, () => ({ path: "entry", namespace: "probe" }));
    build.onLoad({ filter: /.*/, namespace: "probe" }, () => ({ loader: "js", contents: `
import createListbox from ${JSON.stringify(resolve("src/components/listbox/index.ts"))};
window.directionListbox = createListbox({control:document.querySelector('#control'), ariaLabel:'Country', value:'a',
options:[{id:'a',text:'Alpha'}, {id:'b',text:'Beta'}, {id:'c',text:'Charlie'}]});` }));
  } }],
});
assert(entry.success, String(entry.logs));
const browser = await chromium.launch({ headless: true });
const errors: string[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, reducedMotion: "reduce" });
  page.on("pageerror", error => errors.push(error.message));
  await page.setContent(`<!doctype html><html dir="ltr"><style>${css}
#control{width:160px;margin:100px 300px} [role="listbox"]{min-width:240px!important}
</style><body><div id="parent"><div id="control" dir="rtl"></div></div></body></html>`);
  await page.addScriptTag({ content: await entry.outputs[0]!.text() });
  const directions = await page.evaluate(() => {
    const control = document.querySelector<HTMLElement>('#control')!;
    const parent = control.parentElement!;
    const box = window.directionListbox;
    const read = (name: string) => {
      box.open();
      const popup = box.element.getBoundingClientRect();
      const rect = control.getBoundingClientRect();
      const result = { name, control: getComputedStyle(control).direction, popup: getComputedStyle(box.element).direction,
        option: getComputedStyle(box.element.querySelector('[role="option"]')!).direction,
        rightGap: Math.abs(rect.right - popup.right), leftGap: Math.abs(rect.left - popup.left) };
      box.close();
      return result;
    };
    const rows = [read('local RTL')];
    control.dir = 'ltr'; parent.dir = 'rtl'; rows.push(read('local LTR in RTL parent'));
    control.removeAttribute('dir'); rows.push(read('inherited RTL'));
    parent.dir = 'ltr'; control.style.direction = 'rtl'; rows.push(read('CSS RTL'));
    control.style.direction = 'ltr'; rows.push(read('changed to LTR on reopen'));
    return rows;
  });
  const keyboard = await page.evaluate(() => {
    const control = document.querySelector<HTMLElement>('#control')!;
    const box = window.directionListbox;
    const send = (key: string, altKey = false) => {
      const event = new KeyboardEvent('keydown', { key, altKey, bubbles: true, cancelable: true });
      const dispatched = control.dispatchEvent(event);
      return { key, altKey, dispatched, prevented: event.defaultPrevented, open: box.isOpen(), expanded: control.getAttribute('aria-expanded') };
    };
    box.setDisabled(true);
    const disabled = [send('ArrowDown', true), send('ArrowUp', true), send('ArrowDown'), send('Enter'), send('b')];
    box.setDisabled(false);
    const enabledOpen = send('ArrowDown', true);
    send('ArrowDown');
    const enabledCommit = send('ArrowUp', true);
    const value = box.getValue();
    box.open(); box.setDisabled(true);
    const disabledAfterOpen = send('ArrowDown', true);
    box.destroy();
    const destroyed = send('ArrowDown', true);
    return { disabled, enabledOpen, enabledCommit, value, disabledAfterOpen, destroyed };
  });
  await Bun.write(`${artifacts}/results.json`, JSON.stringify({ directions, keyboard, errors }, null, 2));
  // Collect both original defects before asserting so a main run records each.
  const failures: string[] = [];
  for (const row of directions) {
    if (row.popup !== row.control || row.option !== row.control) failures.push(`${row.name}: control ${row.control}, popup ${row.popup}, option ${row.option}`);
    if ((row.control === 'rtl' ? row.rightGap : row.leftGap) > 1) failures.push(`${row.name}: popup alignment differs from control`);
  }
  for (const row of [...keyboard.disabled, keyboard.disabledAfterOpen]) {
    if (row.prevented || !row.dispatched || row.open || row.expanded !== 'false') failures.push(`disabled ${row.altKey ? 'Alt+' : ''}${row.key}: ${JSON.stringify(row)}`);
  }
  assert.deepEqual(failures, [], 'listbox direction / disabled keyboard regressions');
  assert.equal(keyboard.enabledOpen.prevented, true);
  assert.equal(keyboard.enabledOpen.open, true);
  assert.equal(keyboard.enabledCommit.prevented, true);
  assert.equal(keyboard.enabledCommit.open, false);
  assert.equal(keyboard.value, 'b');
  assert.equal(keyboard.destroyed.prevented, false);
  assert.equal(keyboard.destroyed.open, false);
  assert.deepEqual(errors, []);
  console.log(`listbox-rtl: ${directions.length} direction rows and disabled/enabled/destroyed keyboard handling passed`);
} finally { await browser.close(); }
