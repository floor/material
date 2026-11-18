// scripts/check-datepicker-early-years.ts
// Check both built entries in a plain browser page; --dist also accepts a CI baseline artifact.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { chromiumProfileDir } from "./browser-profile";
import type createDatePicker from "../src/components/datepicker";
import type createDeferredDatePicker from "../src/components/datepicker/deferred";
import type { defineDatepicker } from "../src/elements/datepicker";

type PickerWindow = Window & { pickers: {
  eager: typeof createDatePicker; deferred: typeof createDeferredDatePicker;
  defineDatepicker: typeof defineDatepicker;
} };

export async function checkDatePickerEarlyYears(): Promise<void> {
  const dist = resolve(process.argv.find(arg => arg.startsWith("--dist="))?.slice(7) ?? "dist");
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/") return new Response(`<!doctype html><html><head><link rel="stylesheet" href="/dist/styles.css"></head><body><script type="module">
import { createDatePicker } from '/dist/components/datepicker/index.js';
import { createDeferredDatePicker } from '/dist/components/datepicker/deferred.js';
import '/dist/elements/css/index.js';
import { defineDatepicker } from '/dist/elements/datepicker.js';
window.pickers = { eager:createDatePicker, deferred:createDeferredDatePicker, defineDatepicker };
</script></body></html>`, { headers: { "Content-Type": "text/html" } });
    if (!path.startsWith("/dist/") || path.includes("..")) return new Response("missing", { status: 404 });
    try { return new Response(await readFile(join(dist, path.slice(6))), { headers: {
      "Content-Type": path.endsWith(".css") ? "text/css" : "text/javascript",
    } }); } catch { return new Response("missing", { status: 404 }); }
  } });
  const browser = await chromium.launchPersistentContext(chromiumProfileDir);
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(String(server.url));
    await page.waitForFunction(() => !!(window as unknown as PickerWindow).pickers);
    const rows = await page.evaluate(async () => {
      const { eager, deferred, defineDatepicker } = (window as unknown as PickerWindow).pickers;
      const factories = [];
      for (const [entry, create] of [["eager", eager], ["deferred", deferred]] as const) {
        for (const year of ["0001", "0009", "0099", "0100", "0999"]) {
          const value = `${year}-01-02`;
          const picker = create({ value, dateFormat: "YYYY-MM-DD" });
          document.body.append(picker.element);
          const formatted = picker.getFormattedValue();
          picker.input.dispatchEvent(new Event("change", { bubbles: true }));
          const held = picker.getValue();
          factories.push({ entry, value, formatted, input: picker.input.value,
            year: held instanceof Date ? held.getFullYear() : null,
            invalid: picker.input.getAttribute("aria-invalid") });
          picker.destroy();
        }
      }
      defineDatepicker();
      const elements = [];
      for (const range of [false, true]) {
        const form = document.createElement("form");
        const element = document.createElement("m-datepicker") as HTMLElement & { value: string };
        const value = range ? "0099-01-02/0099-01-04" : "0099-01-02";
        element.setAttribute("name", "chosen"); element.setAttribute("value", value);
        if (range) element.setAttribute("selection-mode", "range");
        form.append(element); document.body.append(form);
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const initial = { value: element.value, form: new FormData(form).get("chosen") };
        element.value = range ? "0009-01-02/0009-01-04" : "0009-01-02";
        const assigned = element.value;
        form.reset();
        elements.push({ value, initial, assigned, reset: element.value });
        form.remove();
      }
      return { factories, elements };
    });
    console.log(`Date picker early-year rows: ${JSON.stringify(rows)}`);
    await mkdir("analysis/browser", { recursive: true });
    await writeFile("analysis/browser/datepicker-early-years.json", JSON.stringify({ dist, ciRun: process.env.GITHUB_RUN_ID ?? null, rows, errors }, null, 2) + "\n");
    assert.deepEqual(errors, []);
    for (const row of rows.factories) {
      assert.equal(row.formatted, row.value, `${row.entry}: YYYY preserves the four-digit year`);
      assert.equal(row.input, row.value);
      assert.equal(row.year, Number(row.value.slice(0, 4)));
      assert.notEqual(row.invalid, "true", `${row.entry}: unchanged text round-trips`);
    }
    for (const row of rows.elements) {
      assert.deepEqual(row.initial, { value: row.value, form: row.value }, "early-year ISO survives element normalization and form serialization");
      assert.equal(row.assigned, row.value.replaceAll("0099", "0009"));
      assert.equal(row.reset, row.value);
    }
    console.log("Date picker early-year browser check passed for eager, deferred and form-associated element values.");
  } finally { await browser.close(); server.stop(true); }
}
if (import.meta.main) await checkDatePickerEarlyYears();
