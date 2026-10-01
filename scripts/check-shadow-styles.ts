#!/usr/bin/env bun
// scripts/check-shadow-styles.ts
// Investigation only: report missing component sheets without modifying specs.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { elements } from "../dist/elements/index.js";
import { cases, type PreupgradeCase } from "./fixtures/preupgrade-cases";
import type { ShadowStylesAPI } from "./fixtures/shadow-styles";

declare global { interface Window { shadowStyles: ShadowStylesAPI } }
const fixtures: Array<PreupgradeCase & { defaults?: "dialog" | "card" }> = [...cases,
  { element: "dialog", variant: "open fullscreen divider", html: '<m-dialog open fullscreen divider headline="Title"><m-button slot="actions">Save</m-button>Content</m-dialog>' },
  { element: "dialog", variant: "open close-button divider", html: '<m-dialog open close-button divider headline="Title">Content</m-dialog>' },
  { element: "snackbar", variant: "open action dismissible", html: '<m-snackbar open action="Undo" dismissible>Saved</m-snackbar>' },
  { element: "tabs", variant: "badge", html: '<m-tabs><m-tab value="a" badge="3">Inbox</m-tab></m-tabs>' },
  { element: "toolbar", variant: "overflow", html: '<m-toolbar><m-menu slot="overflow"><m-menu-item value="a">More</m-menu-item></m-menu></m-toolbar>' },
  { element: "fab-menu", variant: "open menu", html: '<m-fab-menu open presentation="menu"><m-fab-menu-item value="a">Alpha</m-fab-menu-item><m-fab-menu-item value="b">Beta</m-fab-menu-item></m-fab-menu>' },
  { element: "dialog", variant: "global button defaults", html: '<m-dialog open headline="Title">Content</m-dialog>', defaults: "dialog" },
  { element: "card", variant: "global button defaults", html: '<m-card headline="Title">Content</m-card>', defaults: "card" },
];
const bundle = await Bun.build({ entrypoints: ["scripts/fixtures/shadow-styles.ts"], target: "browser" });
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === "/fixture.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
  if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
  return new Response('<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head><body><script type="module" src="/fixture.js"></script></body></html>', { headers: { "Content-Type": "text/html" } });
} });
const browser = await chromium.launch();
const report = [];
const seen = new Set<string>();
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const fixture of fixtures) {
    await page.goto(server.url.href);
    await page.waitForFunction(() => !!window.shadowStyles);
    const result = await page.evaluate(({ html, defaults }) => window.shadowStyles.probe(html, defaults), fixture);
    result.roots.forEach(name => seen.add(name));
    report.push({ element: fixture.element, variant: fixture.variant, ...result });
  }
  assert.deepEqual([...seen].sort(), Object.values(elements).map(entry => entry.spec.name).sort());
  assert.deepEqual(errors, []);
  await mkdir("analysis", { recursive: true });
  await Bun.write("analysis/shadow-styles-chromium.json", JSON.stringify(report, null, 2));
  const missing = new Map<string, Set<string>>();
  for (const fixture of report) for (const row of fixture.rows.filter(row => !row.adopted)) {
    const key = `${row.element}\t${row.className}\t${row.sheet}`;
    const properties = missing.get(key) ?? new Set<string>();
    Object.keys(row.changes).forEach(property => properties.add(property));
    missing.set(key, properties);
  }
  console.log(`${seen.size} elements, ${fixtures.length} fixtures, ${report.reduce((n, fixture) => n + fixture.rows.length, 0)} cross-component class probes`);
  for (const [key, properties] of missing) console.log(`${key}\t${properties.size} computed properties changed`);
  console.log(`${missing.size} missing-sheet class findings; analysis/shadow-styles-chromium.json`);
} finally { await browser.close(); server.stop(true); }
