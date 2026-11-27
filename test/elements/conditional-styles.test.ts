import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { createElementClass, styleNames, stylesFor, type ElementComponent, type ElementSpec } from "../../src/elements/define";
import { registerStyles } from "../../src/elements/styles";

const dom = new JSDOM("<!doctype html><body></body>", { pretendToBeVisual: true });
const globals = {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent,
  MutationObserver: dom.window.MutationObserver,
};
const previous = new Map<string, PropertyDescriptor | undefined>();
const register = <C extends ElementComponent>(spec: ElementSpec<C>) =>
  dom.window.customElements.define(`test-${spec.name}`, createElementClass(spec));

beforeAll(() => {
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  registerStyles({ "cond-base": ".cond-base{color:red}", "cond-extra": ".cond-extra{color:blue}" });
  register(condSpec);
});
afterEach(() => {
  dom.window.document.body.replaceChildren();
});
afterAll(() => {
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  dom.window.close();
});

type CondSpec = ElementSpec<ElementComponent>;
const condSpec = {
  name: "cond",
  styles: ["cond-base", { name: "cond-extra", when: (host: HTMLElement) => host.hasAttribute("extra") }],
  attributes: { extra: { type: "boolean" } },
  create: () => ({ element: dom.window.document.createElement("div"), destroy: () => {} }),
} as CondSpec;

/** The sheet texts the root holds, whichever mechanism it adopted them by. */
const sheetTexts = (root: ShadowRoot): string[] =>
  "adoptedStyleSheets" in root && root.adoptedStyleSheets.length > 0
    ? root.adoptedStyleSheets.map((sheet) => sheet.cssText)
    : Array.from(root.querySelectorAll("style"), (style) => style.textContent ?? "");

test("a conditional entry is adopted while its predicate holds and dropped after, without copies", async () => {
  const element = dom.window.document.createElement("test-cond") as HTMLElement;
  dom.window.document.body.append(element);
  const root = element.shadowRoot!;
  const count = (text: string) => sheetTexts(root).filter((sheet) => sheet.includes(text)).length;
  expect(count(".cond-base")).toBe(1);
  expect(count(".cond-extra")).toBe(0);
  element.setAttribute("extra", "");
  await Promise.resolve();
  expect(count(".cond-extra")).toBe(1);
  for (const _ of [1, 2]) {
    element.removeAttribute("extra");
    await Promise.resolve();
    expect(count(".cond-extra")).toBe(0);
    element.setAttribute("extra", "");
    await Promise.resolve();
    expect(count(".cond-extra")).toBe(1);
  }
});

test("styleNames lists every entry and stylesFor keeps the unconditional ones and the predicates that hold", () => {
  const host = dom.window.document.createElement("x-host");
  expect(styleNames(condSpec.styles)).toEqual(["cond-base", "cond-extra"]);
  expect(stylesFor(condSpec.styles, host)).toEqual(["cond-base"]);
  host.setAttribute("extra", "");
  expect(stylesFor(condSpec.styles, host)).toEqual(["cond-base", "cond-extra"]);
});
