#!/usr/bin/env bun
/** Real listbox state and the user's system palette, without hardcoded RGBs. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

import { launchChromium } from "./browser-profile";
import { baseStyles } from "./style-manifest";
import { compileThemeSources, inBaseLayer, styleLayerOrder } from "./build-styles";
import type { ListboxComponent } from "../src/components/listbox/types";

declare global { interface Window { contrastListbox: ListboxComponent; readListbox: () => { forced: boolean; box: Record<string, string>; options: Array<Record<string, string>>; palette: Record<string, string>; active: number } } }
const artifacts = "analysis/listbox-forced-colors";
await mkdir(artifacts, { recursive: true });
const pkg = await Bun.file("package.json").json() as { name: string; version: string };
// Use the shipped stylesheet in CI; without dist, compile just this sheet
// through the production layer/direction helpers (not a package build).
const packed = existsSync("dist/styles/listbox.css");
const css = packed ? await Bun.file("dist/styles/listbox.css").text()
  : `/*! ${pkg.name} v${pkg.version} | MIT */\n${styleLayerOrder()}@layer mtrl.listbox{${compileThemeSources(["components/listbox"])}}\n`;
const base = inBaseLayer(compileThemeSources(baseStyles));
await Bun.write(`${artifacts}/listbox.css`, css);
const entry = await Bun.build({ entrypoints: ["listbox-contrast-entry"], target: "browser", outdir: `${artifacts}/bundle`,
  plugins: [{ name: "entry", setup(build) {
    build.onResolve({ filter: /^listbox-contrast-entry$/ }, () => ({ path: "entry", namespace: "probe" }));
    build.onLoad({ filter: /.*/, namespace: "probe" }, () => ({ loader: "js", contents: `
import createListbox from ${JSON.stringify(resolve("src/components/listbox/index.ts"))};
const control = document.createElement('div'); control.id = 'control'; document.body.append(control);
window.contrastListbox = createListbox({control, ariaLabel:'Country', value:'a', options:[
{id:'a',text:'Alpha'}, {id:'b',text:'Beta',disabled:true}, {id:'c',text:'Charlie'}]});
` }));
  } }],
});
assert(entry.success, String(entry.logs));
const code = await entry.outputs[0]!.text();
const browser = await launchChromium({ headless: true });
const rows: unknown[] = [];
try {
  for (const colorScheme of ["light", "dark"] as const) {
    const page = await browser.browser()!.newPage({ forcedColors: "active", colorScheme, reducedMotion: "reduce" });
    try {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setContent(`<!doctype html><html data-theme="baseline"><style>${base}${css}</style><body>
<span id="palette" style="forced-color-adjust:none;background:Highlight;color:HighlightText;border:1px solid GrayText"></span></body></html>`);
      await page.addScriptTag({ content: code });
      // One reader, installed in the page: the row needs it inside the single
      // task that opens the popup and sends the key.
      await page.evaluate(() => {
        window.readListbox = () => {
          const box = window.contrastListbox.element;
          const all = [...box.querySelectorAll<HTMLElement>('[role="option"]')];
          const style = (element: Element) => {
            const s = getComputedStyle(element);
            return { color: s.color, background: s.backgroundColor, borderWidth: s.borderTopWidth,
              borderStyle: s.borderTopStyle, borderColor: s.borderTopColor, shadow: s.boxShadow,
              outlineWidth: s.outlineWidth, outlineStyle: s.outlineStyle };
          };
          return { forced: matchMedia('(forced-colors: active)').matches, box: style(box), options: all.map(style),
            palette: style(document.querySelector('#palette')!), active: all.findIndex(row => row.id === document.querySelector('#control')!.getAttribute('aria-activedescendant')) };
        };
      });
      const read = () => page.evaluate(() => window.readListbox());
      // The popup dismisses itself on an outside focus change, a scroll or a
      // resize by design, and a runner can deliver one between "open it" and
      // "press a key": the key then lands on a closed popup, which opens on the
      // selected option instead of moving past the disabled one. The open, the
      // first read and the key happen in ONE task, so the key the component
      // receives is the one this row is about. Every assertion is unchanged.
      const { selected, navigated } = await page.evaluate(() => {
        const control = document.querySelector('#control')!;
        window.contrastListbox.open();
        const selected = window.readListbox();
        control.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
        return { selected, navigated: window.readListbox() };
      });
      await page.evaluate(() => window.contrastListbox.setValue('b'));
      const selectedDisabled = await read();
      await page.screenshot({ path: `${artifacts}/${colorScheme}.png` });
      await page.emulateMedia({ forcedColors: "none" });
      const ordinary = await read();
      rows.push({ colorScheme, selected, navigated, selectedDisabled, ordinary });
      await Bun.write(`${artifacts}/results.json`, JSON.stringify({ css: { raw: Buffer.byteLength(css), gzip: gzipSync(css).length }, rows }, null, 2));
      assert.equal(ordinary.box.borderWidth, '0px', 'ordinary palette gained a forced-colors border');
      assert.notEqual(ordinary.box.shadow, 'none', 'ordinary palette lost its elevation');
      assert.equal(selected.forced, true);
      assert.equal(selected.box.shadow, 'none');
      assert.equal(selected.box.borderWidth, '1px', 'forced-colors popup needs a visible boundary');
      assert.equal(selected.box.borderStyle, 'solid');
      assert.equal(selected.box.borderColor, selected.box.color);
      assert.equal(selected.options[0]!.background, selected.palette.background, 'selection must use Highlight');
      assert.equal(selected.options[0]!.color, selected.palette.color, 'selection must use HighlightText');
      assert.equal(selected.options[1]!.color, selected.palette.borderColor, 'disabled option must use GrayText');
      assert.notEqual(selected.options[1]!.color, selected.options[2]!.color);
      assert.equal(navigated.active, 2, 'keyboard navigation must skip the disabled option');
      assert.equal(navigated.options[2]!.outlineWidth, '3px');
      assert.equal(navigated.options[2]!.outlineStyle, 'solid');
      assert.equal(selectedDisabled.options[1]!.background, selectedDisabled.palette.background);
      assert.equal(selectedDisabled.options[1]!.color, selectedDisabled.palette.borderColor, 'selected disabled option must retain GrayText');
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
console.log(`listbox-forced-colors: ${rows.length} light/dark rows passed (boundary, selection, disabled, combined state, keyboard focus and ordinary palette)`);
console.log(`listbox CSS: ${Buffer.byteLength(css)} raw / ${gzipSync(css).length} gzip bytes (${packed ? "packed" : "production helpers"}, Bun node:zlib)`);
