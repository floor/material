// test/elements/direction.test.ts
//
// An element host's direction (core/dom/direction, through elements/define):
// read when the host is built, again where a move puts it and after a `dir`
// change, and no longer once the host is torn down.
import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { buttonElement } from "../../src/elements/button";
import { createElementClass } from "../../src/elements/define";

const dom = new JSDOM("<!doctype html><body></body>", { pretendToBeVisual: true });

/** The computed direction, which jsdom does not inherit: the nearest inline style, through shadow hosts. */
const styleReads: Element[] = [];
const getComputedStyle = (element: Element) => {
  styleReads.push(element);
  for (let node: Node | null = element; node; node = (node as ShadowRoot).host ?? node.parentNode) {
    const own = (node as HTMLElement).style?.direction;
    if (own) return { direction: own };
  }
  return { direction: "ltr" };
};

const globals = {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle,
};
const previous = new Map<string, PropertyDescriptor | undefined>();

beforeAll(() => {
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  // JSDOM exposes attachInternals without implementing setFormValue.
  Object.defineProperty(dom.window.HTMLElement.prototype, "attachInternals", { value: undefined });
  dom.window.customElements.define("test-direction-button", createElementClass(buttonElement.spec));
});
afterEach(async () => {
  dom.window.document.documentElement.removeAttribute("dir");
  dom.window.document.body.replaceChildren();
  await settled();
});
afterAll(() => {
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  dom.window.close();
});

/** After the observer's callback and the host's own teardown, both microtasks. */
const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const marks = (element: Element): string =>
  ["mtrl-rtl", "mtrl-ltr"].filter((name) => element.classList.contains(name)).join(" ");

const page = (): { rtl: HTMLElement; ltr: HTMLElement } => {
  const rtl = document.createElement("div");
  rtl.dir = "rtl";
  rtl.style.direction = "rtl";
  const ltr = document.createElement("div");
  document.body.append(rtl, ltr);
  return { rtl, ltr };
};

test("a host is read where it is built, and again where a move puts it", async () => {
  const { rtl, ltr } = page();
  const host = document.createElement("test-direction-button");
  rtl.append(host);
  expect(marks(host)).toBe("mtrl-rtl");

  const component = (host as unknown as { component: unknown }).component;
  ltr.append(host);
  expect(marks(host)).toBe("");
  await settled();
  // The move kept the component: the direction was read without a rebuild.
  expect((host as unknown as { component: unknown }).component).toBe(component);

  rtl.append(host);
  expect(marks(host)).toBe("mtrl-rtl");
});

test("a host follows a dir change, and a torn-down host is not read again", async () => {
  const { ltr } = page();
  const host = document.createElement("test-direction-button");
  ltr.append(host);
  expect(marks(host)).toBe("");

  ltr.style.direction = "rtl";
  ltr.dir = "rtl";
  await settled();
  expect(marks(host)).toBe("mtrl-rtl");

  host.remove();
  await settled();
  styleReads.length = 0;
  document.documentElement.dir = "rtl";
  ltr.dir = "ltr";
  await settled();
  expect(styleReads.includes(host)).toBe(false);
});

test("a change that is not a dir change reads no host's style", async () => {
  const { ltr } = page();
  const hosts = Array.from({ length: 20 }, () => document.createElement("test-direction-button"));
  ltr.append(...hosts);
  await settled();
  styleReads.length = 0;

  document.body.append(document.createElement("div"));
  ltr.setAttribute("class", "changed");
  await settled();

  expect(styleReads.filter((element) => hosts.includes(element as HTMLElement))).toEqual([]);
});
