// Development diagnostics for a trailing listener on a decorative text-field icon.
// --source reproduces RED/GREEN without a full library build; CI checks dist.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium, type Browser } from "playwright";
import type { WarningRow } from "./fixtures/text-field-warning/client";

export async function checkTextFieldWarning(browser: Browser, source = false): Promise<void> {
  const failures: string[] = [];
  for (const mode of ["development", "production", "raw-browser", "missing-env"] as const) {
    const result = await Bun.build({
      entrypoints: [resolve(import.meta.dir, "fixtures/text-field-warning/client.ts")],
      target: "browser", format: "iife", minify: true,
      define: mode === "development" || mode === "production" ? { "process.env.NODE_ENV": JSON.stringify(mode) } : { "process.env.NODE_ENV": "globalThis.process.env.NODE_ENV" },
      plugins: source ? [{ name: "warning-source", setup(build) {
        build.onResolve({ filter: /\.\.\/\.\.\/\.\.\/dist\// }, ({ path }) => ({ path: resolve(import.meta.dir, "../src", path.split("dist/")[1].replace(/\.js$/, ".ts")) }));
      } }] : [],
    });
    assert(result.success, String(result.logs));
    const js = await result.outputs[0].text();
    const diagnosticPresent = js.includes("Missing trailingIconLabel");
    assert.equal(diagnosticPresent, mode !== "production", "diagnostic is present in development bundles and stripped from production");
    const page = await browser.newPage();
    try {
      await page.setContent("<!doctype html><html><body></body></html>");
      // Explicit build modes need no process shim; raw browser ESM stays unsubstituted.
      if (mode === "missing-env") await page.evaluate(() => { Object.assign(window, { process: { env: null } }); });
      await page.addScriptTag({ content: js });
      const rows = await page.evaluate(() => (window as unknown as { warningRows: WarningRow[] }).warningRows);
      for (const row of rows) {
        if (mode === "raw-browser" || mode === "missing-env") row.expected = 0;
        console.log(`${mode}: ${JSON.stringify(row)}`);
        if (row.count !== row.expected || !row.unchanged || row.messages.some(message => !message.includes("trailingIconLabel") || !message.includes("trailing-icon-label"))) failures.push(`${mode}: ${row.name}: expected ${row.expected}, got ${row.count}; unchanged=${row.unchanged}`);
      }
    } finally { await page.close(); }
  }
  assert.deepEqual(failures, [], "trailing listener warnings");
  console.log(`Text field warning checks passed (${source ? "source" : "dist"})`);
}

if (import.meta.main) {
  const browser = await chromium.launch();
  try { await checkTextFieldWarning(browser, process.argv.includes("--source")); }
  finally { await browser.close(); }
}
