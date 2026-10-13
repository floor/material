// test/components/toolbar/toolbar.test.ts
//
// The M3 Expressive toolbar in a JSDOM document: its variants and
// their settled options, the toolbar role and its one tab stop, the items it
// creates or takes, the FAB outside the tab stop, the injected overflow menu,
// leaving the screen on scroll, and cleanup.
import { describe, test, expect, afterEach } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.FocusEvent = dom.window.FocusEvent;
g.CustomEvent = dom.window.CustomEvent;
g.MutationObserver = dom.window.MutationObserver;
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = () => {};

import createToolbar from "../../../src/components/toolbar";
import type { ToolbarComponent, ToolbarConfig } from "../../../src/components/toolbar";

const ICON = '<svg viewBox="0 0 24 24"></svg>';
const icons = (...labels: string[]) => labels.map((ariaLabel) => ({ icon: ICON, ariaLabel }));

let toolbar: ToolbarComponent | null = null;
const make = (config: ToolbarConfig = {}) => {
  toolbar = createToolbar(config);
  document.body.appendChild(toolbar.element);
  return toolbar;
};

const has = (t: ToolbarComponent, modifier: string) => t.element.classList.contains(`mtrl-toolbar--${modifier}`);
const press = (key: string) => {
  const event = new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  document.activeElement!.dispatchEvent(event);
  return event;
};
const label = () => document.activeElement?.getAttribute("aria-label");

afterEach(() => {
  toolbar?.destroy();
  toolbar = null;
  document.body.replaceChildren();
  document.documentElement.removeAttribute("dir");
});

describe("toolbar variants", () => {
  test("docked by default: standard, spread, not placed, no shadow", () => {
    const t = make();
    expect(t.element.classList.contains("mtrl-toolbar")).toBe(true);
    for (const modifier of ["docked", "standard", "spread"]) expect(has(t, modifier)).toBe(true);
    for (const modifier of ["elevated", "bottom", "vertical"]) expect(has(t, modifier)).toBe(false);
  });

  test("floating is elevated unless elevated is false", () => {
    expect(has(make({ variant: "floating" }), "elevated")).toBe(true);
    toolbar!.destroy();
    expect(has(make({ variant: "floating", elevated: false }), "elevated")).toBe(false);
    toolbar!.destroy();
    expect(has(make({ variant: "docked", elevated: true }), "elevated")).toBe(false);
  });

  test("a docked toolbar is horizontal and docks only at the bottom", () => {
    const t = make({ variant: "docked", orientation: "vertical", placement: "top" });
    expect(has(t, "vertical")).toBe(false);
    expect(has(t, "bottom")).toBe(true);
    expect(has(t, "top")).toBe(false);
    expect(t.bar.hasAttribute("aria-orientation")).toBe(false);
  });

  test("a vertical floating toolbar takes start or end, a horizontal one bottom or top", () => {
    expect(has(make({ variant: "floating", orientation: "vertical", placement: "start" }), "start")).toBe(true);
    toolbar!.destroy();
    expect(has(make({ variant: "floating", orientation: "vertical", placement: "bottom" }), "end")).toBe(true);
    toolbar!.destroy();
    expect(has(make({ variant: "floating", placement: "top" }), "top")).toBe(true);
    toolbar!.destroy();
    expect(has(make({ variant: "floating", placement: "start" }), "bottom")).toBe(true);
  });

  test("a docked toolbar can centre its items", () => {
    const t = make({ arrangement: "center" });
    expect(has(t, "center")).toBe(true);
    expect(has(t, "spread")).toBe(false);
  });

  test("unknown values fall back to the defaults", () => {
    const t = make({ variant: "sideways", color: "neon", placement: "middle" });
    expect(has(t, "docked")).toBe(true);
    expect(has(t, "standard")).toBe(true);
    expect(t.getColor()).toBe("standard");
  });

  test("setColor switches between standard and vibrant", () => {
    const t = make({ color: "vibrant" });
    expect(has(t, "vibrant")).toBe(true);
    t.setColor("standard");
    expect(has(t, "vibrant")).toBe(false);
    expect(has(t, "standard")).toBe(true);
    expect(t.getColor()).toBe("standard");
  });
});

