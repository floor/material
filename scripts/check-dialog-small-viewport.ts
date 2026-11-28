#!/usr/bin/env bun
// scripts/check-dialog-small-viewport.ts
/**
 * A dialog taller than its window scrolls its content with the headline in
 * view, and a dialog that fits keeps the bottom-sheet placement.
 *
 * M3 dialogs, "Behavior": a dialog appears as a sheet on compact windows
 * (https://m3.material.io/components/dialogs/guidelines, read 2026-11-02).
 * Below the sm breakpoint the overlay aligns dialogs to its bottom edge. A
 * dialog taller than the window overflowed the overlay's start edge, where
 * `overflow: auto` cannot scroll: at 360×600 a basic dialog with long content
 * measured 992 px tall with its top at -424 and its headline at -400, and the
 * overlay's scrollHeight equalled its clientHeight (600), so nothing could
 * bring the headline back. The dialog is capped at the overlay's box now, its
 * header and actions stay put and its content scrolls between them; a dialog
 * that fits is still bottom-aligned.
 *
 * The check opens a basic dialog with long and with short content at 360×600
 * and 412×700, in both directions, and asserts:
 *
 * 1. the headline's top is inside the window at or below the dialog's top;
 * 2. the dialog's box is inside the window (top >= 0, bottom <= height);
 * 3. long content scrolls inside the dialog: the content's scrollHeight is
 *    greater than its clientHeight, and scrolling it to the end moves it;
 * 4. short content does not scroll and the dialog sits on the window's bottom
 *    edge (the sheet placement), not in the middle.
 *
 * A full-screen dialog fills compact windows and uses OnSurface for its close icon.
 *
 *   bun run scripts/check-dialog-small-viewport.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium, webkit, type Browser, type Page } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";

const entry = resolve("scripts/dialog-small-viewport-entry.ts");
const bundle = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
assert(bundle.success, String(bundle.logs));
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const css = sass.compileString(directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()), sassOptions()).css;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/dialog.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;font-family:sans-serif}</style></head>
<body><script type="module">import "/dialog.js";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

const LONG = Array.from({ length: 12 }, (_, index) => `<p>Paragraph ${index + 1}: a long body that has to scroll inside the dialog when the window is short.</p>`).join("");

type Measured = {
  viewport: { width: number; height: number };
  dialog: { left: number; top: number; right: number; bottom: number; height: number };
  closeColor: string | undefined;
  surfaceColor: string;
  titleTop: number;
  content: { scrollHeight: number; clientHeight: number; scrollTop: number; scrolledTop: number };
  padding: number;
  margin: number;
};

const openDialog = (page: Page, config: { dir: "ltr" | "rtl"; long: boolean; fullscreen?: boolean; topLayer?: boolean }) =>
  page.evaluate(async ({ dir, long, content, fullscreen, topLayer }) => {
    document.documentElement.dir = dir;
    document.querySelectorAll(".mtrl-dialog__overlay").forEach((overlay) => overlay.remove());
    const create = (window as unknown as { createDialog: (settings: Record<string, unknown>) => { element: HTMLElement; open: () => unknown } }).createDialog;
    const dialog = create({
      title: "Headline",
      content: long ? content : "<p>Short body.</p>",
      actions: [{ text: "Cancel" }, { text: "OK" }],
      ...(fullscreen ? { size: "fullscreen" } : {}),
      ...(topLayer ? { layer: "top" } : {}),
    });
    document.body.append(dialog.element);
    dialog.open();
    // The open transition runs before the box is read.
    await new Promise((done) => setTimeout(done, 600));
    // The factory's element is the surface itself, or holds it.
    const root = dialog.element as HTMLElement;
    const surface = root.matches(".mtrl-dialog") ? root : root.querySelector<HTMLElement>(".mtrl-dialog")!;
    const title = (surface.querySelector<HTMLElement>(".mtrl-dialog__header-title") ?? surface.querySelector<HTMLElement>(".mtrl-dialog__header"))!;
    const contentElement = surface.querySelector<HTMLElement>(".mtrl-dialog__content")!;
    const overlay = surface.closest<HTMLElement>(".mtrl-dialog__overlay") ?? document.querySelector<HTMLElement>(".mtrl-dialog__overlay")!;
    const rect = surface.getBoundingClientRect();
    const close = surface.querySelector(".mtrl-dialog__header-close svg");
    const before = contentElement.scrollTop;
    contentElement.scrollTop = 9_999;
    const scrolledTop = contentElement.scrollTop;
    contentElement.scrollTop = before;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      dialog: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, height: rect.height },
      closeColor: close ? getComputedStyle(close).color : undefined,
      surfaceColor: getComputedStyle(surface).color,
      titleTop: title.getBoundingClientRect().top,
      content: {
        scrollHeight: contentElement.scrollHeight,
        clientHeight: contentElement.clientHeight,
        scrollTop: before,
        scrolledTop,
      },
      padding: overlay ? parseFloat(getComputedStyle(overlay).paddingTop) : 0,
      margin: parseFloat(getComputedStyle(surface).marginBottom),
    } as Measured;
  }, { ...config, content: LONG });

const run = async (browser: Browser, engine: string) => {
  const rows: string[] = [];
  const failures: string[] = [];
  for (const [width, height] of [[360, 600], [412, 700]] as const) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`http://127.0.0.1:${server.port}`);
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
    for (const dir of ["ltr", "rtl"] as const) {
      for (const long of [true, false]) {
        const label = `${engine} ${width}x${height} ${dir} ${long ? "long" : "short"}`;
        const measured = await openDialog(page, { dir, long });
        // 1. The headline is in the window, at or below the dialog's top.
        if (!(measured.titleTop >= 0 && measured.titleTop <= measured.viewport.height)) {
          failures.push(`${label}: the headline is in the window (top ${measured.titleTop.toFixed(1)})`);
        }
        // 2. The dialog's box is in the window.
        if (!(measured.dialog.top >= -0.5 && measured.dialog.bottom <= measured.viewport.height + 0.5)) {
          failures.push(`${label}: the dialog is inside the window (top ${measured.dialog.top.toFixed(1)}, bottom ${measured.dialog.bottom.toFixed(1)})`);
        }
        if (long) {
          // 3. Long content scrolls inside the dialog and reaches its end.
          if (!(measured.content.scrollHeight > measured.content.clientHeight + 1)) {
            failures.push(`${label}: the content scrolls (scrollHeight ${measured.content.scrollHeight}, clientHeight ${measured.content.clientHeight})`);
          }
          if (!(measured.content.scrolledTop > 0)) {
            failures.push(`${label}: scrolling the content moves it (scrollTop stays ${measured.content.scrolledTop})`);
          }
        } else {
          // 4. Short content does not scroll and sits on the bottom edge.
          if (measured.content.scrollHeight > measured.content.clientHeight + 1) {
            failures.push(`${label}: short content does not scroll`);
          }
          // The sheet placement: the dialog's own margin sits on the
          // overlay's padding, so its box ends that far above the window.
          const gap = measured.viewport.height - measured.dialog.bottom;
          const expected = measured.padding + measured.margin;
          if (!(Math.abs(gap - expected) <= 1)) {
            failures.push(`${label}: the short dialog sits on the bottom edge (gap ${gap.toFixed(1)} px, padding + margin ${expected})`);
          }
        }
        rows.push(`${label} title ${measured.titleTop.toFixed(0)} dialog ${measured.dialog.top.toFixed(0)}..${measured.dialog.bottom.toFixed(0)} content ${measured.content.clientHeight}/${measured.content.scrollHeight}`);
      }
    }
    await page.close();
  }
  const fullscreenCases = [
    { width: 240, topLayer: false, inset: 0 },
    { width: 360, topLayer: false, inset: 0 },
    { width: 599, topLayer: false, inset: 0 },
    { width: 600, topLayer: false, inset: 16 },
    { width: 900, topLayer: false, inset: 24 },
    { width: 900, topLayer: true, inset: 0 },
  ];
  for (const { width, topLayer, inset } of fullscreenCases) {
    const page = await browser.newPage({ viewport: { width, height: 600 } });
    try {
      await page.goto(`http://127.0.0.1:${server.port}`);
      await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
      const { viewport, dialog, closeColor, surfaceColor } = await openDialog(page, { dir: "ltr", long: false, fullscreen: true, topLayer });
      const label = `${engine} ${width}px ${topLayer ? "top layer" : "overlay"} full-screen dialog`;
      const bounds = `${dialog.left},${dialog.top}–${dialog.right},${dialog.bottom}`;
      const expected = [inset, inset, viewport.width - inset, viewport.height - inset];
      const actual = [dialog.left, dialog.top, dialog.right, dialog.bottom];
      if (actual.some((edge, i) => Math.abs(edge - expected[i]!) > 0.5)) {
        failures.push(`${label}: expected bounds ${expected.join(", ")}, measured ${bounds}`);
      }
      if (closeColor !== surfaceColor) {
        failures.push(`${label}: close icon colour is ${surfaceColor}, measured ${closeColor}`);
      }
      rows.push(`${label}: bounds ${bounds}, close icon ${closeColor}`);
    } finally {
      await page.close();
    }
  }
  return { rows, failures };
};

const results = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try { results.push(await run(chromiumBrowser, "chromium")); } finally { await chromiumBrowser.close(); }
let webkitBrowser: Browser | null = null;
try { webkitBrowser = await webkit.launch({ headless: true }); } catch { console.log("dialog small viewport: WebKit not installed here, skipped"); }
if (webkitBrowser) {
  try { results.push(await run(webkitBrowser, "webkit")); } finally { await webkitBrowser.close(); }
}
server.stop(true);
for (const result of results) for (const row of result.rows) console.log(row);
assert.deepEqual(results.flatMap(result => result.failures), [], "Dialog viewport geometry and close icon colour");
console.log("Dialog small viewport and full-screen checks passed.");
