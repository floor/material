import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { buttonElement } from "../../src/elements/button";
import { iconButtonElement } from "../../src/elements/icon-button";
import { fabElement } from "../../src/elements/fab";
import { extendedFabElement } from "../../src/elements/extended-fab";
import { splitButtonElement } from "../../src/elements/split-button";
import { createElementClass, type ElementComponent, type ElementSpec } from "../../src/elements/define";

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
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
};
const previous = new Map<string, PropertyDescriptor | undefined>();
const register = <C extends ElementComponent>(spec: ElementSpec<C>) =>
  dom.window.customElements.define(`test-${spec.name}`, createElementClass(spec));

beforeAll(() => {
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  // JSDOM exposes attachInternals without implementing setFormValue.
  Object.defineProperty(dom.window.HTMLElement.prototype, "attachInternals", { value: undefined });
  register(buttonElement.spec);
  register(iconButtonElement.spec);
  register(fabElement.spec);
  register(extendedFabElement.spec);
  register(splitButtonElement.spec);
});
afterEach(async () => {
  dom.window.document.body.replaceChildren();
  await Promise.resolve();
});
afterAll(() => {
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  dom.window.close();
});

const states = {
  "aria-expanded": ["false", "true"],
  "aria-haspopup": ["menu", "dialog"],
  "aria-pressed": ["mixed", "false"],
} as const;

for (const name of ["button", "icon-button", "fab", "extended-fab", "split-button"]) {
  test(`${name} copies authored ARIA states at connection and observes changes and removals`, () => {
    const host = document.createElement(`test-${name}`);
    for (const [attribute, [initial]] of Object.entries(states)) host.setAttribute(attribute, initial);
    document.body.append(host);

    const button = host.shadowRoot!.querySelector("button")!;
    const trailing = name === "split-button" ? host.shadowRoot!.querySelectorAll("button")[1] : undefined;
    for (const [attribute, [initial, updated]] of Object.entries(states)) {
      expect(button.getAttribute(attribute)).toBe(initial);
      const trailingValue = trailing?.getAttribute(attribute);
      host.setAttribute(attribute, updated);
      expect(button.getAttribute(attribute)).toBe(updated);
      expect(host.shadowRoot!.querySelector("button")).toBe(button);
      host.removeAttribute(attribute);
      expect(button.hasAttribute(attribute)).toBe(false);
      expect(trailing?.getAttribute(attribute)).toBe(trailingValue);
    }
  });
}

for (const name of ["button", "icon-button"]) {
  test(`${name} restores the built-in toggle state when authored aria-pressed is removed`, () => {
    const host = document.createElement(`test-${name}`);
    host.setAttribute("toggle", "");
    host.setAttribute("selected", "");
    host.setAttribute("aria-pressed", "mixed");
    document.body.append(host);

    const button = host.shadowRoot!.querySelector("button")!;
    expect(button.getAttribute("aria-pressed")).toBe("mixed");
    host.removeAttribute("aria-pressed");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    button.click();
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });
}

test("ID references resolve from the host's shadow root, update and clear", () => {
  const prototype = dom.window.HTMLButtonElement.prototype;
  const properties = ["ariaControlsElements", "ariaDescribedByElements"] as const;
  for (const name of properties) Object.defineProperty(prototype, name, { configurable: true, writable: true, value: null });
  try {
    document.body.innerHTML = '<p id="panel">Document panel</p><div id="scope"></div>';
    const scope = document.getElementById("scope")!.attachShadow({ mode: "open" });
    scope.innerHTML = `
      <p id="panel">Local panel</p><p id="hint">Local hint</p>
      <test-button aria-controls="panel missing hint" aria-describedby="hint">Details</test-button>
    `;
    const host = scope.querySelector("test-button")!;
    const button = host.shadowRoot!.querySelector("button") as HTMLButtonElement & Record<typeof properties[number], Element[] | null>;
    const panel = scope.getElementById("panel");
    const hint = scope.getElementById("hint");

    expect(button.ariaControlsElements).toEqual([panel, hint]);
    expect(button.ariaDescribedByElements).toEqual([hint]);
    host.setAttribute("aria-controls", "hint");
    expect(button.ariaControlsElements).toEqual([hint]);
    host.removeAttribute("aria-controls");
    host.removeAttribute("aria-describedby");
    expect(button.ariaControlsElements).toBeNull();
    expect(button.ariaDescribedByElements).toBeNull();
  } finally {
    for (const name of properties) Reflect.deleteProperty(prototype, name);
  }
});

test("an unsupported ID-reference property does not leave a broken shadow attribute", () => {
  const host = document.createElement("test-button");
  host.setAttribute("aria-controls", "panel");
  host.setAttribute("aria-describedby", "description");
  document.body.append(host);
  const button = host.shadowRoot!.querySelector("button")!;
  expect(button.hasAttribute("aria-controls")).toBe(false);
  expect(button.hasAttribute("aria-describedby")).toBe(false);
  expect(Object.hasOwn(button, "ariaControlsElements")).toBe(false);
});
