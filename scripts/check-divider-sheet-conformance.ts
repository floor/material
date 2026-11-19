#!/usr/bin/env bun
// Side sheet pressed close button and the standard inner border.
//
//   bun run scripts/check-divider-sheet-conformance.ts
//
// Geometry needs a browser. The page loads the factory and the side sheet
// stylesheet compiled for this run, with reduced motion so springs settle.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { launchChromium } from "./browser-profile";
import { compileString } from "sass";

const repoRoot = resolve(import.meta.dir, "..");
const compile = (source: string): string =>
  compileString(`@use "${source}";`, {
    loadPaths: [resolve(repoRoot, "src/styles")],
    style: "expanded",
  }).css;

// The inner border's color is a custom property. Without the theme the
// shorthand is invalid and the used width is 0.
const css = [compile("themes/baseline"), compile("components/side-sheet")].join("\n");

const entrySource = `
import * as mtrl from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
window.mtrl = mtrl;
`;

const bundle = await Bun.build({
  entrypoints: ["divider-sheet-conformance-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^divider-sheet-conformance-entry\.ts$/ }, () => ({
        path: resolve(repoRoot, "divider-sheet-conformance-entry.ts"),
      }));
      build.onLoad({ filter: /divider-sheet-conformance-entry\.ts$/ }, () => ({
        contents: entrySource,
        loader: "ts",
      }));
    },
  }],
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0]!.text();

const browser = await launchChromium({ headless: true });
try {
  const page = await browser.browser()!.newPage({ viewport: { width: 480, height: 600 }, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!doctype html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body></body></html>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: js });

  const measured = await page.evaluate(async () => {
    const w = window as unknown as {
      mtrl: {
        createSideSheet: (c?: object) => { element: HTMLElement; open: () => void; destroy: () => void };
      };
    };
    const px = (value: string): number => Number.parseFloat(value);
    const borderOf = (position: "end" | "start", variant: "standard" | "modal") => {
      const sheet = w.mtrl.createSideSheet({ variant, position, title: "Filters" });
      sheet.open();
      const container = sheet.element.querySelector(".mtrl-side-sheet__container") as HTMLElement;
      const style = getComputedStyle(container);
      const border = { start: px(style.borderInlineStartWidth), end: px(style.borderInlineEndWidth) };
      if (!(variant === "standard" && position === "end")) sheet.destroy();
      return border;
    };

    return {
      standardEnd: borderOf("end", "standard"),
      standardStart: borderOf("start", "standard"),
      modalEnd: borderOf("end", "modal"),
    };
  });

  const close = page.locator(".mtrl-side-sheet--standard.mtrl-side-sheet--end .mtrl-side-sheet__close");
  const rest = await close.evaluate((el) => Number.parseFloat(getComputedStyle(el, "::before").opacity));
  await close.hover();
  const hover = await close.evaluate((el) => Number.parseFloat(getComputedStyle(el, "::before").opacity));
  const box = await close.boundingBox();
  assert(box, "the standard close button has no box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = await close.evaluate((el) => ({
    active: el.matches(":active"),
    opacity: Number.parseFloat(getComputedStyle(el, "::before").opacity),
  }));
  await page.mouse.up();

  const report = { ...measured, pressed: { rest, hover, ...pressed }, errors };
  console.log(JSON.stringify(report));
  assert.deepEqual(errors, []);

  assert.deepEqual(report.standardEnd, { start: 1, end: 0 });
  assert.deepEqual(report.standardStart, { start: 0, end: 1 });
  assert.deepEqual(report.modalEnd, { start: 0, end: 0 });

  assert.equal(report.pressed.rest, 0.08);
  assert.equal(report.pressed.hover, 0.08);
  assert.equal(report.pressed.active, true);
  assert.equal(report.pressed.opacity, 0.1);
  console.log("ok");
} finally {
  await browser.close();
}
