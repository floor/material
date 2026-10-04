// test/components/text-field/rtl.test.ts
//
// A direction set outside a shadow root cannot reach the [dir]
// selectors in the stylesheet, so placement.ts sets --rtl from the computed
// direction. It read the direction for the outlined variant only, so a filled
// field in a right-to-left page kept its left-to-right layout: these pin the
// class for both variants, and that a direction change is picked up by the
// next placement pass, not by an observer of its own.
import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const g = globalThis as any;
for (const key of [
  "window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement",
  "HTMLTextAreaElement", "Element", "Node", "Event", "MouseEvent", "KeyboardEvent", "FocusEvent", "CustomEvent",
  "MutationObserver",
]) g[key] = (dom.window as any)[key];
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0);
g.cancelAnimationFrame = () => {};
g.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };

import createTextField from "../../../src/components/text-field";

const ICON = '<svg viewBox="0 0 24 24"></svg>';
const RTL = "mtrl-text-field--rtl";

// Filled needs something to place for placement to run at all
const mount = (config: Record<string, unknown> = {}) => {
  const field = createTextField({ label: "Name", ...config } as never) as never as Record<string, any>;
  document.body.append(field.element);
  return field;
};

beforeEach(() => { document.body.innerHTML = ""; });
afterAll(() => { dom.window.close(); });

describe("the --rtl class follows the computed direction", () => {
  for (const [name, config] of [
    ["a filled field with a leading icon", { variant: "filled", leadingIcon: ICON }],
    ["an outlined field", { variant: "outlined" }],
  ] as const) {
    test(`${name} gets the class when the direction is rtl`, () => {
      const field = mount(config);
      field.element.style.direction = "rtl";

      field.updatePositions();

      expect(field.element.classList.contains(RTL)).toBe(true);
      field.destroy();
    });

    test(`${name} does not get the class in ltr`, () => {
      const field = mount(config);

      field.updatePositions();

      expect(field.element.classList.contains(RTL)).toBe(false);
      field.destroy();
    });
  }

  // A plain filled field has nothing to place and installs no observer
  // In a shadow root, where an ancestor's `dir` does not reach the
  // stylesheet, its direction is read once, in the batch its creation joins.
  test("a plain filled field in a shadow root gets the class from its first batch, without being asked", async () => {
    const host = document.createElement("div");
    host.dir = "rtl";
    document.body.append(host);
    const field = createTextField({ label: "Name", variant: "filled" } as never) as never as Record<string, any>;
    // jsdom does not inherit `direction` across the boundary as a browser does
    field.element.style.direction = "rtl";
    host.attachShadow({ mode: "open" }).append(field.element);

    await new Promise((r) => setTimeout(r, 0));

    expect(field.element.classList.contains(RTL)).toBe(true);
    field.destroy();
  });

  // In the light DOM the stylesheet's [dir] selector mirrors it with no script
  test("a plain filled field in the light DOM is left to the stylesheet: no class, no style read", async () => {
    const field = mount({ variant: "filled" });
    field.element.style.direction = "rtl";
    const read = g.getComputedStyle;
    let reads = 0;
    g.getComputedStyle = (...args: [Element]) => { if (args[0] === field.element) reads++; return read(...args); };

    await new Promise((r) => setTimeout(r, 0));
    g.getComputedStyle = read;

    expect([field.element.classList.contains(RTL), reads]).toEqual([false, 0]);
    field.destroy();
  });

  test("a direction change is applied by the next placement pass, with no observer of its own", () => {
    const field = mount({ variant: "filled", leadingIcon: ICON });
    field.updatePositions();
    expect(field.element.classList.contains(RTL)).toBe(false);

    field.element.style.direction = "rtl";
    field.updatePositions();
    expect(field.element.classList.contains(RTL)).toBe(true);

    field.element.style.direction = "ltr";
    field.updatePositions();
    expect(field.element.classList.contains(RTL)).toBe(false);
    field.destroy();
  });
});
