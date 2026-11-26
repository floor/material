#!/usr/bin/env bun
// scripts/check-timepicker-seconds-width.ts
/**
 * A time picker with seconds shows every field whole.
 *
 * M3's time picker dialog is 328 px wide, which is what an hh:mm row needs.
 * The seconds field is our extension and its row is wider — 388 px at 12h and
 * 356 at 24h — so the content overflowed and the hour or the period was
 * clipped (md3.io, 2026-11-26). The dialog holding seconds takes the row's
 * width; the hours-and-minutes dialog keeps its M3 width exactly.
 *
 * The check mounts the picker in both formats, both types and both
 * directions, with and without seconds, on Chromium and WebKit, and asserts:
 *
 * 1. with seconds, every field and the AM/PM column lies inside the content
 *    box, whose `overflow: hidden` is what clipped them — at 360, 412 and
 *    900 px, where the narrow widths shrink the row rather than clip it;
 * 2. without seconds, the dialog keeps the widths it has on origin/main at
 *    that width: 280 px below 488, and at 900 px 328 for 12h, 304 for the 24h
 *    dial, 280 for the 24h input.
 *
 *   bun run scripts/check-timepicker-seconds-width.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium, webkit, type Browser, type Page } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";

const entry = resolve("scripts/timepicker-seconds-entry.ts");
const bundle = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
assert(bundle.success, String(bundle.logs));
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const css = sass.compileString(directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()), sassOptions()).css;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/timepicker.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;padding:24px;font-family:sans-serif}#host{width:520px}</style></head>
<body><div id="host"></div><script type="module">import "/timepicker.js";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

type Measured = {
  dialogWidth: number;
  contentWidth: number;
  fields: { name: string; left: number; right: number }[];
  /** The content box, whose overflow hides a field that leaves it. */
  box: { left: number; right: number };
};

const openPicker = (page: Page, config: { dir: "ltr" | "rtl"; format: "12h" | "24h"; type: "dial" | "input"; showSeconds: boolean }) =>
  page.evaluate(async ({ dir, format, type, showSeconds }) => {
    document.documentElement.dir = dir;
    const host = document.querySelector("#host")!;
    host.replaceChildren();
    const create = (window as unknown as { createTimePicker: (c: Record<string, unknown>) => { element: HTMLElement } }).createTimePicker;
    const picker = create({ format, type, showSeconds, label: "Time" });
    host.append(picker.element);
    await new Promise((done) => requestAnimationFrame(done));
    picker.element.querySelector<HTMLElement>("button, [role='button'], input")?.click();
    const dialog = document.querySelector<HTMLElement>(".mtrl-time-picker__dialog")!;
    dialog.setAttribute("open", "");
    await new Promise((done) => setTimeout(done, 350));
    const content = dialog.querySelector<HTMLElement>(".mtrl-time-picker__content")!;
    const contentRect = content.getBoundingClientRect();
    // The content's own box: a field that leaves it is clipped by
    // `overflow: hidden`, whatever it does inside the padding.
    const box = { left: contentRect.left, right: contentRect.right };
    const fields = [...dialog.querySelectorAll<HTMLElement>(".mtrl-time-picker__hours, .mtrl-time-picker__minutes, .mtrl-time-picker__seconds, .mtrl-time-picker__period")].map((element) => {
      const rect = element.getBoundingClientRect();
      return { name: element.className.split(" ")[0]!.replace("mtrl-time-picker__", ""), left: rect.left, right: rect.right };
    });
    return {
      dialogWidth: dialog.getBoundingClientRect().width,
      contentWidth: contentRect.width,
      fields,
      box,
    } as Measured;
  }, config);

/**
 * The no-seconds dialog at each width, as origin/main measures it (8f156da2):
 * the viewport caps it at 280 below 488, and at 900 the format and type set
 * it — 328 for 12h, 304 for the 24h dial, 280 for the 24h input. The fix may
 * not move any of these.
 */
const MAIN_NO_SECONDS = (width: number, format: "12h" | "24h", type: "dial" | "input"): number => {
  if (width < 488) return 280;
  if (format === "12h") return 328;
  return type === "dial" ? 304 : 280;
};

const run = async (browser: Browser, engine: string) => {
  const rows: string[] = [];
  const errors: string[] = [];
  for (const width of [360, 412, 900]) {
    const page = await browser.newPage({ viewport: { width, height: 760 } });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.port}`);
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);

    for (const dir of ["ltr", "rtl"] as const) {
      for (const format of ["12h", "24h"] as const) {
        for (const type of ["dial", "input"] as const) {
          const label = `${engine} ${width}px ${dir} ${format}/${type}`;
          const withSeconds = await openPicker(page, { dir, format, type, showSeconds: true });
          for (const field of withSeconds.fields) {
            assert(
              field.left >= withSeconds.box.left - 0.5 && field.right <= withSeconds.box.right + 0.5,
              `${label}: with seconds every field is whole — ${field.name} spans ${field.left.toFixed(1)}..${field.right.toFixed(1)} outside the content's ${withSeconds.box.left.toFixed(1)}..${withSeconds.box.right.toFixed(1)}`,
            );
          }
          // Three fields and the AM/PM column at 12h, one fewer period at 24h.
          assert(
            withSeconds.fields.length === (format === "12h" ? 4 : 3),
            `${label}: every field is measured (${withSeconds.fields.map((field) => field.name).join(", ")})`,
          );
          rows.push(`${label} +seconds ${withSeconds.dialogWidth.toFixed(0)} px`);

          const withoutSeconds = await openPicker(page, { dir, format, type, showSeconds: false });
          const expected = MAIN_NO_SECONDS(width, format, type);
          assert(
            Math.abs(withoutSeconds.dialogWidth - expected) <= 1,
            `${label}: without seconds the dialog keeps main's width (${withoutSeconds.dialogWidth.toFixed(1)} px, expected ${expected})`,
          );
          rows.push(`${label} ${withoutSeconds.dialogWidth.toFixed(0)} px`);
        }
      }
    }
    await page.close();
  }
  assert.deepEqual(errors, [], `${engine}: no uncaught page errors`);
  return { engine, rows };
};

const results = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try { results.push(await run(chromiumBrowser, "chromium")); } finally { await chromiumBrowser.close(); }
let webkitBrowser: Browser | null = null;
try { webkitBrowser = await webkit.launch({ headless: true }); } catch { console.log("time picker seconds: WebKit not installed here, skipped"); }
if (webkitBrowser) {
  try { results.push(await run(webkitBrowser, "webkit")); } finally { await webkitBrowser.close(); }
}
server.stop(true);
for (const result of results) console.log(`time picker seconds ${result.engine}: ${result.rows.join(" | ")}`);
console.log("Time picker seconds width check passed.");
