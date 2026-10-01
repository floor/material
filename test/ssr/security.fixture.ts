// test/ssr/security.fixture.ts
import { afterAll, beforeAll, expect, test } from "bun:test";
import { chromium, type Browser, type Page } from "playwright";
import "./css.fixture";
import { configureHTML } from "../../src/core/dom/html";
import { registerStyles, styleText } from "../../src/elements/styles";
import { withServerScope } from "../../src/ssr/server-dom";
import { serializeNode } from "../../src/ssr/serialize";
const { renderElement } = await import("../../src/ssr");
let browser: Browser;
let page: Page;
beforeAll(async () => { browser = await chromium.launch(); page = await browser.newPage(); });
afterAll(async () => { await browser?.close(); });
const load = async (html: string) => page.setContent(`<!doctype html><body>${html}</body>`);

test("attribute and text round trips cannot inject siblings or executable attributes", async () => {
  const hostile = `" ' & < > </template><img src=x onerror='window.pwned=1'>`;
  await load(renderElement("m-button", { label: hostile, title: hostile, "data-test": hostile }));
  const state = await page.evaluate(() => {
    const host = document.querySelector("m-button")!;
    return { title: host.getAttribute("title"), text: host.shadowRoot!.querySelector("slot")!.textContent,
      injected: document.querySelectorAll("img").length + host.shadowRoot!.querySelectorAll("img").length,
      count: document.body.children.length };
  });
  expect(state).toEqual({ title: hostile, text: hostile, injected: 0, count: 1 });
});
test("malicious names, duplicate folded attributes, unsupported values and NUL reject", () => {
  for (const key of ['x" onmouseover="bad', "onload", "OnClick", "srcdoc", "__proto__", "constructor", "href"]) {
    expect(() => renderElement("m-button", Object.fromEntries([[key, "bad"]]))).toThrow(TypeError);
  }
  expect(() => renderElement("m-button", { TITLE: "one", title: "two" })).toThrow(TypeError);
  expect(() => renderElement("m-button", { title: "\0" })).toThrow(TypeError);
  for (const tag of ['m-button onclick="bad"', "M-button", "<m-button>"]) expect(() => renderElement(tag)).toThrow(TypeError);
});
test("registered CSS rejects mixed-case closing delimiters and NUL", () => {
  const old = styleText("button")!;
  try {
    for (const css of ["</StYlE><script>bad()</script>", "a{content:'\0'}"]) {
      registerStyles({ button: css });
      expect(() => renderElement("m-button")).toThrow("Unsafe raw text");
    }
  } finally { registerStyles({ button: old }); }
});
test("hostile link bases reject; relative and HTTPS URLs are ordered and escaped", async () => {
  for (const base of ["javascript:alert(1)", "data:text/html,x", "//evil.test", "https://u:p@evil.test", "https://x/\" onload=bad", "a\\b", "a\0b", "a?b", "a#b"]) {
    expect(() => renderElement("m-button", {}, "", { styles: "link", cssBase: base })).toThrow(TypeError);
  }
  await load(renderElement("m-button", {}, "", { styles: "link", cssBase: "https://example.invalid/a&b" }));
  expect(await page.evaluate(() => Array.from(document.querySelector("m-button")!.shadowRoot!.querySelectorAll("link"), n => n.getAttribute("href"))))
    .toEqual(["hosts/button", "ripple", "progress", "button"].map(p => `https://example.invalid/a&b/${p}.css`));
});
test("textarea, title, pre, SVG casing and template contexts round trip", async () => {
  const text = '\n</textarea><img onerror="bad()"> & spaces  stay';
  const nodes = withServerScope(({ document }) => {
    const textarea = document.createElement("textarea"); textarea.value = text;
    const title = document.createElement("title"); title.textContent = text;
    const pre = document.createElement("pre"); pre.textContent = text;
    return [textarea, title, pre].map(n => serializeNode(n, () => undefined)).join("");
  });
  await load(renderElement("m-card", {}, nodes + '<svg viewBox="0 0 24 24"><linearGradient id="gradient"></linearGradient></svg><template><m-button>inert</m-button></template>'));
  expect(await page.evaluate(() => ({
    value: document.querySelector("textarea")!.value, title: document.querySelector("title")!.textContent,
    pre: document.querySelector("pre")!.textContent, injected: document.querySelectorAll("img").length,
    viewBox: document.querySelector("svg")!.getAttribute("viewBox"), gradient: !!document.querySelector("linearGradient"),
    inert: document.querySelector<HTMLTemplateElement>("m-card > template")!.content.querySelector("m-button")!.shadowRoot === null,
  })) ).toEqual({ value: text, title: text, pre: text, injected: 0, viewBox: "0 0 24 24", gradient: true, inert: true });
});
test("ambiguous comments and raw-text breakouts reject", () => {
  for (const comment of ["-->", "--!>", ">", "<script>"]) {
    expect(() => withServerScope(({ document }) => serializeNode(document.createComment(comment), () => undefined))).toThrow(TypeError);
  }
  for (const tag of ["style", "script"]) {
    expect(() => withServerScope(({ document }) => {
      const el = document.createElement(tag); el.textContent = `</${tag}><img src=x>`;
      return serializeNode(el, () => undefined);
    })).toThrow(TypeError);
  }
});
test("vetted comments, raw text and nested templates survive Chromium parsing", async () => {
  await load(renderElement("m-card", {}, '<!-- safe --><style>.x{content:"a&b"}</style><script type="application/json">{"x":"a&b"}</script><template><template><b>inert</b></template></template>'));
  expect(await page.evaluate(() => document.querySelector("m-card > style")!.textContent)).toBe('.x{content:"a&b"}');
  expect(await page.evaluate(() => document.querySelector("m-card > script")!.textContent)).toBe('{"x":"a&b"}');
  expect(await page.evaluate(() => document.querySelector<HTMLTemplateElement>("m-card > template")!.content.querySelector<HTMLTemplateElement>("template")!.content.textContent)).toBe("inert");
});
test("children and nested HTML-valued icons use the same policy once per sink", async () => {
  const calls: string[] = [];
  configureHTML({ sanitize(html) { calls.push(html); return html.replace(/onload="bad\(\)"/g, "data-clean=\"yes\""); } });
  let output: string;
  const children = '<m-button icon="&lt;svg onload=&quot;bad()&quot;&gt;&lt;/svg&gt;">Nested</m-button>';
  try { output = renderElement("m-toolbar", {}, children); } finally { configureHTML(null); }
  expect(calls.filter(c => c === children)).toHaveLength(1);
  expect(calls).toContain('<svg onload="bad()"></svg>');
  await load(output!);
  expect(await page.evaluate(() => document.querySelector("m-button")!.shadowRoot!.querySelector("svg")!.hasAttribute("onload"))).toBe(false);
});
test("identity policy explicitly passes approved child HTML through", async () => {
  await load(renderElement("m-card", {}, '<svg onclick="window.pwned=1"></svg>'));
  expect(await page.locator("m-card > svg").getAttribute("onclick")).toBe("window.pwned=1");
});
test("policy errors restore exact global descriptors and preserve the original cause", () => {
  const before = Object.getOwnPropertyDescriptors(globalThis);
  const error = new Error("policy failure");
  configureHTML({ sanitize() { throw error; } });
  try {
    let caught: unknown;
    try { renderElement("m-button", {}, "input"); } catch (e) { caught = e; }
    expect((caught as Error & { cause: unknown }).cause).toBe(error);
  } finally { configureHTML(null); }
  expect(Object.getOwnPropertyDescriptors(globalThis)).toEqual(before);
});
test("two instances preserve unique generated IDs and local references", async () => {
  await load(renderElement("m-switch", { "supporting-text": "Help" }, "One") + renderElement("m-switch", { "supporting-text": "Help" }, "Two"));
  const state = await page.evaluate(() => {
    const ids: string[] = [];
    let references = 0;
    for (const host of Array.from(document.querySelectorAll("m-switch"))) {
      const root = host.shadowRoot!;
      ids.push(...Array.from(root.querySelectorAll("[id]"), n => n.id));
      for (const node of Array.from(root.querySelectorAll("[for], [aria-describedby], [aria-labelledby]"))) {
        for (const attr of ["for", "aria-describedby", "aria-labelledby"]) for (const id of (node.getAttribute(attr) ?? "").split(/\s+/).filter(Boolean)) {
          if (!root.getElementById(id)) throw new Error(`Broken reference ${id}`);
          references++;
        }
      }
    }
    return { unique: new Set(ids).size === ids.length, references };
  });
  expect(state.unique).toBe(true);
  expect(state.references).toBeGreaterThan(0);
});
