#!/usr/bin/env bun
// scripts/check-ssr-prune.ts
// The pruner decides by parsing text; this check asks the browser. For every
// default fixture it reads the inline sheet the server actually shipped, parses
// the full sheet the build emits in the same root, and diffs their style rules
// through CSSOM. Every selector the pruner dropped must match nothing in the
// pre-upgrade shadow tree: root.querySelectorAll(selector) returns no node.
// A selector the engine rejects is a failure (stripped of pseudo-elements, which
// querySelectorAll cannot take, and retried: the stripped form matches a
// superset, so no match there still proves no match for the original).
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { parseHTML } from "linkedom";
import { renderElement } from "../dist/ssr/index.js";
import { elements, SHADOW_BASE_STYLES } from "../dist/elements/index.js";
import { cases } from "./fixtures/preupgrade-cases";
const engine = process.argv.find(arg => arg.startsWith("--engine="))?.split("=")[1] ?? "chromium";
assert(engine === "chromium" || engine === "firefox" || engine === "webkit");
const fixtures = cases.filter(c => c.variant === "default");
assert.deepEqual(fixtures.map(c => c.element).sort(), Object.values(elements).map(e => e.spec.name).sort());
// Hosts that opt out of SSR carry no declarative root; the upgrade check owns them.
const FALLBACK = ["carousel", "fab-menu"];
const specs = new Map(Object.values(elements).map(e => [e.spec.name, e.spec]));
const directory = `analysis/ssr-prune/${engine}`;
await mkdir(directory, { recursive: true });
const text = (path: string): Promise<string> => Bun.file(path).text();
const rendered: { element: string; html: string; full: string }[] = [];
for (const fixture of fixtures) {
  const host = parseHTML(`<html><body>${fixture.html}</body></html>`).document.body.firstElementChild!;
  rendered.push({
    element: fixture.element,
    html: renderElement(`m-${fixture.element}`, Object.fromEntries(Array.from(host.attributes, a => [a.name, a.value])), host.innerHTML),
    // The inline sheet's own sources, in renderStyles order: host, shadow base, the spec's styles.
    full: [
      await text(`dist/elements/css/hosts/${fixture.element}.css`),
      ...(await Promise.all([...SHADOW_BASE_STYLES, ...specs.get(fixture.element)!.styles]
        .map(name => text(`dist/elements/css/${name}.css`)))),
    ].join("\n"),
  });
}
const page = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head><body><main id="stage">` +
  rendered.map(entry => `<section class="case" data-element="${entry.element}">${entry.html}</section>`).join("\n") +
  `</main></body></html>`;
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response(page, { headers: { "Content-Type": "text/html" } }) });
const browser = await ({ chromium, firefox, webkit })[engine].launch();
type Result = { element: string; root: boolean; served: number; full: number; dropped: number; selectors: number; failures: string[] };
let equal = 0;
let failures = 0;
const report: Result[] = [];
const started = performance.now();
try {
  const inert = await browser.newPage({ viewport: { width: 1024, height: 768 }, javaScriptEnabled: false });
  await inert.goto(server.url.href);
  const results = await inert.evaluate(({ entries, fallback }) => {
    type Entry = { count: number; selector?: string };
    const add = (into: Map<string, Entry>, key: string, selector?: string): void => {
      const entry = into.get(key);
      if (entry) entry.count += 1;
      else into.set(key, { count: 1, selector });
    };
    // A key per style rule (`path|selector list`) and per non-style leaf; the
    // path is the chain of grouping at-rules, so rules under different media
    // queries never compare equal.
    const flatten = (rules: CSSRuleList, path: string, into: Map<string, Entry>): void => {
      for (const rule of Array.from(rules)) {
        const any = rule as unknown as { selectorText?: string; cssRules?: CSSRuleList; conditionText?: string; name?: string; cssText: string };
        if (typeof any.selectorText === "string") add(into, `${path}|${any.selectorText}`, any.selectorText);
        else if (any.cssRules) flatten(any.cssRules, `${path}>${any.conditionText ?? any.name ?? ""}`, into);
        else add(into, `${path}|${any.cssText}`);
      }
    };
    const out = [];
    const sections = Array.from(document.querySelectorAll("#stage > .case"));
    if (sections.length !== entries.length) throw new Error(`the page carries ${sections.length} cases, the fixtures ${entries.length}`);
    for (const [index, section] of sections.entries()) {
      const { element, full } = entries[index];
      const failures: string[] = [];
      const host = section.firstElementChild as HTMLElement | null;
      const root = host?.shadowRoot ?? null;
      if (!root) {
        if (!fallback.includes(element)) failures.push("no declarative root");
        out.push({ element, root: false, served: 0, full: full.length, dropped: 0, selectors: 0, failures });
        continue;
      }
      const served = root.querySelector("style");
      if (!served?.sheet) failures.push("no inline style sheet");
      const probe = document.createElement("style");
      probe.textContent = full;
      root.appendChild(probe);
      if (!probe.sheet) failures.push("the full sheet did not parse");
      const servedMap = new Map<string, Entry>();
      const fullMap = new Map<string, Entry>();
      if (served?.sheet) flatten(served.sheet.cssRules, "", servedMap);
      if (probe.sheet) flatten(probe.sheet.cssRules, "", fullMap);
      const servedBytes = served?.textContent?.length ?? 0;
      for (const [key, entry] of servedMap) {
        if ((fullMap.get(key)?.count ?? 0) < entry.count) failures.push(`served rule missing from the full sheet: ${key.slice(0, 160)}`);
      }
      let dropped = 0;
      const selectors = new Set<string>();
      for (const [key, entry] of fullMap) {
        const kept = servedMap.get(key)?.count ?? 0;
        if (kept >= entry.count) continue;
        dropped += entry.count - kept;
        if (entry.selector === undefined) failures.push(`dropped a rule that is not a style rule: ${key.slice(0, 160)}`);
        else selectors.add(entry.selector);
      }
      for (const selector of selectors) {
        let matched: Element[];
        try {
          matched = Array.from(root.querySelectorAll(selector));
        } catch (error) {
          // querySelectorAll refuses pseudo-elements; stripping them widens the
          // match, so a zero here still proves the dropped rule matched nothing.
          const stripped = selector.replace(/::[\w-]+(?:\([^)]*\))?/g, "");
          if (stripped === selector) { failures.push(`selector rejected: ${selector} (${String(error)})`); continue; }
          try { matched = Array.from(root.querySelectorAll(stripped)); }
          catch (again) { failures.push(`selector rejected: ${selector} (${String(again)})`); continue; }
        }
        if (matched.length) failures.push(`${matched.length} node(s) match a dropped selector: ${selector}`);
      }
      probe.remove();
      out.push({ element, root: true, served: servedBytes, full: full.length, dropped, selectors: selectors.size, failures });
    }
    return out;
  }, { entries: rendered.map(({ element, full }) => ({ element, full })), fallback: FALLBACK });
  await inert.close();
  let servedBytes = 0;
  let fullBytes = 0;
  let dropped = 0;
  for (const result of results as Result[]) {
    servedBytes += result.served;
    fullBytes += result.full;
    dropped += result.dropped;
    if (result.failures.length) {
      failures++;
      for (const line of result.failures) console.log(`${engine}/${result.element}: FAIL ${line}`);
    } else equal++;
    if (!result.root) console.log(`${engine}/${result.element}: opted out of SSR, no declarative root`);
    report.push(result);
  }
  const seconds = (performance.now() - started) / 1000;
  await Bun.write(`${directory}/report.json`, JSON.stringify({ engine, equal, failures, servedBytes, fullBytes, dropped, seconds, report }, null, 2));
  console.log(`${engine}: ${dropped} rules dropped, ${servedBytes} of ${fullBytes} style bytes shipped (${(100 - (servedBytes / fullBytes) * 100).toFixed(1)}% less) in ${seconds.toFixed(1)}s`);
  console.log(`SSR prune ${engine}: ${equal} equal, 0 exceptions, ${failures} failures`);
  assert.equal(failures, 0, `${directory}/report.json`);
} finally { await browser.close(); server.stop(true); }
