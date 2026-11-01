// test/components/menu/opener-positioning.test.ts
//
// The menu is placed against the element the opener feature resolved. An
// opener given as a component may expose its element only through
// getElement() or input (OpenerTarget, types.ts); the controller used to
// resolve the opener itself, and for those two shapes it returned the
// component, so the placement read getBoundingClientRect() off the component
// and threw. The menu opened and was never placed.
import { describe, test, expect, beforeEach, afterEach, jest } from "bun:test";
import { advanceTimersByTime } from "../../utils/fake-clock";
import { JSDOM } from "jsdom";

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.CustomEvent = dom.window.CustomEvent;
g.MutationObserver = dom.window.MutationObserver;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
dom.window.requestAnimationFrame = g.requestAnimationFrame;
dom.window.cancelAnimationFrame = (frame: number) => clearTimeout(frame);
g.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };

import createMenu from "../../../src/components/menu";

/** Positioning runs on the menu's own 20 ms timer; focus on one at 120 ms. */
const after = async (ms: number): Promise<void> => {
  advanceTimersByTime(ms);
};

const rect = {
  top: 100,
  bottom: 140,
  left: 200,
  right: 300,
  width: 100,
  height: 40,
  x: 200,
  y: 100,
} as DOMRect;

const items = [{ id: "cut", text: "Cut" }, { id: "copy", text: "Copy" }];

let openerElement: HTMLButtonElement;

beforeEach(() => {
  jest.useFakeTimers();
  openerElement = document.createElement("button");
  openerElement.id = "open-menu";
  openerElement.getBoundingClientRect = () => rect;
  document.body.appendChild(openerElement);
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.useRealTimers();
});

/** Opens, waits for the placement timer, and returns the menu. */
const openPlaced = async (opener: unknown) => {
  const menu = createMenu({ opener: opener as never, items });
  menu.open();
  await after(200);
  return menu;
};

/** The opener's default shape: bottom-start, offset 0 (MENU_DEFAULTS). */
const placedBelow = (menu: { element: HTMLElement }) => {
  expect(menu.element.style.top).toBe(`${rect.bottom}px`);
  expect(menu.element.style.left).toBe(`${rect.left}px`);
};

describe("menu positioning: the opener the opener feature resolved", () => {
  test("a component with getElement() is placed against that element", async () => {
    const menu = await openPlaced({ getElement: () => openerElement });
    placedBelow(menu);
    expect(menu.element.getAttribute("aria-hidden")).toBe("false");
  });

  test("a component with input is placed against that element", async () => {
    const menu = await openPlaced({ input: openerElement });
    placedBelow(menu);
    expect(menu.element.getAttribute("aria-hidden")).toBe("false");
  });

  test("a component with element is placed against it", async () => {
    const menu = await openPlaced({ element: openerElement });
    placedBelow(menu);
  });

  test("a selector is placed against the element it names", async () => {
    const menu = await openPlaced("#open-menu");
    placedBelow(menu);
  });

  test("an element is placed against itself", async () => {
    const menu = await openPlaced(openerElement);
    placedBelow(menu);
  });
});
