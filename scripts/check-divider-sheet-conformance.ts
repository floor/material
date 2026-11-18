#!/usr/bin/env bun
// Divider insets, bottom-sheet corners at the viewport edge, and the side
// sheet's pressed close button and standard inner border.
//
//   bun run scripts/check-divider-sheet-conformance.ts
//
// Geometry needs a browser. The page loads the factories and the three
// stylesheets compiled for this run, with reduced motion so springs settle.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { compileString } from "sass";

const repoRoot = resolve(import.meta.dir, "..");
const compile = (source: string): string =>
  compileString(`@use "${source}";`, {
    loadPaths: [resolve(repoRoot, "src/styles")],
    style: "expanded",
  }).css;

const dividerCss = compile("components/divider");
const css = [dividerCss, compile("components/bottom-sheet"), compile("components/side-sheet")].join("\n");

const entrySource = `
import * as mtrl from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineDivider } from ${JSON.stringify(resolve(repoRoot, "src/elements/divider.ts"))};
import { registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/styles.ts"))};
registerStyles({ divider: ${JSON.stringify(dividerCss)} });
defineDivider();
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

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 480, height: 600 }, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!doctype html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body></body></html>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: js });

  const measured = await page.evaluate(async () => {
    const w = window as unknown as {
      mtrl: {
        createDivider: (c?: object) => { element: HTMLElement; setInset: (a?: number, b?: number) => void };
        createBottomSheet: (c?: object) => { element: HTMLElement; expand: () => void; destroy: () => void };
        createSideSheet: (c?: object) => { element: HTMLElement; open: () => void; destroy: () => void };
      };
    };
    const settle = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const px = (value: string): number => Number.parseFloat(value);
    const inset = (el: HTMLElement) => {
      const style = getComputedStyle(el);
      return { start: px(style.marginInlineStart), end: px(style.marginInlineEnd), width: Math.round(px(style.width)) };
    };

    const host = document.createElement("div");
    host.style.width = "480px";
    document.body.append(host);
    const full = w.mtrl.createDivider();
    host.append(full.element);
    full.setInset(32, 20);
    const explicit = w.mtrl.createDivider({ insetStart: 24, insetEnd: 12 });
    host.append(explicit.element);
    const named = w.mtrl.createDivider({ variant: "inset" });
    host.append(named.element);
    const element = document.createElement("m-divider");
    element.setAttribute("inset-start", "24");
    element.setAttribute("inset-end", "12");
    host.append(element);
    await settle();
    const inner = element.shadowRoot?.querySelector(".mtrl-divider") as HTMLElement | null;

    const sheetOf = (height: string, variant: "standard" | "modal") => {
      const content = document.createElement("div");
      content.style.height = height;
      const sheet = w.mtrl.createBottomSheet({ content, variant });
      sheet.expand();
      return sheet;
    };
    const tall = sheetOf("900px", "modal");
    const tallStandard = sheetOf("900px", "standard");
    const short = sheetOf("80px", "modal");
    await settle();
    const corners = (sheet: { element: HTMLElement }) => {
      const container = sheet.element.querySelector(".mtrl-bottom-sheet__container") as HTMLElement;
      const box = container.getBoundingClientRect();
      const style = getComputedStyle(container);
      return {
        top: Math.round(box.top),
        height: Math.round(box.height),
        full: sheet.element.classList.contains("mtrl-bottom-sheet--full-height"),
        start: px(style.borderStartStartRadius),
        end: px(style.borderStartEndRadius),
      };
    };

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
      updated: inset(full.element),
      constructed: inset(explicit.element),
      named: inset(named.element),
      element: inner ? inset(inner) : null,
      tall: corners(tall),
      tallStandard: corners(tallStandard),
      short: corners(short),
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

  assert.deepEqual(report.updated, { start: 32, end: 20, width: 428 });
  assert.deepEqual(report.constructed, { start: 24, end: 12, width: 444 });
  assert.equal(report.named.start, 16);
  assert.deepEqual(report.element, { start: 24, end: 12, width: 444 });

  assert.equal(report.tall.full, true);
  assert.equal(report.tall.top, 0);
  assert.equal(report.tall.start, 0);
  assert.equal(report.tall.end, 0);
  assert.equal(report.tallStandard.full, true);
  assert.equal(report.tallStandard.start, 0);
  assert.equal(report.short.full, false);
  assert.ok(report.short.top > 0);
  assert.equal(report.short.start, 28);

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
