// test/components/menu/layer.test.ts
//
// `layer: "top"`: the menu renders next to its opener, in the opener's tree
// (a shadow root included), and is shown as a popover="manual" element. Its
// own dismissal decides, and a close emits `close` once whichever way it came.
// JSDOM has no popovers: the popover API is stubbed on this window's
// prototype, a flag per element and the toggle events the browser queues.
// The browser half, stacking and styles, is in scripts/check-elements.ts.

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { JSDOM } from "jsdom";
import createMenu from "../../../src/components/menu";
import { currentlyOpenMenu, menuClosed } from "../../../src/components/menu/features/registry";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const g = globalThis as unknown as Record<string, unknown>;
const globals: Record<string, unknown> = {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent,
  KeyboardEvent: dom.window.KeyboardEvent,
  FocusEvent: dom.window.FocusEvent,
  CustomEvent: dom.window.CustomEvent,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0),
  cancelAnimationFrame: () => {},
};
const previous: Record<string, unknown> = {};

type Proto = Record<string, unknown>;
const proto = dom.window.HTMLElement.prototype as unknown as Proto;
const shown = new WeakSet<Element>();
const nativeMatches = dom.window.Element.prototype.matches;
const popoverCalls: string[] = [];

/** The popover API as the browser has it: a flag and a queued toggle event. */
const installPopover = (): void => {
  const toggle = (element: HTMLElement, newState: string) =>
    setTimeout(() => element.dispatchEvent(Object.assign(new dom.window.Event("toggle"), { newState })), 0);
  proto.showPopover = function (this: HTMLElement) {
    if (!this.isConnected) throw new Error("InvalidStateError: not connected");
    popoverCalls.push(`show:${this.className}`);
    shown.add(this);
    toggle(this, "open");
  };
  proto.hidePopover = function (this: HTMLElement) {
    popoverCalls.push(`hide:${this.className}`);
    shown.delete(this);
    toggle(this, "closed");
  };
  // Removing a popover hides it, without an event
  (dom.window.Element.prototype as unknown as Proto).matches = function (this: Element, selector: string) {
    return selector === ":popover-open" ? shown.has(this) && this.isConnected : nativeMatches.call(this, selector);
  };
};
const removePopover = (): void => {
  delete proto.showPopover;
  delete proto.hidePopover;
  dom.window.Element.prototype.matches = nativeMatches;
};

const after = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const ITEMS = [
  { id: "share", text: "Share", hasSubmenu: true, submenu: [{ id: "link", text: "Copy link" }] },
  { id: "copy", text: "Copy" },
];

let menus: ReturnType<typeof createMenu>[];

beforeAll(() => {
  for (const [name, value] of Object.entries(globals)) {
    previous[name] = g[name];
    g[name] = value;
  }
});
afterAll(() => {
  for (const name of Object.keys(globals)) g[name] = previous[name];
});
beforeEach(() => {
  const open = currentlyOpenMenu();
  if (open) menuClosed(open);
  menus = [];
  popoverCalls.length = 0;
  installPopover();
});
afterEach(() => {
  menus.forEach((menu) => menu.destroy());
  removePopover();
  document.body.replaceChildren();
  Reflect.deleteProperty(dom.window, "pageYOffset");
});

/** An opener at a known place in a wrapper, the page scrolled by 500px. */
const setup = (root: ParentNode = document.body) => {
  const wrapper = document.createElement("div");
  const opener = document.createElement("button");
  const outside = document.createElement("button");
  wrapper.append(opener);
  root.append(wrapper, outside);
  opener.getBoundingClientRect = () =>
    ({ top: 100, bottom: 140, left: 200, right: 300, width: 100, height: 40, x: 200, y: 100 }) as DOMRect;
  Object.defineProperty(dom.window, "pageYOffset", { value: 500, configurable: true });
  return { wrapper, opener, outside };
};

const make = (config: Record<string, unknown>) => {
  const menu = createMenu({ items: ITEMS, ...config } as never);
  menus.push(menu);
  const closes: unknown[] = [];
  menu.on("close", (event: unknown) => closes.push(event));
  return { menu, closes };
};

/** Opens and waits for positioning, focus and the document listeners. */
const opened = async (menu: ReturnType<typeof createMenu>) => {
  menu.open();
  await after(150);
};

