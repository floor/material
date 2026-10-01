#!/usr/bin/env bun
// scripts/check-solid-ssr.ts
// Built-package Solid SSR: every element's default case, parser consumption,
// hydration and browser isolation. Build first.
//
//   bun run build && bun run solid-ssr:check
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { transformAsync } from "@babel/core";
import { parseHTML } from "linkedom";
import { chromium } from "playwright";
import type { BunPlugin } from "bun";
import { declarations, elements } from "../src/elements";
import { cases } from "./fixtures/preupgrade-cases";

const OPT_OUT = new Set(["carousel", "fab-menu", "toolbar"]);
const pascal = (name: string): string => name.replace(/(^|-)([a-z])/g, (_, __, c: string) => c.toUpperCase());
const camel = (name: string): string => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

interface SpecAttributes { attributes?: Record<string, { type?: string }> }
const specs = new Map<string, SpecAttributes>();
for (const element of Object.values(elements)) specs.set(element.spec.name, element.spec);
for (const declaration of Object.values(declarations)) specs.set(declaration.name, declaration);

interface DomNode { nodeType: number; textContent: string | null }
interface DomElement extends DomNode {
  localName: string;
  attributes: Iterable<{ name: string; value: string }>;
  childNodes: Iterable<DomNode>;
  children: Iterable<DomElement>;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  querySelector(selector: string): DomElement | null;
}

const defaults = cases.filter((item) => item.variant === "default");
const missing = [...specs.keys()].filter((name) => specs.get(name)?.attributes && Object.values(elements).some((element) => element.spec.name === name) && !defaults.some((item) => item.element === name));
assert.deepEqual(missing, [], `default SSR case missing for ${missing.join(", ")}`);

const used = new Set<string>();
const expr = (value: string): string => `{${JSON.stringify(value)}}`;
const renderNode = (element: DomElement, extra: string[] = []): string => {
  const name = element.localName.slice(2);
  const spec = specs.get(name);
  assert(spec, `no Solid component for <${element.localName}>`);
  used.add(pascal(name));
  const attrs = [...extra];
  for (const attribute of element.attributes) {
    const known = !!spec.attributes && Object.prototype.hasOwnProperty.call(spec.attributes, attribute.name);
    const prop = known ? camel(attribute.name) : attribute.name;
    const type = known ? spec.attributes?.[attribute.name]?.type : undefined;
    if (type === "boolean") attrs.push(`${prop}={${attribute.value === "false" ? "false" : "true"}}`);
    else attrs.push(`${prop}=${expr(attribute.value)}`);
  }
  const inner = [...element.childNodes].map((node) => {
    if (node.nodeType === 3) {
      const text = node.textContent ?? "";
      return text.trim() ? `{${JSON.stringify(text)}}` : "";
    }
    return node.nodeType === 1 ? renderNode(node as DomElement) : "";
  }).join("");
  return `<${pascal(name)} ${attrs.join(" ")}>${inner}</${pascal(name)}>`;
};

const pieces: string[] = [];
for (const item of defaults) {
  const host = parseHTML(`<html><body>${item.html}</body></html>`).document.body.firstElementChild as DomElement | null;
  assert(host, item.element);
  const extra = [`id=${expr(`host-${item.element}`)}`];
  let markup = renderNode(host, extra);
  if (item.element === "button") {
    markup = `<form onSubmit={(event) => { event.preventDefault(); setClicks((count) => count + 1); }}>${markup.replace(`id=${expr(`host-${item.element}`)}`, `id=${expr(`host-${item.element}`)} type="submit"`)}</form>\n<output id="clicks">{clicks()}</output>`;
  }
  if (item.element === "switch") markup += `\n<output id="checked">{checked() ? "true" : "false"}</output>`;
  pieces.push(markup);
}
// The switch above is built before the checked binding is added. Add it on the host.
const switchHost = `id=${expr("host-switch")}`;
const app = `import { createSignal } from "solid-js";
import { ${[...used].sort().join(", ")} } from "mtrl/solid";

export const App = () => {
  const [clicks, setClicks] = createSignal(0);
  const [checked, setChecked] = createSignal(true);
  return <main>
${pieces.join("\n").replace(switchHost, `${switchHost} checked={checked()} onChange={(event) => setChecked(event.detail.checked)}`)}
  </main>;
};
`;

