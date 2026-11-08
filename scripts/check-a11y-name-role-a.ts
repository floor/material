/**
 * Chromium CDP regression for SplitButton group naming, Switch labeling and
 * required Radios. Host and unrelated wrapper duplication remains unresolved.
 * Sources read 2026-11-07:
 * https://w3c.github.io/aria/#group
 * https://w3c.github.io/aria/#switch
 * https://w3c.github.io/aria/#aria-required
 * https://m3.material.io/components/radio-button/accessibility
 * Author attributes remain on their original hosts; no DOM method is overridden.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import * as sass from "sass";
import { componentStyles } from "./style-manifest";

interface Subject { element: HTMLElement }
interface FixtureWindow extends Window {
  m: Record<string, (config: Record<string, unknown>) => Subject>;
  ready: boolean;
  author: Record<string, string>;
}
interface Case {
  id: string;
  factory?: string;
  config?: Record<string, unknown>;
  html?: string;
  role: "group" | "switch" | "radiogroup";
  name: string;
  leading?: string;
  required?: boolean;
}
const compile = (source: string): string => sass.compileString(`@use "${source}";`, {
  loadPaths: ["src/styles"], style: "compressed", logger: sass.Logger.silent,
}).css;
const css = compile("main");
const sheets = Object.fromEntries(Object.entries(componentStyles).map(([name, entry]) => [name, compile(entry.source)]));
sheets.ripple = compile("utilities/ripple");
const bundle = async (path: string): Promise<string> => {
  const built = await Bun.build({ entrypoints: [path], target: "browser" });
  assert(built.success, String(built.logs)); return built.outputs[0].text();
};
const factories = await bundle("src/index.ts");
const elements = await bundle("src/elements/index.ts");
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === "/factories.js" || path === "/elements.js") return new Response(path === "/factories.js" ? factories : elements, { headers: { "Content-Type": "text/javascript" } });
  return new Response(`<!doctype html><html data-theme="baseline"><head><style>${css}</style></head><body><main id="stage"></main><script type="module">window.m=await import('/factories.js');const e=await import('/elements.js');e.registerStyles(${JSON.stringify(sheets)});e.defineAll();window.ready=true;</script></body></html>`, { headers: { "Content-Type": "text/html" } });
} });
const radioChildren = '<m-radio value="s">Small</m-radio><m-radio value="m">Medium</m-radio>';
const options = [{ value: "s", label: "Small" }, { value: "m", label: "Medium" }];
const cases: Case[] = [
  ...[false, true].flatMap(explicit => [
    { id: `factory-split-${explicit ? "explicit" : "omitted"}-group-label`, factory: "createSplitButton", config: { text: "Send", ariaLabel: "Send email", ...(explicit ? { groupLabel: "Send actions" } : {}) }, role: "group" as const, name: explicit ? "Send actions" : "", leading: "Send email" },
    { id: `element-split-${explicit ? "explicit" : "omitted"}-group-label`, html: `<m-split-button id="target" aria-label="Send email" trailing-aria-label="More options" ${explicit ? 'group-label="Send actions"' : ''}>Send</m-split-button>`, role: "group" as const, name: explicit ? "Send actions" : "", leading: "Send email" },
  ]),
  { id: "element-switch-label", html: '<m-switch id="target" aria-label="Wi-Fi"></m-switch>', role: "switch", name: "Wi-Fi" },
  ...[false, true].flatMap(required => [
    { id: `factory-radios-required-${required}`, factory: "createRadios", config: { ariaLabel: "Size", name: "size", required, options }, role: "radiogroup" as const, name: "Size", required },
    { id: `element-radios-required-${required}`, html: `<m-radios id="target" aria-label="Size" ${required ? "required" : ""}>${radioChildren}</m-radios>`, role: "radiogroup" as const, name: "Size", required },
  ]),
];
const browser = await chromium.launch({ headless: true });
const failures: string[] = [];
let checks = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Accessibility.enable");
  const settle = () => page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  const verify = async (spec: Case): Promise<void> => {
    const nodes = (await cdp.send("Accessibility.getFullAXTree")).nodes.filter(node => !node.ignored);
    const matches = nodes.filter(node => node.role?.value === spec.role);
    assert.equal(matches.length, 1, `${spec.id}: one ${spec.role}`);
    assert.equal(matches[0].name?.value ?? "", spec.name, `${spec.id}: ${spec.role} name`);
    if (spec.leading) assert.equal(nodes.filter(node => node.role?.value === "button" && node.name?.value === spec.leading).length, 1, `${spec.id}: leading button name`);
    if (spec.required !== undefined) {
      const required = matches[0].properties?.find(property => property.name === "required")?.value.value;
      assert.equal(required, spec.required, `${spec.id}: AX required`);
      const dom = await page.evaluate(() => {
        const target = document.getElementById("target")!;
        const root = target.shadowRoot ?? target;
        const group = target.getAttribute("role") === "radiogroup" ? target : root.querySelector('[role="radiogroup"]')!;
        return { required: group.getAttribute("aria-required"), inputs: [...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map(input => input.required) };
      });
      assert.equal(dom.required, spec.required ? "true" : null, `${spec.id}: aria-required`);
      assert.deepEqual(dom.inputs, [spec.required, spec.required], `${spec.id}: native required flags`);
    }
    if (spec.html) assert.equal(await page.evaluate(() => {
      const win = window as unknown as FixtureWindow;
      const host = document.getElementById("target")!;
      return host.getAttribute === Element.prototype.getAttribute && host.hasAttribute === Element.prototype.hasAttribute
        && Object.entries(win.author).every(([name, value]) => Element.prototype.getAttribute.call(host, name) === value)
        && host.matches('[aria-label]') && host.outerHTML.includes('aria-label=') && host.ariaLabel === win.author['aria-label'];
    }), true, `${spec.id}: author attributes, selectors, serialization and native getters`);
  };
  const test = async (name: string, action: () => Promise<void>): Promise<void> => {
    checks++;
    try { await action(); console.log(`PASS ${name}`); }
    catch (error) { failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`); }
  };
  for (const spec of cases) {
    await page.goto(`http://127.0.0.1:${server.port}`);
    await page.waitForFunction(() => (window as unknown as FixtureWindow).ready);
    await page.evaluate(spec => {
      const win = window as unknown as FixtureWindow;
      const stage = document.getElementById("stage")!;
      if (spec.factory) {
        const created = win.m[spec.factory](spec.config ?? {});
        created.element.id = "target"; stage.append(created.element);
      } else {
        const template = document.createElement("template"); template.innerHTML = spec.html!;
        win.author = Object.fromEntries([...template.content.firstElementChild!.attributes].map(attr => [attr.name, attr.value]));
        stage.append(template.content);
      }
    }, spec);
    await settle();
    await test(spec.id, () => verify(spec));
    if (spec.html && spec.role === "radiogroup" && spec.required) {
      await test("element radio required removal and re-addition", async () => {
        for (const required of [false, true]) {
          await page.evaluate(required => {
            document.getElementById("target")!.toggleAttribute("required", required);
            const win = window as unknown as FixtureWindow;
            if (required) win.author.required = ""; else delete win.author.required;
          }, required);
          await settle(); await verify({ ...spec, required });
        }
      });
    }
  }
  assert.deepEqual(errors, [], "Uncaught page errors");
} finally { await browser.close(); server.stop(true); }
assert.equal(failures.length, 0, `Form accessibility: ${failures.length}/${checks} failed\n${failures.join("\n")}`);
console.log(`Passed form accessibility: ${checks} focused CDP/DOM scenarios.`);