describe("toolbar role and name", () => {
  test("the bar is the toolbar, named, and the root has no role", () => {
    const t = make({ ariaLabel: "Formatting" });
    expect(t.bar.getAttribute("role")).toBe("toolbar");
    expect(t.bar.getAttribute("aria-label")).toBe("Formatting");
    expect(t.element.hasAttribute("role")).toBe(false);
    expect(t.bar.parentElement).toBe(t.element);
  });

  test("a default name", () => {
    expect(make().bar.getAttribute("aria-label")).toBe("Toolbar");
  });

  test("a vertical toolbar says so", () => {
    expect(make({ variant: "floating", orientation: "vertical" }).bar.getAttribute("aria-orientation")).toBe("vertical");
  });
});

describe("toolbar items", () => {
  test("icon button and button configs become components, elements are taken as they are", () => {
    const field = document.createElement("div");
    field.innerHTML = '<input aria-label="Find">';
    const t = make({ items: [...icons("Bold"), { text: "Save" }, field, { element: document.createElement("hr") }] });
    const items = t.getItems();
    expect(items).toHaveLength(4);
    expect(items[0].classList.contains("mtrl-icon-button")).toBe(true);
    expect(items[0].getAttribute("aria-label")).toBe("Bold");
    expect(items[1].classList.contains("mtrl-button")).toBe(true);
    expect(items[2]).toBe(field);
    expect(items[3].localName).toBe("hr");
  });

  test("toggle icon buttons keep their pressed state", () => {
    const t = make({ items: [{ icon: ICON, ariaLabel: "Bold", toggle: true, selected: true }] });
    expect(t.getItems()[0].getAttribute("aria-pressed")).toBe("true");
  });

  test("add appends before the overflow button, remove takes an item out", () => {
    const t = make({ items: icons("A"), overflow: () => null });
    const b = t.add({ icon: ICON, ariaLabel: "B" });
    expect(t.getItems().map((el) => el.getAttribute("aria-label"))).toEqual(["A", "B"]);
    expect(t.bar.lastElementChild).toBe(t.overflowButton);
    t.remove(b);
    expect(t.getItems().map((el) => el.getAttribute("aria-label"))).toEqual(["A"]);
    t.remove(t.overflowButton!);
    expect(t.bar.contains(t.overflowButton)).toBe(true);
  });
});

describe("toolbar keyboard", () => {
  test("one tab stop, moved by the arrow keys, Home and End", () => {
    const t = make({ items: icons("A", "B", "C") });
    const items = t.getItems();
    expect(items.map((el) => el.tabIndex)).toEqual([0, -1, -1]);
    items[0].focus();
    press("ArrowRight");
    expect(label()).toBe("B");
    press("End");
    expect(label()).toBe("C");
    expect(items.map((el) => el.tabIndex)).toEqual([-1, -1, 0]);
    press("Home");
    expect(label()).toBe("A");
  });

  test("a vertical toolbar moves with Up and Down", () => {
    const t = make({ variant: "floating", orientation: "vertical", items: icons("A", "B") });
    t.getItems()[0].focus();
    press("ArrowRight");
    expect(label()).toBe("A");
    press("ArrowDown");
    expect(label()).toBe("B");
  });

  test("right to left, Left moves forward", () => {
    document.documentElement.setAttribute("dir", "rtl");
    const t = make({ items: icons("A", "B") });
    t.getItems()[0].focus();
    press("ArrowLeft");
    expect(label()).toBe("B");
  });

  test("a text field's input is a target, and keeps its keys", () => {
    const field = document.createElement("div");
    field.innerHTML = '<input aria-label="Find">';
    const t = make({ items: [...icons("A"), field, ...icons("C")] });
    t.getItems()[0].focus();
    press("ArrowRight");
    expect(label()).toBe("Find");
    expect(press("ArrowRight").defaultPrevented).toBe(false);
    expect(label()).toBe("Find");
  });

  test("disabled items are skipped", () => {
    const t = make({ items: [...icons("A"), { icon: ICON, ariaLabel: "B", disabled: true }, ...icons("C")] });
    t.getItems()[0].focus();
    press("ArrowRight");
    expect(label()).toBe("C");
  });

  test("the overflow button is the last target", () => {
    const t = make({ items: icons("A"), overflow: () => null, overflowLabel: "More" });
    t.getItems()[0].focus();
    press("End");
    expect(document.activeElement).toBe(t.overflowButton);
    expect(label()).toBe("More");
  });

  test("an item added later joins the tab stops", () => {
    const t = make({ items: icons("A") });
    const b = t.add({ icon: ICON, ariaLabel: "B" });
    expect(b.tabIndex).toBe(-1);
    t.getItems()[0].focus();
    press("ArrowRight");
    expect(document.activeElement).toBe(b);
  });
});

