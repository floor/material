#!/usr/bin/env bun
// scripts/check-ssr-security.ts
// Reparse source SSR output in Chromium; kept out of the browser-free bun suites.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import "./fixtures/ssr-css";
import { configureHTML } from "../src/core/dom/html";
import { withServerScope } from "../src/ssr/server-dom";
import { serializeNode } from "../src/ssr/serialize";
import { renderElement } from "../src/ssr/index.ts";

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const load = async (html: string) => page.setContent(`<!doctype html><body>${html}</body>`);
  const check = async (name: string, run: () => Promise<void>) => {
    await run();
    console.log(`PASS ${name}`);
  };

  await check("attribute and text round trips cannot inject siblings or executable attributes", async () => {
    const hostile = `" ' & < > </template><img src=x onerror='window.pwned=1'>`;
    await load(renderElement("m-button", { label: hostile, title: hostile, "data-test": hostile }));
    const state = await page.evaluate(() => {
      const host = document.querySelector("m-button")!;
      return { title: host.getAttribute("title"), text: host.shadowRoot!.querySelector("slot")!.textContent,
        injected: document.querySelectorAll("img").length + host.shadowRoot!.querySelectorAll("img").length,
        count: document.body.children.length };
    });
    assert.deepEqual(state, { title: hostile, text: hostile, injected: 0, count: 1 });
  });
  await check("stylesheet URLs survive Chromium parsing", async () => {
    await load(renderElement("m-button", {}, "", { styles: "link", cssBase: "https://example.invalid/a&b" }));
    assert.deepEqual(await page.evaluate(() => Array.from(document.querySelector("m-button")!.shadowRoot!.querySelectorAll("link"), n => n.getAttribute("href"))), ["hosts/button", "ripple", "progress", "button"].map(p => `https://example.invalid/a&b/${p}.css`));
  });
  await check("textarea, title, pre, SVG casing and template contexts round trip", async () => {
    const text = '\n</textarea><img onerror="bad()"> & spaces  stay';
    const nodes = withServerScope(({ document }) => {
      const textarea = document.createElement("textarea"); textarea.value = text;
      const title = document.createElement("title"); title.textContent = text;
      const pre = document.createElement("pre"); pre.textContent = text;
      return [textarea, title, pre].map(n => serializeNode(n, () => undefined)).join("");
    });
    await load(renderElement("m-card", {}, nodes + '<svg viewBox="0 0 24 24"><linearGradient id="gradient"></linearGradient></svg><template><m-button>inert</m-button></template>'));
    assert.deepEqual(await page.evaluate(() => ({
      value: document.querySelector("textarea")!.value, title: document.querySelector("title")!.textContent,
      pre: document.querySelector("pre")!.textContent, injected: document.querySelectorAll("img").length,
      viewBox: document.querySelector("svg")!.getAttribute("viewBox"), gradient: !!document.querySelector("linearGradient"),
      inert: document.querySelector<HTMLTemplateElement>("m-card > template")!.content.querySelector("m-button")!.shadowRoot === null,
    })), { value: text, title: text, pre: text, injected: 0, viewBox: "0 0 24 24", gradient: true, inert: true });
  });
  await check("vetted comments, raw text and nested templates survive Chromium parsing", async () => {
    await load(renderElement("m-card", {}, '<!-- safe --><style>.x{content:"a&b"}</style><script type="application/json">{"x":"a&b"}</script><template><template><b>inert</b></template></template>'));
    assert.deepEqual(await page.evaluate(() => document.querySelector("m-card > style")!.textContent), '.x{content:"a&b"}');
    assert.deepEqual(await page.evaluate(() => document.querySelector("m-card > script")!.textContent), '{"x":"a&b"}');
    assert.deepEqual(await page.evaluate(() => document.querySelector<HTMLTemplateElement>("m-card > template")!.content.querySelector<HTMLTemplateElement>("template")!.content.textContent), "inert");
  });
  await check("children and nested HTML-valued icons use the same policy once per sink", async () => {
    const calls: string[] = [];
    configureHTML({ sanitize(html) { calls.push(html); return html.replace(/onload="bad\(\)"/g, "data-clean=\"yes\""); } });
    let output: string;
    const children = '<m-button icon="&lt;svg onload=&quot;bad()&quot;&gt;&lt;/svg&gt;">Nested</m-button>';
    try { output = renderElement("m-toolbar", {}, children); } finally { configureHTML(null); }
    assert.equal(calls.filter(c => c === children).length, 1);
    assert(calls.includes('<svg onload="bad()"></svg>'));
    await load(output!);
    assert.deepEqual(await page.evaluate(() => document.querySelector("m-button")!.shadowRoot!.querySelector("svg")!.hasAttribute("onload")), false);
  });
  await check("identity policy explicitly passes approved child HTML through", async () => {
    await load(renderElement("m-card", {}, '<svg onclick="window.pwned=1"></svg>'));
    assert.equal(await page.locator("m-card > svg").getAttribute("onclick"), "window.pwned=1");
  });
  await check("two instances preserve unique generated IDs and local references", async () => {
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
    assert.equal(state.unique, true);
    assert(state.references > 0);
  });
  console.log("SSR security: 7 Chromium checks passed");
} finally { await browser.close(); }
