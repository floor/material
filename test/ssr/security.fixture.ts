// test/ssr/security.fixture.ts
import { expect, test } from "bun:test";
import "./css.fixture";
import { configureHTML } from "../../src/core/dom/html";
import { registerStyles, styleText } from "../../src/elements/styles";
import { withServerScope } from "../../src/ssr/server-dom";
import { serializeNode } from "../../src/ssr/serialize";
const { renderElement } = await import("../../src/ssr");

test("attribute and text output escapes hostile markup", () => {
  const hostile = `" ' & < > </template><img src=x onerror='window.pwned=1'>`;
  const html = renderElement("m-button", { label: hostile, title: hostile, "data-test": hostile });
  const attribute = "&quot; &#39; &amp; &lt; &gt; &lt;/template&gt;&lt;img src=x onerror=&#39;window.pwned=1&#39;&gt;";
  expect(html).toContain(`title="${attribute}"`);
  expect(html).toContain(`data-test="${attribute}"`);
  expect(html).toContain(`<slot>" ' &amp; &lt; &gt; &lt;/template&gt;&lt;img src=x onerror='window.pwned=1'&gt;</slot>`);
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
test("hostile link bases reject; relative and HTTPS URLs are ordered and escaped", () => {
  for (const base of ["javascript:alert(1)", "data:text/html,x", "//evil.test", "https://u:p@evil.test", "https://x/\" onload=bad", "a\\b", "a\0b", "a?b", "a#b"]) {
    expect(() => renderElement("m-button", {}, "", { styles: "link", cssBase: base })).toThrow(TypeError);
  }
  for (const base of ["/css/a&b", "https://example.invalid/a&b"]) {
    const html = renderElement("m-button", {}, "", { styles: "link", cssBase: base });
    expect([...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]))
      .toEqual(["hosts/button", "ripple", "progress", "button"].map(p => `${base.replaceAll("&", "&amp;")}/${p}.css`));
  }
});
test("children and nested HTML-valued icons use the same policy once per sink", () => {
  const calls: string[] = [];
  configureHTML({ sanitize(html) { calls.push(html); return html.replace(/onload="bad\(\)"/g, "data-clean=\"yes\""); } });
  let output: string;
  const children = '<m-button icon="&lt;svg onload=&quot;bad()&quot;&gt;&lt;/svg&gt;">Nested</m-button>';
  try { output = renderElement("m-toolbar", {}, children); } finally { configureHTML(null); }
  expect(calls.filter(c => c === children)).toHaveLength(1);
  expect(calls).toContain('<svg onload="bad()"></svg>');
  expect(output!).toContain('<svg data-clean="yes"></svg>');
});
