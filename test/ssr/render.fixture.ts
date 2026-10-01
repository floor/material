// test/ssr/render.fixture.ts
import { expect, test } from "bun:test";
import "./css.fixture";
import { parseHTML } from "linkedom";
import { cases } from "../../scripts/fixtures/preupgrade-cases";
import { elements, toolbarElement, buttonElement } from "../../src/elements";
import { registerStyles, styleText } from "../../src/elements/styles";
import { SHADOW_BASE_STYLES, hostStyleText } from "../../src/elements/define";
import { setComponentDefaults, clearGlobalDefaults } from "../../src/core/config/global";
import { configureHTML } from "../../src/core/dom/html";
const { renderElement } = await import("../../src/ssr");

const parsed = (html: string) => parseHTML(`<html><body>${html}</body></html>`).document.body.firstElementChild!;
test("all 36 default fixtures render repeatedly, without late work", async () => {
  const errors: unknown[] = [];
  const onError = (error: unknown) => errors.push(error);
  process.on("unhandledRejection", onError);
  const original = console.error;
  console.error = onError;
  try {
    for (let repeat = 0; repeat < 2; repeat++) for (const { element, html } of cases.filter(c => c.variant === "default")) {
      const host = parsed(html);
      const output = renderElement(`m-${element}`, Object.fromEntries(Array.from(host.attributes, a => [a.name, a.value])), host.innerHTML);
      expect(output, element).toContain('<template shadowrootmode="open" shadowrootdelegatesfocus="">');
    }
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(errors).toEqual([]);
  } finally { console.error = original; process.off("unhandledRejection", onError); }
});
test("attributes, slot fallbacks, prefix, setup and nested roots", () => {
  const html = renderElement("ui-toolbar", { "aria-label": "Tools", "data-n": 12, hidden: false }, '<ui-button label="Save" disabled></ui-button>', { prefix: "ui" });
  expect(html).toContain('aria-label="Tools"');
  expect(html).toContain('data-n="12"');
  expect(html).not.toContain('hidden=');
  expect(html.match(/shadowrootmode/g)).toHaveLength(2);
  expect(html).toContain('<slot>Save</slot>');
  expect(html).toContain('mtrl-button');
  expect(html).toContain('disabled=""');
  expect(html).toContain('role="toolbar"');
  expect(html.match(/aria-label="Tools"/g)).toHaveLength(2);
});
test("declarations and ordinary templates stay inert", () => {
  const html = renderElement("m-tabs", {}, '<m-tab value="a">A</m-tab><template><m-button>Inert</m-button></template>');
  expect(html.match(/shadowrootmode/g)).toHaveLength(1);
  expect(html).toContain('<template><m-button>Inert</m-button></template>');
});
test("host and child snapshots precede setup mutations", () => {
  const original = toolbarElement.spec.setup;
  toolbarElement.spec.setup = (host, c) => {
    const cleanup = original?.(host, c);
    host.setAttribute("data-mutated", "yes");
    host.firstElementChild?.setAttribute("data-mutated", "yes");
    return cleanup;
  };
  try { expect(renderElement("m-toolbar", {}, '<m-button>Save</m-button>')).not.toContain('data-mutated'); }
  finally { toolbarElement.spec.setup = original; }
});
test("styles use registry overrides and browser order", () => {
  const old = styleText("button")!;
  registerStyles({ button: ".override{}" });
  try {
    const html = renderElement("m-button");
    expect(html).toContain(`<style>${hostStyleText(buttonElement.spec)}\n${styleText("ripple")}\n${styleText("progress")}\n.override{}</style>`);
    expect(html.match(/<style>/g)).toHaveLength(1);
    const links = renderElement("m-button", {}, "", { styles: "link", cssBase: "/css/" });
    expect([...links.matchAll(/href="([^"]+)"/g)].map(m => m[1])).toEqual([
      "/css/hosts/button.css", "/css/ripple.css", "/css/progress.css", "/css/button.css",
    ]);
  } finally { registerStyles({ button: old }); }
});
test("validation and async branches reject before mounting", () => {
  const original = buttonElement.spec.create;
  let mounted = false;
  buttonElement.spec.create = c => { mounted = true; return original(c); };
  try {
    for (const html of ['<m-fab-menu open></m-fab-menu>', '<m-fab-menu presentation="menu"></m-fab-menu>', '<m-menu><m-menu-item>A<m-menu-item>B</m-menu-item></m-menu-item></m-menu>']) {
      expect(() => renderElement("m-button", {}, html)).toThrow(TypeError);
      expect(mounted).toBe(false);
    }
  } finally { buttonElement.spec.create = original; }
  for (const tag of ["m-tab", "m-unknown", "button", "ui-button", "m-button>"]) expect(() => renderElement(tag)).toThrow(TypeError);
  expect(() => renderElement("m-button", {}, "", { prefix: "BAD" })).toThrow(TypeError);
  expect(() => renderElement("m-button", { tabindex: Infinity })).toThrow(TypeError);
  expect(() => renderElement("m-button", {}, '<template shadowrootmode="open"></template>')).toThrow(TypeError);
  expect(() => renderElement("m-button", {}, '<m-button>'.repeat(64) + '</m-button>'.repeat(64))).toThrow(RangeError);
});
test("setup and cleanup failures keep their cause and restore globals", () => {
  const before = Object.getOwnPropertyDescriptor(globalThis, "document");
  const original = buttonElement.spec.create;
  const failure = new Error("destroy failed");
  buttonElement.spec.create = config => {
    const c = original(config);
    const destroy = c.destroy;
    c.destroy = () => { destroy(); throw failure; };
    return c;
  };
  try {
    let caught: unknown;
    try { renderElement("m-button"); } catch (error) { caught = error; }
    expect((caught as Error & { cause: unknown }).cause).toBe(failure);
    expect((caught as Error).message).toContain("m-button");
  } finally { buttonElement.spec.create = original; }
  expect(Object.getOwnPropertyDescriptor(globalThis, "document")).toEqual(before);
  configureHTML({ sanitize() { return renderElement("m-button"); } });
  try { expect(() => renderElement("m-button", {}, "text")).toThrow("reentered"); }
  finally { configureHTML(null); }
  expect(Object.getOwnPropertyDescriptor(globalThis, "document")).toEqual(before);
});
test("fixture inventory is exactly the registry", () => {
  expect(cases.filter(c => c.variant === "default").map(c => c.element).sort()).toEqual(Object.values(elements).map(e => e.spec.name).sort());
});
test("generated nested hosts and factory style nodes are preserved", () => {
  const original = toolbarElement.spec.setup;
  toolbarElement.spec.setup = (host, c) => {
    const cleanup = original?.(host, c);
    const style = document.createElement("style"); style.textContent = ".factory{color:red}";
    const button = document.createElement("m-button"); button.setAttribute("label", "Generated");
    c.element.append(style, button);
    return cleanup;
  };
  try {
    const html = renderElement("m-toolbar");
    expect(html.match(/shadowrootmode/g)).toHaveLength(2);
    expect(html).toContain('<style>.factory{color:red}</style>');
    expect(html).toContain('<slot>Generated</slot>');
  } finally { toolbarElement.spec.setup = original; }
});

