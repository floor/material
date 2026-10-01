#!/usr/bin/env bun
// scripts/check-react-ssr.ts
// Built-package SSR, parser consumption, hydration and browser isolation on both React versions.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import type { BunPlugin } from "bun";
declare global { interface Window { reactSSR: { ready: boolean; recoverable: string[] } } }
const browser = await chromium.launch();
const summaries: object[] = [];
await mkdir("analysis/react-ssr", { recursive: true });
try {
  for (const version of [18, 19]) {
    const plugins: BunPlugin[] = version === 18 ? [{ name: "react-18", setup(build) {
      build.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, args => ({ path: Bun.resolveSync(
        args.path.replace(/^react-dom(?=\/|$)/, "react-dom-18").replace(/^react(?=\/|$)/, "react-18"), process.cwd()) }));
    } }] : [];
    const bundle = async (entry: string, target: "browser" | "bun") => {
      const loaded: string[] = [];
      const result = await Bun.build({ entrypoints: [entry], target, plugins: [...plugins, {
        name: "ssr-isolation", setup(build) { build.onLoad({ filter: /.*/ }, args => {
          loaded.push(args.path);
          return undefined;
        }); },
      }], define: { "process.env.NODE_ENV": '"development"' } });
      assert(result.success, String(result.logs));
      if (target === "browser") assert(!loaded.some(path => /\/(?:ssr|linkedom)\//.test(path)), "Client loaded server code");
      return result.outputs[0].text();
    };
    const path = `${process.cwd()}/analysis/react-ssr/server-${version}.js`;
    await Bun.write(path, await bundle("scripts/fixtures/react-ssr-server.ts", "bun"));
    const { render } = await import(path);
    const html: string = render();
    assert.match(html, /<template shadowrootmode="open"/);
    assert.match(html, /<style>[\s\S]*?\.mtrl-button/);
    const client = await bundle("scripts/fixtures/react-ssr-client.ts", "browser");
    assert.doesNotMatch(client, /linkedom|DOMParser|SSR element nesting/);
    const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
      if (new URL(request.url).pathname === "/client.js") return new Response(client, { headers: { "Content-Type": "text/javascript" } });
      return new Response(`<!doctype html><div id="root">${html}</div><script type="module" src="/client.js"></script>`, { headers: { "Content-Type": "text/html" } });
    } });
    try {
      const inert = await browser.newPage({ javaScriptEnabled: false });
      await inert.goto(server.url.href);
      assert.deepEqual(await inert.evaluate(() => ["button", "switch", "tabs", "card", "nested"].map(id => !!document.getElementById(id)?.shadowRoot)), [true, true, true, true, true]);
      assert.equal(await inert.getByRole("tab", { name: "Trips", selected: true }).count(), 1, "Declaration children reach the renderer");
      assert.equal(await inert.getByRole("switch", { name: "Wi-Fi" }).isChecked(), true);
      await inert.close();
      const page = await browser.newPage();
      const warnings: string[] = [], errors: string[] = [];
      page.on("console", message => { if (["warning", "error"].includes(message.type())) warnings.push(message.text()); });
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(server.url.href);
      await page.waitForFunction(() => window.reactSSR?.ready);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.waitForFunction(() => document.getElementById("clicks")?.textContent === "1");
      await page.getByRole("switch", { name: "Wi-Fi" }).click();
      await page.waitForFunction(() => document.getElementById("checked")?.textContent === "false");
      assert.equal(await page.getByRole("switch", { name: "Wi-Fi" }).isChecked(), false);
      const recoverable = await page.evaluate(() => window.reactSSR.recoverable);
      assert.deepEqual({ warnings, errors, recoverable }, { warnings: [], errors: [], recoverable: [] });
      await page.goto(`${server.url}?mismatch`);
      await page.waitForFunction(() => window.reactSSR?.ready && window.reactSSR.recoverable.length > 0);
      const mismatch = await page.evaluate(() => window.reactSSR.recoverable.length);
      const summary = { version, warnings: 0, errors: 0, recoverable: 0, mismatchErrors: mismatch };
      summaries.push(summary);
      console.log(`React ${version}: 0 warnings, 0 errors, 0 recoverable errors; deliberate mismatch caught (${mismatch}); no-JS roots, declarations, events, checked state and client isolation passed`);
      await page.close();
    } finally { server.stop(true); }
  }
  await Bun.write("analysis/react-ssr/summary.json", JSON.stringify(summaries, null, 2));
} finally { await browser.close(); }