describe("toolbar with a slot", () => {
  // As <m-toolbar> builds it: the default slot is the only item, and the
  // toolbar walks what is assigned to it (each item's host).
  const slotted = (...labels: string[]) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: "open" });
    const t = createToolbar({ items: [document.createElement("slot")] });
    toolbar = t;
    root.appendChild(t.element);
    const add = (label: string) => {
      const item = document.createElement("m-item");
      item.setAttribute("aria-label", label);
      host.appendChild(item);
      return item;
    };
    return { host, t, items: labels.map(add), add };
  };
  const slotChange = (t: ToolbarComponent) => t.bar.querySelector("slot")!.dispatchEvent(new dom.window.Event("slotchange", { bubbles: true }));

  test("the assigned hosts are the targets, the first takes the tab stop", () => {
    const { t, items } = slotted("A", "B");
    slotChange(t);
    expect(items.map((item) => item.tabIndex)).toEqual([0, -1]);
  });

  test("an item slotted later joins the targets on slotchange", () => {
    const { t, items, add } = slotted("A");
    const b = add("B");
    slotChange(t);
    expect(items[0].tabIndex).toBe(0);
    expect(b.tabIndex).toBe(-1);
  });

  test("a disabled host is skipped", () => {
    const { t, items } = slotted("A", "B", "C");
    items[1].setAttribute("disabled", "");
    slotChange(t);
    // A slotted item's key event reaches the bar through the slot.
    items[0].dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(items.map((item) => item.tabIndex)).toEqual([-1, -1, 0]);
  });
});

describe("toolbar FAB", () => {
  const fab = () => {
    const el = document.createElement("button");
    el.setAttribute("aria-label", "Compose");
    return el;
  };

  test("sits beside the bar, outside the toolbar and its tab stop", () => {
    const f = fab();
    const t = make({ variant: "floating", items: icons("A", "B"), fab: f });
    expect(has(t, "with-fab")).toBe(true);
    expect(t.bar.contains(f)).toBe(false);
    expect(t.element.contains(f)).toBe(true);
    expect(f.tabIndex).toBe(0);
    expect(t.element.lastElementChild?.contains(f)).toBe(true);
    t.getItems()[1].focus();
    press("ArrowRight");
    expect(label()).toBe("B");
  });

  test("at the start, it comes first", () => {
    const f = fab();
    const t = make({ variant: "floating", items: icons("A"), fab: { element: f }, fabPosition: "start" });
    expect(has(t, "fab-start")).toBe(true);
    expect(t.element.firstElementChild?.contains(f)).toBe(true);
  });
});

