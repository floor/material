#!/usr/bin/env bun
// scripts/check-shadow-styles.ts
//
// Every component class drawn in an element's shadow root has its sheet adopted
// there. A shadow root adopts only the host's, the ripple's and the
// spec's `styles`, so a factory that renders another component inside it (the
// dialog's buttons and dividers) needs that component's sheet in its spec, or
// the part renders unstyled. All 36 elements across the preupgrade cases and
// the configurations below; any class whose sheet is missing fails, whether or
// not it changes a computed style today. The diff a missing sheet would make
// is written to analysis/shadow-styles-chromium.json. From a probe taken
// during the part B review.
//
// One page serves every fixture: the elements are defined once, and each
// fixture is measured after the body has been cleared, so nothing a factory
// portaled to the body outlives the fixture that put it there. This is the
// page model scripts/check-elements.ts uses; a navigation per fixture re-ran
// the whole element bundle 1,797 times.
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
  await page.goto(server.url.href);
  await page.waitForFunction(() => !!window.shadowStyles);
  const guard = await page.evaluate(() => window.shadowStyles.settleGuard());
  assert.equal(guard.ended, true, `The settle returned before a 60 ms transition in a shadow root ended (${guard.elapsed} ms)`);
  console.log(`Settle guard: a 60 ms shadow-root transition ended before the settle returned (${guard.elapsed} ms).`);
  for (const fixture of fixtures) {
    const result = await page.evaluate(({ html, defaults }) => {
      // The probe removes its own container, and a factory may have portaled a
      // node (a menu, a tooltip) to the body: the fixture is measured on a body
      // that holds only its markup, as a fresh page had it.
      document.body.innerHTML = "";
      return window.shadowStyles.probe(html, defaults);
    }, fixture);
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
  const probes = report.reduce((n, fixture) => n + fixture.rows.length, 0);
  const findings = [...missing].map(([key, properties]) => `${key.replaceAll("\t", " ")}: ${properties.size} computed properties differ`);
  assert.deepEqual(findings, [], `classes drawn without their sheet (add it to the element's spec.styles):\n${findings.join("\n")}`);
  const reset = await page.evaluate(() => window.shadowStyles.auditControlReset());
  await mkdir("analysis/browser", { recursive: true });
  await Bun.write("analysis/browser/shadow-control-reset.json", JSON.stringify(reset, null, 2));
  assert.deepEqual([...new Set(reset.map(row => row.element))].sort(), Object.values(elements).map(entry => entry.spec.name).sort());
  const resetFailures: string[] = [];
  for (const fixture of reset) {
    assert.equal(fixture.elementCount, fixture.factoryCount, `${fixture.element} ${fixture.variant}: native control counts`);
    for (const row of fixture.rows) {
      assert.equal(row.tag, row.factoryTag, `${fixture.element}: control type`);
      assert.equal(row.className, row.factoryClass, `${fixture.element}: control identity`);
      if (Object.keys(row.differences).length) resetFailures.push(`${fixture.element} ${fixture.variant} ${row.className}: ${JSON.stringify(row.differences)}`);
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(resetFailures, [], `Shadow controls differ from factory padding, margin or font:\n${resetFailures.join("\n")}`);
  console.log(`Passed shadow control reset: ${new Set(reset.map(row => row.element)).size} elements, ${reset.length} fixtures, ${reset.reduce((sum, fixture) => sum + fixture.rows.length, 0)} native controls match their factories.`);
  console.log(`Passed shadow styles: ${seen.size} elements, ${fixtures.length} fixtures, ${probes} cross-component classes, each with its sheet adopted.`);
} finally { await browser.close(); server.stop(true); }
