import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { JSDOM } from "jsdom";
import createBottomAppBarToolbar from "../../../src/components/bottom-app-bar-toolbar";
import createBottomAppBar from "../../../src/components/bottom-app-bar";
import { setComponentDefaults, clearGlobalDefaults } from "../../../src/core/config/global";
import type { BottomAppBarComponent } from "../../../src/components/bottom-app-bar/types";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, Node: dom.window.Node, Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent, MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
});
const bars: BottomAppBarComponent[] = [];
const make = (config: Parameters<typeof createBottomAppBarToolbar>[0] = {}) => {
  const bar = createBottomAppBarToolbar(config); bars.push(bar); document.body.append(bar.element); return bar;
};
const scroll = (value: number) => {
  Object.defineProperty(window, "scrollY", { value, configurable: true });
  window.dispatchEvent(new Event("scroll"));
};
beforeEach(() => { document.body.replaceChildren(); clearGlobalDefaults(); scroll(0); });
afterEach(() => { bars.splice(0).forEach(bar => bar.destroy()); clearGlobalDefaults(); });

describe("opt-in bottom app bar toolbar", () => {
  test("has one named toolbar role and stable caller-owned actions/FAB containers", () => {
    const bar = make({ tag: "footer", fabPosition: "center", class: "custom" });
    const actions = bar.getActionsContainer();
    const fab = bar.element.querySelector(".mtrl-bottom-app-bar__fab-container");
    expect(bar.element.tagName).toBe("FOOTER");
    expect(bar.element.classList.contains("custom")).toBe(true);
    expect(bar.element.getAttribute("role")).toBe("toolbar");
    expect(bar.element.getAttribute("aria-label")).toBe("Bottom app bar");
    expect(bar.element.querySelector('[role="toolbar"]')).toBeNull();
    expect(bar.getActionsContainer()).toBe(actions);
    expect(fab).not.toBeNull();
    const first = document.createElement("button"), second = document.createElement("button"), direct = document.createElement("button");
    const listener: string[] = [];
    first.addEventListener("click", () => listener.push("caller"));
    expect(bar.addAction(first).addClass("extra")).toBe(bar);
    actions.append(direct);
    expect(first.hasAttribute("tabindex")).toBe(false);
    expect(bar.addFab(second)).toBe(bar);
    expect(bar.element.querySelector(".mtrl-bottom-app-bar__fab-container")).toBe(fab);
    const replacement = document.createElement("button");
    bar.addFab(replacement);
    expect(second.parentNode).toBeNull();
    expect(bar.element.classList.contains("mtrl-bottom-app-bar--fab-center")).toBe(true);
    bar.destroy(); bar.destroy();
    first.click();
    expect(listener).toEqual(["caller"]);
    expect(actions.contains(direct)).toBe(true);
    expect(fab?.contains(replacement)).toBe(true);
  });

  test("retains native Tab attributes, synchronous chains and once-per-change reentrant callbacks", () => {
    const states: boolean[] = [];
    const bar = make({ onVisibilityChange: visible => {
      states.push(visible);
      expect(bar.isVisible()).toBe(visible);
      if (!visible) bar.show();
    } });
    const action = document.createElement("button"); action.tabIndex = 3; bar.addAction(action);
    const events: string[] = [];
    bar.element.addEventListener("hide", () => events.push("hide"));
    expect(bar.hide()).toBe(bar);
    expect(bar.isVisible()).toBe(true);
    expect(states).toEqual([false, true]);
    expect(bar.show()).toBe(bar);
    expect(states).toEqual([false, true]);
    expect(bar.element.hasAttribute("inert")).toBe(false);
    expect(action.tabIndex).toBe(3);
    expect(events).toEqual([]);
  });

  test("uses the legacy per-event strict 10px threshold, reversal and cleanup", () => {
    const states: boolean[] = [];
    const bar = make({ autoHide: true, transitionDuration: 123, onVisibilityChange: v => states.push(v) });
    expect(bar.element.style.transition).toBe("transform 123ms ease-in-out");
    for (const value of [10, 20, 25, 30]) scroll(value);
    expect(bar.isVisible()).toBe(true);
    scroll(41); expect(bar.isVisible()).toBe(false);
    scroll(31); expect(bar.isVisible()).toBe(false);
    scroll(20); expect(bar.isVisible()).toBe(true);
    scroll(31); expect(bar.isVisible()).toBe(false);
    expect(states).toEqual([false, true, false]);
    bar.destroy(); scroll(0);
    expect(states).toEqual([false, true, false]);
  });

  test("never resolves toolbar defaults or mutates the shipped legacy implementation", () => {
    (setComponentDefaults as (name: string, config: object) => void)("toolbar", { items: [{ text: "Unexpected" }], color: "vibrant", scrollBehavior: "exit", ariaLabel: "Unexpected" });
    const bar = make();
    const legacy = createBottomAppBar(); bars.push(legacy);
    expect(bar.getActionsContainer().children.length).toBe(0);
    expect(bar.element.textContent).toBe("");
    expect(bar.element.getAttribute("aria-label")).toBe(legacy.element.getAttribute("aria-label"));
    expect(bar.config).toEqual(legacy.config);
    scroll(100);
    expect(bar.isVisible()).toBe(true);
    expect(legacy.element.classList.contains("mtrl-bottom-app-bar-toolbar")).toBe(false);
    expect(bar.element.style.transition).toBe(legacy.element.style.transition);
  });
});
