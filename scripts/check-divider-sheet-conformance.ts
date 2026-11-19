#!/usr/bin/env bun
// Divider insets, bottom-sheet corners at the viewport edge, and the side
// sheet's inner border and pressed close button.
//
//   bun run scripts/check-divider-sheet-conformance.ts
//
// Geometry needs a browser. Each page loads the factories and the stylesheets
// compiled for this run, with reduced motion so springs settle.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { compileString } from "sass";

const repoRoot = resolve(import.meta.dir, "..");
const compile = (source: string): string =>
  compileString(`@use "${source}";`, {
    loadPaths: [resolve(repoRoot, "src/styles")],
    style: "expanded",
  }).css;

const bundleSource = async (entrySource: string): Promise<string> => {
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
  return bundle.outputs[0]!.text();
};

const openPage = async (browser: Browser, css: string, js: string): Promise<{ page: Page; errors: string[] }> => {
  const page = await browser.newPage({ viewport: { width: 480, height: 600 }, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!doctype html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body></body></html>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: js });
  return { page, errors };
};

// The side sheet's inner border color is a custom property. Without the
// theme the shorthand is invalid and the used width is 0.
const sideCss = [compile("themes/baseline"), compile("components/side-sheet")].join("\n");
const sideJs = await bundleSource(`
import * as mtrl from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
window.mtrl = mtrl;
`);

const dividerCss = compile("components/divider");
const dividerSheetCss = [dividerCss, compile("components/bottom-sheet")].join("\n");
const dividerSheetJs = await bundleSource(`
import * as mtrl from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineDivider } from ${JSON.stringify(resolve(repoRoot, "src/elements/divider.ts"))};
import { registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/styles.ts"))};
registerStyles({ divider: ${JSON.stringify(dividerCss)} });
defineDivider();
window.mtrl = mtrl;
`);

