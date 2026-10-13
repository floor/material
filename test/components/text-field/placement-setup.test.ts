// test/components/text-field/placement-setup.test.ts
//
// A filled field with nothing to place installs no observers and no
// resize listener, and reads no style. The first request for placement, from
// any setter that can give it something to place, sets them up. It does join
// the batch once, to ask whether it is in a shadow root (a field has no root
// when it is created): there, and only there, one measure reads its direction
// for the --rtl class, which nothing else can give it.
import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const g = globalThis as any;
for (const key of [
  "window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement",
  "HTMLTextAreaElement", "Element", "Node", "Event", "MouseEvent", "KeyboardEvent", "FocusEvent", "CustomEvent",
]) g[key] = (dom.window as any)[key];
const computedStyle = dom.window.getComputedStyle.bind(dom.window);
g.getComputedStyle = (element: Element, pseudo?: string | null) => {
  if (element.classList?.contains("mtrl-text-field")) styleReads++;
  return computedStyle(element, pseudo);
};
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0);
g.cancelAnimationFrame = () => {};

// What a field sets up, counted
let observed = 0;
let resized = 0;
let timers = 0;
// Style reads on a field's root: placement's direction read
let styleReads = 0;
// Placement's own: a class observer on the field's root, and the label's
// ResizeObserver (the input's autofill and the counter observe other things)
g.MutationObserver = class {
  observe(target: Element, options?: MutationObserverInit) {
    if (target.classList?.contains("mtrl-text-field") && options?.attributeFilter?.includes("class")) observed++;
  }
  disconnect() {}
  takeRecords() { return []; }
};
g.ResizeObserver = class { observe() { observed++; } disconnect() {} unobserve() {} };
const addListener = window.addEventListener.bind(window);
window.addEventListener = ((type: string, ...rest: unknown[]) => {
  if (type === "resize") resized++;
  return (addListener as (...args: unknown[]) => void)(type, ...rest);
}) as typeof window.addEventListener;
const realSetTimeout = setTimeout;
// Placement's batch: the shared flush the first measure is scheduled in
g.setTimeout = ((fn: () => void, ms?: number) => { if (fn.name === "flush") timers++; return realSetTimeout(fn, ms); }) as typeof setTimeout;

import createTextField from "../../../src/components/text-field";

const ICON = '<svg viewBox="0 0 24 24"></svg>';
const mount = (config: Record<string, unknown> = {}) => {
  const field = createTextField({ label: "Name", ...config } as never);
  document.body.append(field.element);
  return field;
};
const reset = () => { observed = 0; resized = 0; timers = 0; styleReads = 0; };
const setUp = () => ({ observed: observed > 0, resized: resized > 0, scheduled: timers > 0 });
// One entry in the shared batch, to ask for its root; nothing that stays
const NOTHING = { observed: false, resized: false, scheduled: true };
const EVERYTHING = { observed: true, resized: true, scheduled: true };

// A measure another test scheduled runs first, so each test starts with no batch pending
beforeEach(async () => {
  await new Promise((resolve) => realSetTimeout(resolve, 5));
  document.body.innerHTML = "";
  reset();
});
afterAll(() => dom.window.close());

describe("placement waits for something to place", () => {
  test("a filled field with no prefix, suffix or icon, in the light DOM, sets up no observer and no listener and reads no style", async () => {
    mount({ variant: "filled" });
    expect(setUp()).toEqual(NOTHING);
    await new Promise((resolve) => realSetTimeout(resolve, 5));
    expect({ ...setUp(), styleReads }).toEqual({ ...NOTHING, styleReads: 0 });
  });

  test("the same field in a shadow root reads its direction once, and still sets up no observer and no listener", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const field = createTextField({ label: "Name", variant: "filled" } as never);
    host.attachShadow({ mode: "open" }).append(field.element);
    await new Promise((resolve) => realSetTimeout(resolve, 5));
    expect({ ...setUp(), styleReads }).toEqual({ ...NOTHING, styleReads: 1 });
  });

  for (const [name, config] of [
    ["outlined", { variant: "outlined" }],
    ["a leading icon", { leadingIcon: ICON }],
    ["a prefix", { prefixText: "$" }],
    ["a suffix", { suffixText: "USD" }],
  ] as const) {
    test(`a field created with ${name} sets up placement and its first measure`, () => {
      mount({ variant: "filled", ...config });
      expect(setUp()).toEqual(EVERYTHING);
    });
  }

  for (const [name, change] of [
    ["setVariant('outlined')", (f: any) => f.setVariant("outlined")],
    ["setPrefixText", (f: any) => f.setPrefixText("$")],
    ["setSuffixText", (f: any) => f.setSuffixText("USD")],
    ["setLeadingIcon", (f: any) => f.setLeadingIcon(ICON)],
    ["setLabel", (f: any) => f.setLabel("Email")],
    ["setRequired", (f: any) => f.setRequired(true)],
    ["setDensity", (f: any) => f.setDensity("compact")],
    ["updatePositions", (f: any) => f.updatePositions()],
  ] as const) {
    test(`${name} on a plain filled field sets placement up then`, () => {
      const field = mount({ variant: "filled" });
      expect(setUp()).toEqual(NOTHING);
      change(field);
      expect([observed > 0, resized > 0]).toEqual([true, true]);
    });
  }

  test("set up once, however many requests", () => {
    const field = mount({ variant: "outlined" });
    const first = { observed, resized };
    field.setPrefixText("$");
    field.setLabel("Email");
    expect({ observed, resized }).toEqual(first);
  });

  test("destroyed before any request, a plain field leaves nothing to tear down, and a later request does nothing", async () => {
    const field = mount({ variant: "filled" });
    field.element.style.direction = "rtl";
    field.destroy();
    field.updatePositions();
    expect(setUp()).toEqual(NOTHING);
    // Its pending measure went with it
    await new Promise((resolve) => realSetTimeout(resolve, 5));
    expect(field.element.classList.contains("mtrl-text-field--rtl")).toBe(false);
  });
});