const dir = join(process.cwd(), "analysis/solid-ssr");
await mkdir(dir, { recursive: true });
await Bun.write(join(dir, "App.tsx"), app);
await Bun.write(join(dir, "server.tsx"), `import "mtrl/ssr/solid";
import { generateHydrationScript, renderToString } from "solid-js/web";
import { App } from "./App";
export const renderBody = (): string => renderToString(() => <App />);
export const hydrationScript = (): string => generateHydrationScript();
`);
await Bun.write(join(dir, "client.tsx"), `import { hydrate } from "solid-js/web";
import { App } from "./App";
const ids = [...document.querySelectorAll("[id^='host-']")].map((node) => node.id);
const before = new Map(ids.map((id) => [id, document.getElementById(id)?.shadowRoot ?? null]));
const state: { ready: boolean; same: Record<string, boolean | null> } = { ready: false, same: {} };
Object.assign(window, { solidSSR: state });
hydrate(() => <App />, document.getElementById("root") as HTMLElement);
for (const id of ids) {
  const previous = before.get(id) ?? null;
  state.same[id] = previous ? document.getElementById(id)?.shadowRoot === previous : null;
}
state.ready = true;
`);

const solid = (generate: "dom" | "ssr"): BunPlugin => ({
  name: "solid",
  setup(build) {
    build.onLoad({ filter: /solid-ssr\/.+\.tsx$/ }, async ({ path }) => {
      const result = await transformAsync(await Bun.file(path).text(), {
        filename: path,
        presets: [["babel-preset-solid", { generate, hydratable: true }], "@babel/preset-typescript"],
      });
      return { contents: result?.code ?? "", loader: "js" };
    });
  },
});

