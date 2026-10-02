#!/usr/bin/env bun
// scripts/check-react-ssr.ts
// Built-package SSR, parser consumption, hydration and browser isolation on both React versions.
// Known limit (FLO-517): mtrl/ssr/react children cannot see providers above their host until upgrade.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import type { BunPlugin } from "bun";
declare global {
  interface Window {
    reactSSR: { ready: boolean; recoverable: string[] };
    reactContextSSR: { ready: boolean; recoverable: string[] };
    reactSuspense?: { ready: boolean; recoverable: string[] };
    __ssrRoots?: { late: ShadowRoot | null; sync: ShadowRoot | null };
  }
}
type SuspenseServer = typeof import("./fixtures/react-ssr-suspense-server");
/** React's own suspend report, in development text or the minified production form. The bridge does not read this text. */
const suspendError = (errors: string[]): boolean => errors.some((error) =>
  error.includes("suspended while responding to synchronous input") || /Minified React error #426\b/.test(error));

/** Warnings from the bridge while `run` is in progress. */
const mtrlWarnings = async <T>(run: () => Promise<T>): Promise<{ result: T; warnings: string[] }> => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: Parameters<typeof console.warn>) => {
    warnings.push(args.map((arg) => String(arg)).join(" "));
    original(...args);
  };
  try {
    const result = await run();
    return { result, warnings: warnings.filter((warning) => warning.includes("[mtrl]")) };
  } finally {
    console.warn = original;
  }
};
const browser = await chromium.launch();
const summaries: object[] = [];
const contextFailures: string[] = [];
const expectContextKnownLimit = (label: string, known: boolean, fixed: boolean, observed: string) => {
  assert.equal(fixed, false, `${label}: provider context reached the shadow; remove the expected-failure marker (FLO-517)`);
  assert.equal(known, true, `${label}: expected ${observed}; the shadow has an unexpected outcome`);
  console.log(`known limit, FLO-517 (expected to fail until the page-level integration): ${label}: ${observed}`);
};
await mkdir("analysis/react-ssr", { recursive: true });
try {
  for (const version of [18, 19]) {
    const plugins: BunPlugin[] = version === 18 ? [{ name: "react-18", setup(build) {
      build.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, args => ({ path: Bun.resolveSync(
        args.path.replace(/^react-dom(?=\/|$)/, "react-dom-18").replace(/^react(?=\/|$)/, "react-18"), process.cwd()) }));
    } }] : [];
    const bundle = async (entry: string, target: "browser" | "bun", environment: "development" | "production" = "development") => {
      const loaded: string[] = [];
      const result = await Bun.build({ entrypoints: [entry], target, plugins: [...plugins, {
        name: "ssr-isolation", setup(build) { build.onLoad({ filter: /.*/ }, args => {
          loaded.push(args.path);
          return undefined;
        }); },
      }], define: { "process.env.NODE_ENV": JSON.stringify(environment) } });
      assert(result.success, String(result.logs));
      if (target === "browser") assert(!loaded.some(path => /\/(?:ssr|linkedom)\//.test(path)), "Client loaded server code");
      return result.outputs[0].text();
    };
    // These cases exercise children under providers above the host. A second
    // React root cannot see either provider, even though the page render can.
    for (const environment of ["development", "production"] as const) {
      const label = `React ${version} ${environment} context`;
      try {
        const contextServer = `${process.cwd()}/analysis/react-ssr/context-server-${version}-${environment}.js`;
        await Bun.write(contextServer, await bundle("scripts/fixtures/react-ssr-context-server.ts", "bun", environment));
        const { render: renderContext } = await import(contextServer);
        const contextHtml: string = renderContext();
        const contextClient = await bundle("scripts/fixtures/react-ssr-context-client.ts", "browser", environment);
        assert.doesNotMatch(contextClient, /linkedom|DOMParser|SSR element nesting/, `${label} client isolation`);
        const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
          if (new URL(request.url).pathname === "/client.js") return new Response(contextClient, { headers: { "Content-Type": "text/javascript" } });
          return new Response(`<!doctype html><div id="root">${contextHtml}</div><script type="module" src="/client.js"></script>`,
            { headers: { "Content-Type": "text/html" } });
        } });
        try {
          const shadows = await (async () => {
            const inert = await browser.newPage({ javaScriptEnabled: false });
            try {
              await inert.goto(server.url.href);
              return await inert.evaluate(() => ["provided-tabs", "required-tabs"].map(id => {
                const host = document.getElementById(id);
                return {
                  host: !!host,
                  root: !!host?.shadowRoot,
                  text: host?.shadowRoot?.textContent ?? null,
                  light: host?.textContent ?? null,
                };
              }));
            } finally { await inert.close(); }
          })();
          const page = await browser.newPage();
          try {
            const warnings: string[] = [], errors: string[] = [];
            page.on("console", message => { if (["warning", "error"].includes(message.type())) warnings.push(message.text()); });
            page.on("pageerror", error => errors.push(error.message));
            await page.goto(server.url.href);
            await page.waitForFunction(() => window.reactContextSSR?.ready);
            const recoverable = await page.evaluate(() => window.reactContextSSR.recoverable);
            assert.deepEqual({ warnings, errors, recoverable }, { warnings: [], errors: [], recoverable: [] }, `${label} hydration`);
          } finally { await page.close(); }
          assert.equal(shadows[0].host && shadows[1].host, true, `${label}: context hosts exist`);
          assert.equal(shadows[0].light, "from provider", `${label}: light DOM saw the default-valued provider`);
          assert.equal(shadows[1].light, "required provider", `${label}: light DOM saw the required provider`);
          expectContextKnownLimit(`${label} default-valued context`,
            shadows[0].root && shadows[0].text?.includes("DEFAULT") === true,
            shadows[0].text?.includes("from provider") === true, "shadow contains DEFAULT");
          expectContextKnownLimit(`${label} required context`,
            !shadows[1].root, shadows[1].text?.includes("required provider") === true, "shadow root missing");
          console.log(`${label}: hydration clean`);
        } finally { server.stop(true); }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const line = message.split("\n")[0] ?? message;
        contextFailures.push(line.startsWith(label) ? line : `${label}: ${line}`);
      }
    }
    // The context production bundle replaced Symbol.for("mtrl.ssr"). The development
    // bundles imported below install their own bridge before those cases run.
    const path = `${process.cwd()}/analysis/react-ssr/server-${version}.js`;
    await Bun.write(path, await bundle("scripts/fixtures/react-ssr-server.ts", "bun"));
    const { render } = await import(path);
    const html: string = render();
    assert.match(html, /<template shadowrootmode="open"/);
    assert.match(html, /<style>[\s\S]*?\.mtrl-button/);
    const client = await bundle("scripts/fixtures/react-ssr-client.ts", "browser");
    assert.doesNotMatch(client, /linkedom|DOMParser|SSR element nesting/);
    const suspenseServer = `${process.cwd()}/analysis/react-ssr/suspense-server-${version}.js`;
    await Bun.write(suspenseServer, await bundle("scripts/fixtures/react-ssr-suspense-server.ts", "bun"));
    const { renderShapes, renderHydration, renderRejection, renderMislabelled, renderAborted, renderCeiling, renderGiveUp } = await import(suspenseServer) as SuspenseServer;
    const shapes: Array<[string, { html: string; errors: string[] }]> = await renderShapes();
    for (const [name, result] of shapes) {
      assert.equal(suspendError(result.errors), false, `React ${version} ${name} onError ${JSON.stringify(result.errors)}`);
      assert.equal(/<!--\$!-->/.test(result.html), false, `React ${version} ${name} client-rendered`);
      if (name === "E") {
        assert.match(result.html, /loaded 5/, `React ${version} E`);
        assert.doesNotMatch(result.html, /shadowrootmode/, `React ${version} E is not a host`);
        continue;
      }
      assert.match(result.html, /<template shadowrootmode="open"/, `React ${version} ${name} shadow`);
      assert.match(result.html, name === "A2" ? /lazy loaded/ : /loaded 5/, `React ${version} ${name} content`);
      assert.match(result.html, /<slot/, `React ${version} ${name} projects resolved children`);
    }
    console.log(`React ${version}: suspending children streamed (${shapes.map(([name]) => name).join(", ")})`);
    const mislabelled = await renderMislabelled();
    assert.ok(mislabelled.errors.some((error) => error.includes("Minified React error #426")), `React ${version} mislabelled child onError ${JSON.stringify(mislabelled.errors)}`);
    assert.ok(mislabelled.ms < 1000, `React ${version} mislabelled child retried for ${mislabelled.ms.toFixed(0)} ms`);
    console.log(`React ${version}: a child error copying the production suspend text surfaced in ${mislabelled.ms.toFixed(0)} ms`);
    // The production bundle loads React's production server build and its own copy of the
    // bridge, which samples that build's throw site. Importing it replaces the shared SSR
    // slot, so keep the development slot and put it back before the cases that follow.
    const ssrSymbol = Symbol.for("mtrl.ssr");
    const ssrSlots = globalThis as unknown as Record<symbol, unknown>;
    const devSlot = ssrSlots[ssrSymbol];
    const prodServer = `${process.cwd()}/analysis/react-ssr/suspense-server-${version}-prod.js`;
    await Bun.write(prodServer, await bundle("scripts/fixtures/react-ssr-suspense-server.ts", "bun", "production"));
    const { renderShapes: renderProductionShapes, renderMislabelled: renderProductionMislabelled, renderGiveUp: renderProductionGiveUp } = await import(prodServer) as SuspenseServer;
    const production = await renderProductionShapes();
    const productionMislabelled = await renderProductionMislabelled();
    assert.ok(productionMislabelled.errors.some((error) => error.includes("Minified React error #426")), `React ${version} production mislabelled child onError ${JSON.stringify(productionMislabelled.errors)}`);
    assert.ok(productionMislabelled.ms < 1000, `React ${version} production mislabelled child retried for ${productionMislabelled.ms.toFixed(0)} ms`);
    const productionCap = await mtrlWarnings(() => renderProductionGiveUp());
    ssrSlots[ssrSymbol] = devSlot;
    for (const name of ["A", "F"] as const) {
      const result = production.find(([shape]) => shape === name)?.[1];
      assert.ok(result, `React ${version} production ${name} missing`);
      assert.equal(suspendError(result.errors), false, `React ${version} production ${name} onError ${JSON.stringify(result.errors)}`);
      assert.equal(/<!--\$!-->/.test(result.html), false, `React ${version} production ${name} client-rendered`);
      assert.match(result.html, /<template shadowrootmode="open"/, `React ${version} production ${name} shadow`);
      assert.match(result.html, /loaded 5/, `React ${version} production ${name} content`);
      assert.match(result.html, /<slot/, `React ${version} production ${name} projects resolved children`);
    }
    console.log(`React ${version}: production shapes A and F streamed with a shadow root`);
    const productionGaveUp = productionCap.result;
    assert.equal(suspendError(productionGaveUp.errors) || productionGaveUp.errors.some((error) => error.includes("did not resolve during server rendering")), false, `React ${version} production cap onError ${JSON.stringify(productionGaveUp.errors)}`);
    assert.match(productionGaveUp.html, /loaded 5/, `React ${version} production cap content`);
    assert.doesNotMatch(productionGaveUp.html, /shadowrootmode/, `React ${version} production cap shadow`);
    assert.equal(/<!--\$!-->/.test(productionGaveUp.html), false, `React ${version} production cap client-rendered`);
    assert.ok(productionGaveUp.ms >= 9000 && productionGaveUp.ms < 14000, `React ${version} production cap completed at ${productionGaveUp.ms.toFixed(0)} ms`);
    assert.ok(productionGaveUp.sibling > 20 && productionGaveUp.sibling < 55, `React ${version} production cap sibling renders ${productionGaveUp.sibling}`);
    assert.equal(productionCap.warnings.length, 0, `React ${version} production cap warnings ${JSON.stringify(productionCap.warnings)}`);
    console.log(`React ${version}: production cap streamed in ${productionGaveUp.ms.toFixed(0)} ms after ${productionGaveUp.sibling} sibling renders, no shadow root and no warning`);
    for (const boundary of [true, false]) {
      const rejected = await renderRejection(boundary);
      const where = boundary ? "Suspense" : "no Suspense";
      assert.ok(rejected.errors.some((error) => error.includes("backend down")), `React ${version} rejecting child (${where}) onError ${JSON.stringify(rejected.errors)}`);
      assert.equal(rejected.errors.some((error) => error.includes("suspended while responding to synchronous input")), false, `React ${version} rejecting child (${where}) static suspend ${JSON.stringify(rejected.errors)}`);
      if (boundary) assert.match(rejected.html, /<!--\$!-->/, `React ${version} rejecting child client-rendered`);
      console.log(`React ${version}: rejecting child (${where}) completed in ${rejected.ms.toFixed(0)} ms; onError ${JSON.stringify(rejected.errors)}`);
    }
    const aborted = await renderAborted();
    assert.ok(aborted.ms >= 250 && aborted.ms < 800, `React ${version} abort ended at ${aborted.ms.toFixed(0)} ms`);
    assert.ok(aborted.errors.some((error) => /abort/i.test(error)), `React ${version} abort onError ${JSON.stringify(aborted.errors)}`);
    assert.ok(aborted.during <= 16, `React ${version} abort retried ${aborted.during} times before the abort`);
    assert.equal(aborted.after, 0, `React ${version} retried ${aborted.after} times after abort`);
    console.log(`React ${version}: never-resolving child aborted at ${aborted.ms.toFixed(0)} ms; retries before=${aborted.during}, after=${aborted.after}`);
    const ceiling = await renderCeiling();
    assert.equal(suspendError(ceiling.errors) || ceiling.errors.some((error) => error.includes("did not resolve during server rendering")), false, `React ${version} ceiling errors ${JSON.stringify(ceiling.errors)}`);
    assert.match(ceiling.html, /loaded 5/, `React ${version} ceiling content`);
    assert.match(ceiling.html, /<slot/, `React ${version} ceiling slot`);
    assert.ok(ceiling.sibling <= 40, `React ${version} ceiling sibling renders ${ceiling.sibling}`);
    console.log(`React ${version}: 1s child snapshotted in ${ceiling.ms.toFixed(0)} ms with ${ceiling.sibling} sibling renders`);
    const gaveUpRun = await mtrlWarnings(() => renderGiveUp());
    const gaveUp = gaveUpRun.result;
    assert.equal(suspendError(gaveUp.errors) || gaveUp.errors.some((error) => error.includes("did not resolve during server rendering")), false, `React ${version} cap onError ${JSON.stringify(gaveUp.errors)}`);
    assert.match(gaveUp.html, /loaded 5/, `React ${version} cap content`);
    assert.doesNotMatch(gaveUp.html, /shadowrootmode/, `React ${version} cap shadow`);
    assert.equal(/<!--\$!-->/.test(gaveUp.html), false, `React ${version} cap client-rendered`);
    assert.ok(gaveUp.ms >= 9000 && gaveUp.ms < 14000, `React ${version} cap completed at ${gaveUp.ms.toFixed(0)} ms`);
    assert.ok(gaveUp.sibling > 20 && gaveUp.sibling < 55, `React ${version} cap sibling renders ${gaveUp.sibling}`);
    assert.equal(gaveUpRun.warnings.length, 1, `React ${version} cap warnings ${JSON.stringify(gaveUpRun.warnings)}`);
    assert.match(gaveUpRun.warnings[0] ?? "", /<m-button id="count">/, `React ${version} cap warning ${gaveUpRun.warnings[0]}`);
    console.log(`React ${version}: child resolving past the retry cap streamed in ${gaveUp.ms.toFixed(0)} ms after ${gaveUp.sibling} sibling renders, no shadow root; one warning`);
    const suspenseHtml: string = await renderHydration();
    const suspenseClient = await bundle("scripts/fixtures/react-ssr-suspense-client.ts", "browser");
    assert.doesNotMatch(suspenseClient, /linkedom|DOMParser|SSR element nesting/);
    const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/client.js") return new Response(client, { headers: { "Content-Type": "text/javascript" } });
      if (pathname === "/suspense-client.js") return new Response(suspenseClient, { headers: { "Content-Type": "text/javascript" } });
      if (pathname === "/suspense") {
        return new Response(`<!doctype html><div id="root">${suspenseHtml}</div><script>window.__ssrRoots={late:document.getElementById("late").shadowRoot,sync:document.getElementById("sync").shadowRoot}</script><script type="module" src="/suspense-client.js"></script>`, { headers: { "Content-Type": "text/html" } });
      }
      return new Response(`<!doctype html><div id="root">${html}</div><script type="module" src="/client.js"></script>`, { headers: { "Content-Type": "text/html" } });
    } });
    try {
      const inert = await browser.newPage({ javaScriptEnabled: false });
      await inert.goto(server.url.href);
      assert.deepEqual(await inert.evaluate(() => ["button", "switch", "tabs", "card", "nested"].map(id => !!document.getElementById(id)?.shadowRoot)), [true, true, true, true, true]);
      assert.deepEqual(await inert.evaluate(() => [0, 1, 2].map(index => {
        const host = document.getElementById(`fallback-${index}`)!;
        return { root: !!host.shadowRoot, template: !!host.querySelector("template"), light: host.innerHTML };
      })), [0, 1, 2].map(() => ({ root: false, template: false, light: "<span>Light content</span>" })), "React SSR respects element opt-out");
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
      console.log(`React ${version}: 0 warnings, 0 errors, 0 recoverable errors; deliberate mismatch caught (${mismatch}); no-JS roots, opt-out fallbacks, declarations, events, checked state and client isolation passed`);
      const suspense = await browser.newPage();
      const suspenseWarnings: string[] = [], suspenseErrors: string[] = [];
      suspense.on("console", message => { if (["warning", "error"].includes(message.type())) suspenseWarnings.push(message.text()); });
      suspense.on("pageerror", error => suspenseErrors.push(error.message));
      await suspense.goto(`${server.url}suspense`);
      await suspense.waitForFunction(() => window.reactSuspense?.ready);
      const suspenseRecoverable = await suspense.evaluate(() => window.reactSuspense?.recoverable ?? []);
      assert.deepEqual({ suspenseWarnings, suspenseErrors, suspenseRecoverable }, { suspenseWarnings: [], suspenseErrors: [], suspenseRecoverable: [] }, `React ${version} suspense hydration`);
      const kept = await suspense.evaluate(() => {
        const describe = (id: "late" | "sync") => {
          const host = document.getElementById(id)!;
          return {
            sameRoot: host.shadowRoot === window.__ssrRoots?.[id],
            buttons: host.shadowRoot?.querySelectorAll("button").length ?? 0,
            slots: host.shadowRoot?.querySelectorAll("slot").length ?? 0,
          };
        };
        return { late: describe("late"), sync: describe("sync") };
      });
      assert.deepEqual(kept, {
        late: { sameRoot: true, buttons: 1, slots: 1 },
        sync: { sameRoot: true, buttons: 1, slots: 1 },
      }, `React ${version} kept the declarative shadow`);
      assert.equal(await suspense.getByRole("button", { name: "loaded 5" }).count(), 1, `React ${version} suspended label`);
      assert.equal(await suspense.getByRole("button", { name: "Save", exact: true }).count(), 1, `React ${version} sync label`);
      console.log(`React ${version}: suspended child hydrated on the same shadow root, 0 warnings, 0 errors`);
      await suspense.close();
      await page.close();
    } finally { server.stop(true); }
  }
  await Bun.write("analysis/react-ssr/summary.json", JSON.stringify(summaries, null, 2));
  assert.deepEqual(contextFailures, [], `React context regressions: ${contextFailures.join("; ")}`);
} finally { await browser.close(); }