describe("menu layer: top", () => {
  test("without a layer the menu is appended to the body, with no popover, at document coordinates", async () => {
    const { opener } = setup();
    const { menu } = make({ opener });
    await opened(menu);
    expect(menu.element.parentNode).toBe(document.body);
    expect(menu.element.hasAttribute("popover")).toBe(false);
    expect(menu.element.style.position).toBe("absolute");
    expect(menu.element.style.top).toBe(`${140 + 500}px`);
    expect(popoverCalls).toEqual([]);
  });

  test("renders next to its opener as a manual popover, fixed at viewport coordinates", async () => {
    const { opener, wrapper } = setup();
    const { menu } = make({ opener, layer: "top", container: document.body });
    await opened(menu);
    expect(menu.element.parentNode).toBe(wrapper);
    expect(opener.nextElementSibling).toBe(menu.element);
    expect(menu.element.getAttribute("popover")).toBe("manual");
    expect(menu.element.matches(":popover-open")).toBe(true);
    expect(menu.element.style.position).toBe("fixed");
    // The opener's client rect: no scroll offset, no container offset
    expect(menu.element.style.top).toBe("140px");
    expect(menu.element.style.left).toBe("200px");
    expect(popoverCalls).toEqual(["show:mtrl-menu"]);
  });

  test("stays inside the opener's shadow root", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = host.attachShadow({ mode: "open" });
    const { opener } = setup(root);
    const { menu } = make({ opener, layer: "top" });
    await opened(menu);
    expect(menu.element.getRootNode()).toBe(root);
    expect(menu.element.matches(":popover-open")).toBe(true);
  });

  test("a click outside closes it once, though the opener's blur closes it too", async () => {
    const { opener, outside } = setup();
    const { menu, closes } = make({ opener, layer: "top" });
    opener.focus();
    await opened(menu);
    // The browser's order: the opener blurs on pointer down, the click follows
    opener.dispatchEvent(new dom.window.FocusEvent("blur", { relatedTarget: outside }));
    await after(60);
    outside.click();
    await after(400);
    expect(closes.length).toBe(1);
    expect(menu.isOpen()).toBe(false);
    expect(menu.element.isConnected).toBe(false);
  });

  test("a click inside its shadow root does not close it", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = host.attachShadow({ mode: "open" });
    const { opener } = setup(root);
    const { menu, closes } = make({ opener, layer: "top" });
    await opened(menu);
    // The list's padding, not an item: the document sees the host
    menu.element.querySelector("ul")!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, composed: true }));
    await after(100);
    expect(closes.length).toBe(0);
    expect(menu.isOpen()).toBe(true);
  });

  test("Escape closes it once", async () => {
    const { opener } = setup();
    const { menu, closes } = make({ opener, layer: "top" });
    await opened(menu);
    menu.element.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await after(400);
    expect(closes.length).toBe(1);
    expect(menu.isOpen()).toBe(false);
  });

  test("selecting an item closes it once", async () => {
    const { opener } = setup();
    const { menu, closes } = make({ opener, layer: "top" });
    const selected: unknown[] = [];
    menu.on("select", (event: { itemId: string }) => selected.push(event.itemId));
    await opened(menu);
    (menu.element.querySelector('[data-id="copy"]') as HTMLElement).click();
    await after(400);
    expect({ selected, closes: closes.length }).toEqual({ selected: ["copy"], closes: 1 });
  });

  test("a close by something else, the platform or code, closes the menu once", async () => {
    const { opener } = setup();
    const { menu, closes } = make({ opener, layer: "top" });
    await opened(menu);
    (menu.element as HTMLElement & { hidePopover: () => void }).hidePopover();
    await after(400);
    expect(closes.length).toBe(1);
    expect(menu.isOpen()).toBe(false);
  });

  test("its own close is not reported back to it", async () => {
    const { opener } = setup();
    const { menu, closes } = make({ opener, layer: "top" });
    await opened(menu);
    menu.close();
    await after(400);
    await opened(menu);
    expect(closes.length).toBe(1);
    expect(menu.isOpen()).toBe(true);
    expect(menu.element.matches(":popover-open")).toBe(true);
  });

  test("a submenu opens beside it in the top layer and leaves it open", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = host.attachShadow({ mode: "open" });
    const { opener } = setup(root);
    const { menu, closes } = make({ opener, layer: "top" });
    await opened(menu);
    (menu.element.querySelector('[data-id="share"]') as HTMLElement).click();
    await after(50);
    const submenu = root.querySelector(".mtrl-menu--submenu") as HTMLElement;
    expect(submenu).not.toBeNull();
    expect(menu.element.nextElementSibling).toBe(submenu);
    expect(submenu.getAttribute("popover")).toBe("manual");
    expect(submenu.style.position).toBe("fixed");
    expect([submenu.matches(":popover-open"), menu.element.matches(":popover-open")]).toEqual([true, true]);
    // Its item selects and closes both
    (submenu.querySelector('[data-id="link"]') as HTMLElement).click();
    await after(400);
    expect(closes.length).toBe(1);
    expect(root.querySelector(".mtrl-menu")).toBeNull();
  });

  test("focus moving from an opener outside into the shadow root the menu is in keeps it open", async () => {
    // A menu element's surface is in its own shadow root, its anchor in the
    // page: the opener's blur names the host, not the menu
    const { opener } = setup();
    const host = document.createElement("div");
    document.body.append(host);
    const root = host.attachShadow({ mode: "open" });
    const { menu, closes } = make({ opener, layer: "top" });
    root.append(menu.element);
    await opened(menu);
    opener.dispatchEvent(new dom.window.FocusEvent("blur", { relatedTarget: host }));
    await after(100);
    expect(menu.isOpen()).toBe(true);
    opener.dispatchEvent(new dom.window.FocusEvent("blur", { relatedTarget: document.body }));
    await after(400);
    expect(closes.length).toBe(1);
  });

  test("without popover support it behaves as a menu without a layer", async () => {
    removePopover();
    const { opener } = setup();
    const { menu } = make({ opener, layer: "top" });
    await opened(menu);
    expect(menu.element.parentNode).toBe(document.body);
    expect(menu.element.hasAttribute("popover")).toBe(false);
    expect(menu.element.style.position).toBe("absolute");
  });
});
