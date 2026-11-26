#!/usr/bin/env bun
/**
 * A select near the bottom of the window flips its menu above the field and
 * caps it. The selected option has to sit inside that popup.
 *
 * Measured 2026-11-26, filled and outlined, 16 options, the second selected
 * (`data-id="1"`): the field at y 519–575, the popup at y 239–519, the
 * selected option at y −173 with no overlap. `open` fires before the menu
 * is positioned, and the option was scrolled then.
 *
 * The field is placed at the same window position. After the menu has
 * opened and its reveal has finished, the selected option's box intersects
 * the popup, and the popup is above the field. Run on main and on the
 * branch:
 *
 *   bun run scripts/check-select-flipped-option.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";

import { launchChromium } from "./browser-profile";
import { directionArmsPrelude, sassOptions } from "./build-styles";

const bundle = await Bun.build({
  entrypoints: [resolve("src/components/select/index.ts")],
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

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/select.js") {
      return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    }
    if (path === "/styles.css") {
      return new Response(css, { headers: { "Content-Type": "text/css" } });
    }
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head>
<body><div id="host"></div>
<script type="module">
import { createSelect } from "/select.js";
window.createSelect = createSelect;
window.ready = true;
</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

type Box = { top: number; right: number; bottom: number; left: number; width: number; height: number };

const browser = await launchChromium({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);

  const options = Array.from({ length: 16 }, (_, index) => ({ id: String(index), text: `Option ${index}` }));
  for (const variant of ["filled", "outlined"] as const) {
    const boxes = await page.evaluate(async ({ variant, options }) => {
      const host = document.querySelector("#host")!;
      host.replaceChildren();
      const win = window as unknown as {
        createSelect: (config: Record<string, unknown>) => { element: HTMLElement; open: () => unknown; destroy: () => void };
      };
      const select = win.createSelect({ label: "Choice", variant, value: "1", options });
      select.element.style.cssText = "position:absolute;top:519px;left:24px;width:240px";
      host.append(select.element);
      select.open();
      const menu = await new Promise<HTMLElement>((resolve, reject) => {
        const start = performance.now();
        const look = (): void => {
          const found = document.querySelector<HTMLElement>(".mtrl-select__menu.mtrl-menu--visible");
          if (found && found.getBoundingClientRect().height > 100) resolve(found);
          else if (performance.now() - start > 2000) reject(new Error("the menu did not open"));
          else requestAnimationFrame(look);
        };
        look();
      });
      await Promise.all(menu.getAnimations({ subtree: true }).map((animation) => animation.finished));
      const field = select.element.querySelector(".mtrl-text-field__field")!.getBoundingClientRect();
      const popup = menu.getBoundingClientRect();
      const option = menu.querySelector<HTMLElement>('[role="option"][data-id="1"]')!.getBoundingClientRect();
      select.destroy();
      const box = (rect: DOMRect): Box => ({
        top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height,
      });
      return { field: box(field), popup: box(popup), option: box(option) };
    }, { variant, options });

    const intersects = boxes.option.left < boxes.popup.right
      && boxes.option.right > boxes.popup.left
      && boxes.option.top < boxes.popup.bottom
      && boxes.option.bottom > boxes.popup.top;
    assert.ok(
      boxes.popup.bottom <= boxes.field.top + 1,
      `${variant}: the menu flips above the field (popup bottom ${boxes.popup.bottom.toFixed(1)}, field top ${boxes.field.top.toFixed(1)})`,
    );
    assert.ok(
      intersects,
      `${variant}: the selected option intersects the popup (option y ${boxes.option.top.toFixed(1)}–${boxes.option.bottom.toFixed(1)}, popup y ${boxes.popup.top.toFixed(1)}–${boxes.popup.bottom.toFixed(1)})`,
    );
    console.log(
      `${variant}: field y ${boxes.field.top.toFixed(0)}–${boxes.field.bottom.toFixed(0)}, popup y ${boxes.popup.top.toFixed(0)}–${boxes.popup.bottom.toFixed(0)}, option y ${boxes.option.top.toFixed(0)}–${boxes.option.bottom.toFixed(0)}`,
    );
  }
} finally {
  await browser.close();
  server.stop();
}

console.log("Passed: filled and outlined, the selected option intersects the flipped popup.");