const browser = await chromium.launch({ headless: true });
try {
  const side = await openPage(browser, sideCss, sideJs);
  const sideMeasured = await side.page.evaluate(async () => {
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

  const close = side.page.locator(".mtrl-side-sheet--standard.mtrl-side-sheet--end .mtrl-side-sheet__close");
  const rest = await close.evaluate((el) => Number.parseFloat(getComputedStyle(el, "::before").opacity));
  await close.hover();
  const hover = await close.evaluate((el) => Number.parseFloat(getComputedStyle(el, "::before").opacity));
  const box = await close.boundingBox();
  assert(box, "the standard close button has no box");
  await side.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await side.page.mouse.down();
  const pressed = await close.evaluate((el) => ({
    active: el.matches(":active"),
    opacity: Number.parseFloat(getComputedStyle(el, "::before").opacity),
  }));
  await side.page.mouse.up();

  const sideReport = { ...sideMeasured, pressed: { rest, hover, ...pressed }, errors: side.errors };
  console.log(JSON.stringify(sideReport));
  assert.deepEqual(side.errors, []);
  assert.deepEqual(sideReport.standardEnd, { start: 1, end: 0 });
  assert.deepEqual(sideReport.standardStart, { start: 0, end: 1 });
  assert.deepEqual(sideReport.modalEnd, { start: 0, end: 0 });
  assert.equal(sideReport.pressed.rest, 0.08);
  assert.equal(sideReport.pressed.hover, 0.08);
  assert.equal(sideReport.pressed.active, true);
  assert.equal(sideReport.pressed.opacity, 0.1);
  await side.page.close();

  const divider = await openPage(browser, dividerSheetCss, dividerSheetJs);
  const measured = await divider.page.evaluate(async () => {
    const w = window as unknown as {
      mtrl: {
        createDivider: (c?: object) => { element: HTMLElement; setInset: (a?: number, b?: number) => void };
        createBottomSheet: (c?: object) => {
          element: HTMLElement;
          expand: () => void;
          destroy: () => void;
          setContent: (content: string | HTMLElement) => void;
        };
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
    const flexOf = (start: number, end: number) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;flex-direction:row;width:480px";
      const divider = w.mtrl.createDivider({ insetStart: start, insetEnd: end });
      row.append(divider.element);
      document.body.append(row);
      return divider.element;
    };
    const flexZero = flexOf(0, 0);
    const flexInset = flexOf(24, 12);

    const column = document.createElement("div");
    column.style.cssText = "height:200px;width:48px";
    document.body.append(column);
    const vertical = w.mtrl.createDivider({ orientation: "vertical", insetStart: 24, insetEnd: 12 });
    const verticalUpdated = w.mtrl.createDivider({ orientation: "vertical" });
    verticalUpdated.setInset(24, 12);
    const verticalZero = w.mtrl.createDivider({ orientation: "vertical", insetStart: 0, insetEnd: 0 });
    column.append(vertical.element, verticalUpdated.element, verticalZero.element);
    const grown = document.createElement("div");
    grown.style.height = "1400px";
    const swapping = w.mtrl.createBottomSheet({ content: grown, variant: "standard" });
    swapping.expand();
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
    const beforeSwap = corners(swapping);
    const shrunk = document.createElement("div");
    shrunk.style.height = "80px";
    swapping.setContent(shrunk);
    await settle();
    const afterShrink = corners(swapping);
    const regrown = document.createElement("div");
    regrown.style.height = "1400px";
    swapping.setContent(regrown);
    await settle();
    const afterGrow = corners(swapping);
    swapping.destroy();
    const live = document.createElement("div");
    live.style.height = "80px";
    const resizing = w.mtrl.createBottomSheet({ content: live, variant: "modal" });
    resizing.expand();
    await settle();
    const beforeGrow = corners(resizing);
    live.style.height = "1400px";
    await settle();
    const afterInPlaceGrow = corners(resizing);
    live.style.height = "80px";
    await settle();
    const afterInPlaceShrink = corners(resizing);
    resizing.destroy();
    const line = (el: HTMLElement) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        start: px(style.marginBlockStart),
        end: px(style.marginBlockEnd),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    };

    return {
      updated: inset(full.element),
      constructed: inset(explicit.element),
      named: inset(named.element),
      element: inner ? inset(inner) : null,
      tall: corners(tall),
      tallStandard: corners(tallStandard),
      short: corners(short),
      vertical: line(vertical.element),
      verticalUpdated: line(verticalUpdated.element),
      verticalZero: line(verticalZero.element),
      flexZero: inset(flexZero),
      flexInset: inset(flexInset),
      beforeGrow,
      afterInPlaceGrow,
      afterInPlaceShrink,
      beforeSwap,
      afterShrink,
      afterGrow,
    };
  });

  const report = { ...measured, errors: divider.errors };
  console.log(JSON.stringify(report));
  assert.deepEqual(divider.errors, []);

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

  assert.deepEqual(report.vertical, { start: 24, end: 12, width: 1, height: 164 });
  assert.deepEqual(report.verticalUpdated, { start: 24, end: 12, width: 1, height: 164 });
  assert.deepEqual(report.verticalZero, { start: 0, end: 0, width: 1, height: 200 });

  assert.deepEqual(report.flexZero, { start: 0, end: 0, width: 480 });
  assert.deepEqual(report.flexInset, { start: 24, end: 12, width: 444 });

  assert.equal(report.beforeGrow.full, false);
  assert.ok(report.beforeGrow.top > 0);
  assert.equal(report.beforeGrow.start, 28);
  assert.equal(report.afterInPlaceGrow.full, true);
  assert.equal(report.afterInPlaceGrow.top, 0);
  assert.equal(report.afterInPlaceGrow.start, 0);
  assert.equal(report.afterInPlaceShrink.full, false);
  assert.ok(report.afterInPlaceShrink.top > 0);
  assert.equal(report.afterInPlaceShrink.start, 28);

  assert.equal(report.beforeSwap.full, true);
  assert.equal(report.beforeSwap.top, 0);
  assert.equal(report.beforeSwap.start, 0);
  assert.equal(report.afterShrink.full, false);
  assert.ok(report.afterShrink.top > 0);
  assert.equal(report.afterShrink.start, 28);
  assert.equal(report.afterGrow.full, true);
  assert.equal(report.afterGrow.top, 0);
  assert.equal(report.afterGrow.start, 0);
  console.log("ok");
} finally {
  await browser.close();
}
