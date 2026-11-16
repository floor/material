// scripts/check-datepicker-load-failure.ts
/** Real emitted-module failures must leave the deferred picker closed and reusable. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium, type Page } from "playwright";
import * as sass from "sass";
import { baseStyles } from "./style-manifest";
import type createDeferredDatePicker from "../src/components/datepicker/deferred";

interface LabWindow extends Window {
  create: typeof createDeferredDatePicker;
  picker: ReturnType<typeof createDeferredDatePicker>;
  events: string[];
  loadErrors: string[];
  ready: boolean;
}
const built = await Bun.build({
  entrypoints: [resolve("src/components/datepicker/deferred.ts")],
  target: "browser", splitting: true, outdir: resolve("tmp/datepicker-load-failure"),
  naming: { entry: "deferred.js", chunk: "[name]-[hash].js" },
});
assert(built.success, String(built.logs));
const assets = new Map(await Promise.all(built.outputs.map(async output =>
  ["/" + output.path.split("/").at(-1), await output.text()] as const)));
const surfaces = [...assets].filter(([, code]) => code.includes("// src/components/datepicker/surface.ts"));
assert.equal(surfaces.length, 1, "the emitted calendar surface must remain a distinct module");
const surface = surfaces[0]![0];
const css = sass.compileString([...baseStyles, "components/datepicker"].map(name => `@use "${name}";`).join("\n"), {
  loadPaths: [resolve("src/styles")], logger: sass.Logger.silent,
}).css;
const html = `<!doctype html><html data-theme="baseline"><head><style>${css}</style></head><body>
<button id="other">Other action</button><script type="module">
import create from "/deferred.js";window.create=create;window.ready=true;
</script></body></html>`;
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
  const asset = assets.get(new URL(request.url).pathname);
  return new Response(asset ?? html, { headers: { "content-type": asset === undefined ? "text/html" : "application/javascript" } });
} });
const browser = await chromium.launch({ headless: true });
const measurements: Record<string, unknown> = { browser: browser.version(), surface };
const failures: string[] = [];
const check = (name: string, actual: unknown, expected: unknown) => {
  try { assert.deepEqual(actual, expected, name); } catch (error) { failures.push(String(error)); }
};
const snapshot = (page: Page) => page.evaluate(() => {
  const lab = window as unknown as LabWindow;
  const dialog = lab.picker.element.querySelector("dialog")!;
  return {
    open: lab.picker.isOpen(), dialogOpen: dialog.open,
    expanded: lab.picker.element.querySelector('[data-action="open"]')!.getAttribute("aria-expanded"),
    days: dialog.querySelectorAll("[data-date]").length,
    events: [...lab.events], errors: [...lab.loadErrors], value: lab.picker.getValue(),
    focus: document.activeElement?.id,
  };
});
let failedPage: Page | undefined;
try {
  for (const intent of ["open", "pointerenter", "focus"] as const) {
    const page = await browser.newPage();
    let requests = 0;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      const lab = window as unknown as LabWindow;
      lab.loadErrors = [];
      const original = console.error;
      console.error = (...args: unknown[]) => { lab.loadErrors.push(args.map(String).join(" ")); original(...args); };
    });
    await page.route("**" + surface, async route => {
      requests++;
      if (requests === 1) await route.abort("failed"); else await route.continue();
    });
    await page.goto(server.url.toString());
    await page.waitForFunction(() => (window as unknown as LabWindow).ready);
    await page.evaluate(intent => {
      const lab = window as unknown as LabWindow;
      lab.events = [];
      lab.picker = lab.create({ variant: "modal", value: "2026-07-15" });
      lab.picker.on("open", () => lab.events.push("open")).on("close", () => lab.events.push("close"));
      document.body.append(lab.picker.element);
      document.getElementById("other")!.focus();
      const trigger = lab.picker.element.querySelector<HTMLElement>('[data-action="open"]')!;
      if (intent === "open") { lab.picker.open(); lab.picker.open(); }
      else if (intent === "focus") trigger.focus();
      else trigger.dispatchEvent(new Event("pointerenter"));
    }, intent);
    await page.waitForFunction(() => (window as unknown as LabWindow).loadErrors.length > 0);
    const failed = await snapshot(page);
    check(`${intent}: a failed load closes requested and visible state`,
      [failed.open, failed.dialogOpen, failed.expanded, failed.days], [false, false, "false", 0]);
    check(`${intent}: a failure closes one open request and leaves prefetch quiet`, failed.events, intent === "open" ? ["open", "close"] : []);
    const escaped = await page.evaluate(() => {
      const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true, cancelable: true });
      document.activeElement!.dispatchEvent(event);
      return event.defaultPrevented;
    });
    check(`${intent}: the failed modal releases Escape`, escaped, false);
    await page.waitForTimeout(50);
    check(`${intent}: no automatic retry or duplicate import`, requests, 1);
    await page.evaluate(() => { const lab = window as unknown as LabWindow; lab.picker.close(); lab.picker.open(); });
    // Browsers may cache the failed module URL. Either a successful retry or a
    // second reported, closed failure is valid; an invisible open request is not.
    await page.waitForFunction(() => {
      const lab = window as unknown as LabWindow;
      return lab.loadErrors.length > 1 || lab.picker.element.querySelector("dialog[open] [data-date]");
    }, null, { timeout: 2_000 }).catch(() => {});
    const retry = await snapshot(page);
    check(`${intent}: the explicit retry settles visibly open or cleanly closed`, retry.open, retry.dialogOpen);
    check(`${intent}: retry preserves the committed date`, retry.value, failed.value);
    check(`${intent}: no unhandled rejection`, errors, []);
    measurements[intent] = { failed, retry, requests, pageErrors: errors };
    if (intent === "focus") failedPage = page;
    else await page.close();
  }
  for (const outcome of ["resolve", "reject"] as const) {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      const lab = window as unknown as LabWindow;
      lab.loadErrors = [];
      const original = console.error;
      console.error = (...args) => { lab.loadErrors.push(args.map(String).join(" ")); original(...args); };
    });
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    let requested: () => void = () => {};
    const inFlight = new Promise<void>(resolve => { requested = resolve; });
    let requests = 0;
    await page.route("**" + surface, async route => {
      requests++; requested(); await gate;
      if (outcome === "reject") await route.abort("failed");
      else await route.continue();
    });
    await page.goto(server.url.toString());
    await page.waitForFunction(() => (window as unknown as LabWindow).ready);
    await page.evaluate(() => {
      const lab = window as unknown as LabWindow;
      lab.events = [];
      lab.picker = lab.create({ variant: "modal" });
      lab.picker.on("open", () => lab.events.push("open")).on("close", () => lab.events.push("close"));
      document.body.append(lab.picker.element); lab.picker.open();
    });
    await inFlight;
    await page.evaluate(() => { const lab = window as unknown as LabWindow; lab.picker.destroy(); lab.picker.open(); });
    release();
    // Join the actual emitted module request without a test-only loader hook.
    await page.evaluate(async path => { try { await import(path); } catch { /* Expected for the rejection case. */ } }, surface);
    const destroyed = await page.evaluate(() => {
      const lab = window as unknown as LabWindow;
      return { open: lab.picker.isOpen(), connected: lab.picker.element.isConnected,
        days: lab.picker.element.querySelectorAll("[data-date]").length,
        events: lab.events, errors: lab.loadErrors };
    });
    check(`destroy then ${outcome}: terminal state`, destroyed,
      { open: false, connected: false, days: 0, events: ["open"], errors: [] });
    check(`destroy then ${outcome}: no new request`, requests, 1);
    check(`destroy then ${outcome}: no unhandled rejection`, errors, []);
    measurements[`destroy-${outcome}`] = { ...destroyed, requests, pageErrors: errors };
    await page.close();
  }
  // A reload gives the module loader a fresh cache. The same emitted assets
  // and ordinary public entry must then open, focus, and close successfully.
  assert(failedPage);
  const recovered = failedPage;
  await recovered.reload();
  await recovered.waitForFunction(() => (window as unknown as LabWindow).ready);
  await recovered.evaluate(() => {
    const lab = window as unknown as LabWindow;
    lab.picker = lab.create({ variant: "modal", value: "2026-07-15" });
    document.body.append(lab.picker.element); lab.picker.open();
  });
  await recovered.waitForFunction(() => {
    const lab = window as unknown as LabWindow;
    return lab.picker.element.querySelector("dialog[open] [data-date]");
  });
  check("fresh module cache: calendar receives focus", await recovered.evaluate(() =>
    (window as unknown as LabWindow).picker.element.querySelector("dialog")!.contains(document.activeElement)), true);
  await recovered.keyboard.press("Escape");
  check("fresh module cache: Escape closes the recovered picker", await recovered.evaluate(() => (window as unknown as LabWindow).picker.isOpen()), false);
  await recovered.close();
} finally { await browser.close(); server.stop(true); }
measurements.failures = failures;
const label = process.env.DATEPICKER_LOAD_LABEL ?? "run";
await Bun.write(resolve(`analysis/browser/datepicker-load-failure/${label}.json`), JSON.stringify(measurements, null, 2) + "\n");
assert.deepEqual(failures, [], "deferred date picker load failure contract");
console.log("Deferred date picker load failures: open/pointer/focus failures close, explicit retries settle, Escape releases, and a fresh cache recovers.");