const bundle = async (entry: string, target: "browser" | "bun"): Promise<string> => {
  const loaded: string[] = [];
  const result = await Bun.build({
    entrypoints: [entry],
    target,
    conditions: ["development"],
    plugins: [solid(target === "bun" ? "ssr" : "dom"), {
      name: "ssr-isolation", setup(build) {
        build.onLoad({ filter: /.*/ }, (args) => { loaded.push(args.path); return undefined; });
      },
    }],
    define: { "process.env.NODE_ENV": '"development"' },
  });
  assert(result.success, result.logs.map(String).join("\n"));
  if (target === "browser") {
    assert(!loaded.some((path) => /\/(?:ssr|linkedom)\//.test(path)), `Client loaded server code:\n${loaded.filter((path) => /ssr|linkedom/.test(path)).join("\n")}`);
  }
  const code = await result.outputs[0].text();
  if (target === "browser") assert.doesNotMatch(code, /linkedom|from"mtrl\/ssr"|from 'mtrl\/ssr'/);
  return code;
};

const serverBundle = await bundle(join(dir, "server.tsx"), "bun");
// A `.js` import beside `server.tsx` resolves to the TypeScript source. The bundle needs its own name.
const serverPath = join(process.cwd(), ".check-solid-ssr.js");
await Bun.write(serverPath, serverBundle);
let html: string;
let head: string;
try {
  const loaded = await import(serverPath);
  html = (loaded as { renderBody: () => string }).renderBody();
  head = (loaded as { hydrationScript: () => string }).hydrationScript();
} finally {
  await Bun.file(serverPath).delete();
}
const client = await bundle(join(dir, "client.tsx"), "browser");

interface Report {
  element: string;
  template: boolean;
  shadowBeforeScript: boolean;
  sameRoot: boolean | null;
  descendantShadow: boolean | null;
  warnings: number;
  errors: number;
}
const parsed = parseHTML(`<html><body>${html}</body></html>`).document;
const reports = new Map<string, Report>();
for (const item of defaults) {
  const host = parsed.getElementById(`host-${item.element}`) as DomElement | null;
  assert(host, `missing host-${item.element} in server HTML`);
  const template = [...host.children].some((child) => child.localName === "template" && child.hasAttribute("shadowrootmode"));
  const descendant = item.element === "toolbar"
    ? [...(host.querySelector("m-icon-button") as DomElement).children].some((child) => child.localName === "template" && child.hasAttribute("shadowrootmode"))
    : null;
  assert.equal(template, !OPT_OUT.has(item.element), `${item.element} template`);
  if (descendant !== null) assert.equal(descendant, true, "toolbar's icon button still declares a shadow root");
  reports.set(item.element, {
    element: item.element, template, shadowBeforeScript: false, sameRoot: null, descendantShadow: descendant, warnings: 0, errors: 0,
  });
}

const browser = await chromium.launch();
const server = Bun.serve({
  hostname: "127.0.0.1", port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/client.js") return new Response(client, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
    return new Response(`<!doctype html><html><head><link rel="stylesheet" href="/styles.css">${head}</head><body><div id="root">${html}</div><script type="module" src="/client.js"></script></body></html>`, { headers: { "Content-Type": "text/html" } });
  },
});
try {
  const inert = await browser.newPage({ javaScriptEnabled: false });
  await inert.goto(server.url.href);
  const before = await inert.evaluate(() => [...document.querySelectorAll("[id^='host-']")].map((node) => ({
    id: node.id,
    shadow: !!node.shadowRoot,
    childShadow: node.id === "host-toolbar" ? !!node.querySelector("m-icon-button")?.shadowRoot : null,
  })));
  for (const row of before) {
    const element = row.id.slice("host-".length);
    const report = reports.get(element);
    assert(report, element);
    report.shadowBeforeScript = row.shadow;
    assert.equal(row.shadow, !OPT_OUT.has(element), `${element} shadow root before script`);
    if (row.childShadow !== null) assert.equal(row.childShadow, true, "toolbar's icon button has a shadow root before script");
  }
  await inert.close();

  const page = await browser.newPage();
  const pageWarnings: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "warning" || message.type() === "error") pageWarnings.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(server.url.href);
  await page.waitForFunction(() => (window as unknown as { solidSSR?: { ready: boolean } }).solidSSR?.ready);
  const same = await page.evaluate(() => (window as unknown as { solidSSR: { same: Record<string, boolean | null> } }).solidSSR.same);
  for (const [element, report] of reports) {
    report.sameRoot = same[`host-${element}`] ?? null;
    report.warnings = pageWarnings.length;
    report.errors = pageErrors.length;
    if (!OPT_OUT.has(element)) assert.equal(report.sameRoot, true, `${element} did not keep its declarative shadow root`);
    else assert.equal(report.sameRoot, null, `${element} had a declarative root`);
  }
  const upgraded = await page.evaluate(() => !!(document.getElementById("host-button") as HTMLElement & { component?: unknown }).component);
  assert.equal(upgraded, true, "button did not upgrade");
  // Every default host shares the page, and fixed bars cover the first controls.
  // Clicking the host fires the same listener a pointer click would.
  await page.evaluate(() => document.getElementById("host-button")?.click());
  await page.waitForFunction(() => document.getElementById("clicks")?.textContent === "1");
  await page.evaluate(() => {
    const host = document.getElementById("host-switch");
    (host?.shadowRoot?.querySelector("input") ?? host)?.click();
  });
  await page.waitForFunction(() => document.getElementById("checked")?.textContent === "false");
  assert.equal(await page.locator("#host-switch").getByRole("switch", { name: "Wi-Fi" }).isChecked(), false);
  assert.deepEqual({ warnings: pageWarnings, errors: pageErrors }, { warnings: [], errors: [] });
  await page.close();
} finally {
  server.stop(true);
  await browser.close();
}

const summary = [...reports.values()];
await Bun.write(join(dir, "summary.json"), JSON.stringify(summary, null, 2));
for (const report of summary) {
  const root = report.sameRoot === null ? "n/a" : report.sameRoot ? "kept" : "replaced";
  console.log(`${report.element}: template=${report.template ? "yes" : "no"} shadow=${report.shadowBeforeScript ? "yes" : "no"} sameRoot=${root} warnings=${report.warnings} errors=${report.errors}`);
}
console.log(`solid-ssr: ${summary.length} elements, ${summary.filter((report) => report.warnings === 0 && report.errors === 0).length} with 0 warnings and 0 errors; click and checked state passed; client bundle has no mtrl/ssr or linkedom`);
