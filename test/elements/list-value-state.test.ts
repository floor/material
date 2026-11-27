import { afterAll, afterEach, beforeAll, test, expect } from "bun:test";
import { JSDOM } from "jsdom";
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
};
const previous = new Map<string, PropertyDescriptor | undefined>();

type ListComponent = ElementComponent & { values: string[]; read: () => string[] };
const listSpec = {
  name: "list-state",
  styles: [],
  attributes: { mode: { type: "string" } },
  properties: {
    values: {
      get: (c: ListComponent) => [...c.values],
      set: (c: ListComponent, value: unknown) => void (c.values = Array.isArray(value) ? value.map(String) : []),
    },
  },
  // As the text field's declared children are its values' default.
  defaults: ["values"],
  methods: ["read"],
  observeChildren: true,
  config: (host: HTMLElement) => ({ values: [...host.querySelectorAll("test-item")].map((item) => item.textContent ?? "") }),
  create: (config: { values?: string[] }) => {
    const element = dom.window.document.createElement("div");
    const component: ListComponent = {
      element,
      values: [...(config.values ?? [])],
      read: () => [...component.values],
      destroy: () => element.remove(),
    };
    return component;
  },
} as ElementSpec<ListComponent>;

const mountList = (): { element: HTMLElement; values: () => string[] } => {
  const element = dom.window.document.createElement("test-list-state") as HTMLElement & { values: string[] };
  element.innerHTML = "<test-item>a</test-item>";
  dom.window.document.body.append(element);
  return { element, values: () => [...element.values] };
};
const settle = async () => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

test("reading a list-valued property moves nothing, so a child added after upgrade is read again", async () => {
  const { element, values } = mountList();
  expect(values()).toEqual(["a"]);
  // The method reads the live property; the same items in a fresh array must
  // not count as a change, or the element would be dirty from a read.
  (element as HTMLElement & { read: () => string[] }).read();
  element.append(Object.assign(dom.window.document.createElement("test-item"), { textContent: "b" }));
  await settle();
  expect(values()).toEqual(["a", "b"]);
});

test("a value set by script is state: a later rebuild keeps it over the children", async () => {
  const { element, values } = mountList();
  (element as HTMLElement & { values: string[] }).values = ["x"];
  element.append(Object.assign(dom.window.document.createElement("test-item"), { textContent: "b" }));
  await settle();
  expect(values()).toEqual(["x"]);
});

beforeAll(() => {
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  dom.window.customElements.define("test-list-state", createElementClass(listSpec));
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

test("a host attribute the spec does not declare never recreates the component", async () => {
  const { element } = mountList();
  const component = (element as HTMLElement & { component: unknown }).component;
  element.setAttribute("data-extra", "1");
  await settle();
  expect((element as HTMLElement & { component: unknown }).component).toBe(component);
  // A declared attribute without an update still rebuilds, as the spec says.
  element.setAttribute("mode", "compact");
  await settle();
  expect((element as HTMLElement & { component: unknown }).component).not.toBe(component);
});