describe("toolbar overflow", () => {
  test("the overflow button opens a menu the caller builds, destroyed with the toolbar", () => {
    let opener: HTMLElement | null = null;
    let destroyed = 0;
    const t = make({
      items: icons("A"),
      overflow: (button) => {
        opener = button;
        return { destroy: () => destroyed++ };
      },
    });
    expect(opener).toBe(t.overflowButton);
    expect(t.overflowButton?.getAttribute("aria-label")).toBe("More options");
    expect(t.overflowButton?.getAttribute("aria-haspopup")).toBe("menu");
    t.destroy();
    toolbar = null;
    expect(destroyed).toBe(1);
  });

  test("no overflow, no button", () => {
    expect(make({ items: icons("A") }).overflowButton).toBeNull();
  });
});

describe("toolbar visibility", () => {
  const scroller = () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    return el;
  };
  const scrollTo = (el: HTMLElement, y: number) => {
    el.scrollTop = y;
    el.dispatchEvent(new dom.window.Event("scroll"));
  };

  test("hide takes the toolbar out of the focus order, show brings it back, each once", () => {
    const t = make({ items: icons("A") });
    const seen: string[] = [];
    t.on("hide", () => seen.push("hide"));
    t.on("show", () => seen.push("show"));
    t.hide().hide();
    expect(t.isVisible()).toBe(false);
    expect(has(t, "hidden")).toBe(true);
    expect(t.element.hasAttribute("inert")).toBe(true);
    t.show().show();
    expect(t.isVisible()).toBe(true);
    expect(has(t, "hidden")).toBe(false);
    expect(t.element.hasAttribute("inert")).toBe(false);
    expect(seen).toEqual(["hide", "show"]);
  });

  test("exit: leaves after the threshold forward, returns after the threshold back", () => {
    const el = scroller();
    const t = make({ variant: "floating", placement: "bottom", scrollBehavior: "exit", scrollTarget: el });
    scrollTo(el, 39);
    expect(t.isVisible()).toBe(true);
    scrollTo(el, 45);
    expect(t.isVisible()).toBe(false);
    scrollTo(el, 200);
    scrollTo(el, 170);
    expect(t.isVisible()).toBe(false);
    scrollTo(el, 160);
    expect(t.isVisible()).toBe(true);
  });

  test("exit: back at the top, the toolbar shows", () => {
    const el = scroller();
    const t = make({ scrollBehavior: "exit", scrollTarget: el, scrollThreshold: 100 });
    scrollTo(el, 150);
    expect(t.isVisible()).toBe(false);
    scrollTo(el, 0);
    expect(t.isVisible()).toBe(true);
  });

  test("exit follows the window by default", () => {
    const t = make({ scrollBehavior: "exit" });
    Object.defineProperty(window, "scrollY", { value: 80, configurable: true });
    window.dispatchEvent(new dom.window.Event("scroll"));
    expect(t.isVisible()).toBe(false);
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  test("without exit, scrolling does nothing", () => {
    const el = scroller();
    const t = make({ scrollTarget: el });
    scrollTo(el, 500);
    expect(t.isVisible()).toBe(true);
  });
});

describe("toolbar cleanup", () => {
  test("destroy removes the element, the scroll listener and the items it created", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const own = document.createElement("button");
    const t = make({ scrollBehavior: "exit", scrollTarget: el, items: [...icons("A"), own] });
    const created = t.getItems()[0];
    t.destroy();
    toolbar = null;
    expect(document.body.contains(t.element)).toBe(false);
    el.scrollTop = 500;
    el.dispatchEvent(new dom.window.Event("scroll"));
    // The emitter is cleared on destroy, so the state is what tells a live listener.
    expect(t.isVisible()).toBe(true);
    expect(created.isConnected).toBe(false);
    expect(own.isConnected).toBe(false);
  });

  test("the chain returns the toolbar", () => {
    const t = make();
    expect(t.addClass("extra")).toBe(t);
    expect(t.element.classList.contains("extra")).toBe(true);
  });
});
