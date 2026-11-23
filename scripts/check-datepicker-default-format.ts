// scripts/check-datepicker-default-format.ts
// Check both built entries in a plain browser page; --dist also accepts a CI baseline artifact.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { launchChromium } from "./browser-profile";
import type createDatePicker from "../src/components/datepicker";
import type createDeferredDatePicker from "../src/components/datepicker/deferred";
import type { setComponentDefaults, clearGlobalDefaults } from "../src/core/config/global";

type PickerWindow = Window & { pickers: {
  eager: typeof createDatePicker; deferred: typeof createDeferredDatePicker;
  setComponentDefaults: typeof setComponentDefaults; clearGlobalDefaults: typeof clearGlobalDefaults;
} };

export async function checkDatePickerDefaultFormat(): Promise<void> {
  const dist = resolve(process.argv.find(arg => arg.startsWith("--dist="))?.slice(7) ?? "dist");
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/") return new Response(`<!doctype html><html><head><link rel="stylesheet" href="/dist/styles.css"></head><body><script type="module">
import { createDatePicker } from '/dist/components/datepicker/index.js';
import { createDeferredDatePicker } from '/dist/components/datepicker/deferred.js';
import { setComponentDefaults, clearGlobalDefaults } from '/dist/core/config/global.js';
window.pickers = { eager:createDatePicker, deferred:createDeferredDatePicker, setComponentDefaults, clearGlobalDefaults };
</script></body></html>`, { headers: { "Content-Type": "text/html" } });
    if (!path.startsWith("/dist/") || path.includes("..")) return new Response("missing", { status: 404 });
    try { return new Response(await readFile(join(dist, path.slice(6))), { headers: {
      "Content-Type": path.endsWith(".css") ? "text/css" : "text/javascript",
    } }); } catch { return new Response("missing", { status: 404 }); }
  } });
  const browser = await launchChromium();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(String(server.url));
    await page.waitForFunction(() => !!(window as unknown as PickerWindow).pickers);
    const rows = await page.evaluate(() => {
      const { eager, deferred, setComponentDefaults, clearGlobalDefaults } = (window as unknown as PickerWindow).pickers;
      const rows = [];
      for (const [entry, create] of [["eager", eager], ["deferred", deferred]] as const) {
        clearGlobalDefaults();
        const localeOnly = create({ locale: "fr-FR", value: "2026-09-15" });
        document.body.append(localeOnly.element);
        const locale = localeOnly.getFormattedValue(); localeOnly.destroy();
        setComponentDefaults("datepicker", { locale: "fr-FR", dateFormat: "YYYY-MM-DD" });
        const inherited = create({ value: "2026-09-15" });
        const override = create({ value: "2026-09-15", dateFormat: "DD.MM.YYYY" });
        document.body.append(inherited.element, override.element);
        const initial = { value: inherited.getFormattedValue(), input: inherited.input.value,
          placeholder: inherited.input.placeholder, override: override.getFormattedValue() };
        inherited.input.value = "2026-09-16";
        inherited.input.dispatchEvent(new Event("change", { bubbles: true }));
        const held = inherited.getValue();
        rows.push({ entry, locale, initial, edited: inherited.getFormattedValue(),
          date: held instanceof Date ? [held.getFullYear(), held.getMonth() + 1, held.getDate()] : null,
          invalid: inherited.input.getAttribute("aria-invalid") });
        inherited.destroy(); override.destroy(); clearGlobalDefaults();
      }
      return rows;
    });
    console.log(`Date picker default-format rows: ${JSON.stringify(rows)}`);
    await mkdir("analysis/browser", { recursive: true });
    await writeFile("analysis/browser/datepicker-default-format.json", JSON.stringify({ dist, ciRun: process.env.GITHUB_RUN_ID ?? null, rows, errors }, null, 2) + "\n");
    assert.deepEqual(errors, []);
    for (const row of rows) {
      assert.equal(row.locale, "15/09/2026", `${row.entry}: omitted format follows the locale`);
      assert.deepEqual(row.initial, { value: "2026-09-15", input: "2026-09-15", placeholder: "YYYY-MM-DD", override: "15.09.2026" }, `${row.entry}: merged date format and instance precedence`);
      assert.equal(row.edited, "2026-09-16");
      assert.deepEqual(row.date, [2026, 9, 16]);
      assert.notEqual(row.invalid, "true");
    }
    console.log("Date picker default-format browser check passed for eager and deferred entries.");
  } finally { await browser.close(); server.stop(true); }
}
if (import.meta.main) await checkDatePickerDefaultFormat();
