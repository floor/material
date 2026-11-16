// Server-rendered tab names, measured before any client library runs.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSSRApp, h } from "vue";
import { renderToString as renderVue } from "@vue/server-renderer";
import { createComponent } from "solid-js";
import { renderToString as renderSolid } from "solid-js/web";
import "./fixtures/ssr-css";
import { renderElement } from "../src/ssr";
import { Tab as ReactTab } from "../src/react/tab";
import { MTab as VueTab } from "../src/vue/tab";
import { Tab as SolidTab } from "../src/solid/tab";

export async function checkTabsSSRName(): Promise<void> {
  const icon = "<svg viewBox='0 0 24 24'><path d='M4 4h16v16H4z'/></svg>";
  const props = { value: "home", icon, ariaLabel: "Home tab" };
  const warnings: string[] = [];
  const original = console.error;
  const declarations: Array<{ entry: string; html: string }> = [];
  console.error = (...args: unknown[]) => { warnings.push(args.map(String).join(" ")); };
  try {
    declarations.push(
      { entry: "react", html: renderToStaticMarkup(createElement(ReactTab, props)) },
      { entry: "vue", html: await renderVue(createSSRApp(() => h(VueTab, props))) },
      { entry: "solid", html: renderSolid(() => createComponent(SolidTab, props)) },
    );
  } finally { console.error = original; }
  const cases = [
    { entry: "value", html: '<m-tab value="home" icon="' + icon + '"></m-tab>', expected: "home" },
    { entry: "badge", html: '<m-tab value="home" icon="' + icon + '" badge="3"></m-tab>', expected: "home, 3" },
    { entry: "explicit", html: '<m-tab value="home" icon="' + icon + '" aria-label="Home tab" badge="3"></m-tab>', expected: "Home tab, 3" },
    { entry: "text", html: '<m-tab value="home" icon="' + icon + '" badge="3">Visible</m-tab>', expected: "Visible, 3" },
    ...declarations.map(row => ({ ...row, expected: "Home tab" })),
  ];
  const html = cases.map(row => renderElement("m-tabs", { id: row.entry, "aria-label": "Nav" }, row.html)).join("");
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch() {
    return new Response("<!doctype html><html><body>" + html + "</body></html>", {
      headers: { "Content-Type": "text/html" },
    });
  } });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.goto(String(server.url));
    const rows = await page.evaluate(entries => entries.map(entry => {
      const host = document.getElementById(entry)!;
      const tab = host.shadowRoot!.querySelector('[role="tab"]')!;
      const declaration = host.querySelector("m-tab")!;
      return { entry, label: tab.getAttribute("aria-label"), value: tab.getAttribute("value"),
        declarationLabel: declaration.getAttribute("aria-label") };
    }), cases.map(row => row.entry));
    const cdp = await page.context().newCDPSession(page);
    const tree = await cdp.send("Accessibility.getFullAXTree") as {
      nodes: Array<{ role?: { value?: string }; name?: { value?: string } }>;
    };
    const names = tree.nodes.filter(node => node.role?.value === "tab").map(node => node.name?.value ?? "");
    await cdp.detach();
    console.log("SSR tab name rows: " + JSON.stringify({ rows, names, warnings }));
    await mkdir("analysis/browser", { recursive: true });
    await Bun.write("analysis/browser/tabs-ssr-name.json", JSON.stringify({
      ciRun: process.env.GITHUB_RUN_ID ?? null, rows, names, warnings,
    }, null, 2) + "\n");
    assert.deepEqual(names, cases.map(row => row.expected), "SSR accessible names before client scripts");
    for (const entry of ["react", "vue", "solid"]) {
      assert.equal(rows.find(row => row.entry === entry)!.declarationLabel, "Home tab", entry + " maps ariaLabel");
    }
    assert.deepEqual(warnings, [], "declaration adapters emit no ARIA warnings");
    console.log("SSR tab value names and adapter declaration labels passed in Chromium.");
  } finally { await browser.close(); server.stop(true); }
}

if (import.meta.main) await checkTabsSSRName();