test("global defaults cannot enable untracked imports", () => {
  try {
    setComponentDefaults("button", { showProgress: true });
    expect(() => renderElement("m-button")).toThrow("asynchronous");
    clearGlobalDefaults();
    setComponentDefaults("card", { buttons: [{ text: "Lazy" }] });
    expect(() => renderElement("m-card")).toThrow("asynchronous");
    clearGlobalDefaults();
    Reflect.apply(setComponentDefaults, undefined, ["fab-menu", { presentation: "menu" }]);
    expect(() => renderElement("m-fab-menu")).toThrow("asynchronous");
  } finally { clearGlobalDefaults(); }
});

test("all 36 link and inline sequences match browser adoption names", () => {
  for (const { spec } of Object.values(elements)) {
    const names = [...SHADOW_BASE_STYLES, ...spec.styles];
    const html = renderElement(`m-${spec.name}`, {}, "", { styles: "link", cssBase: "/css" });
    const urls = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    expect(urls, spec.name).toEqual([`hosts/${spec.name}`, ...names].map(name => `/css/${name}.css`));
    const inline = renderElement(`m-${spec.name}`);
    expect(inline, spec.name).toContain(`<style>${[styleText(`host:${spec.name}`) ?? hostStyleText(spec), ...names.map(styleText)].join("\n")}</style>`);
  }
});
test("missing registered styles fail clearly", () => {
  const previous = styleText("button")!;
  registerStyles({ button: undefined as unknown as string });
  try { expect(() => renderElement("m-button")).toThrow("Missing SSR CSS module: button"); }
  finally { registerStyles({ button: previous }); }
});

test("only encountered tags are defined, after the HTML policy, with templates inert", () => {
  const original = toolbarElement.spec.create;
  let defined: string[] = [];
  toolbarElement.spec.create = config => {
    defined = Object.values(elements).map(({ spec }) => `ui-${spec.name}`).filter(tag => !!customElements.get(tag));
    return original(config);
  };
  configureHTML({ sanitize: html => html.replaceAll("ui-card", "ui-button") });
  try {
    const html = renderElement("ui-toolbar", {}, '<ui-card>Save</ui-card><ui-button>Again</ui-button><template><ui-dialog></ui-dialog></template>', { prefix: "ui" });
    expect(defined.sort()).toEqual(["ui-button", "ui-toolbar"]);
    expect(html.match(/shadowrootmode/g)).toHaveLength(3);
    expect(html).toContain('<template><ui-dialog></ui-dialog></template>');
  } finally { toolbarElement.spec.create = original; configureHTML(null); }
});
