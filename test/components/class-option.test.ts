// test/components/class-option.test.ts
// FLO-403: custom root classes survive component config normalization.
import { describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import createTopAppBar from "../../src/components/top-app-bar";
import createBottomAppBar from "../../src/components/bottom-app-bar";
import createButtonGroup from "../../src/components/button-group";
import createSegmentedButton from "../../src/components/segmented-button";
import createTabs from "../../src/components/tabs";
import { createTab } from "../../src/components/tabs/tab";
import createToolbar from "../../src/components/toolbar";
import createFabMenu from "../../src/components/fab-menu";
import createSelect from "../../src/components/select";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent,
  MutationObserver: dom.window.MutationObserver,
  ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
});

const factories = [
  ["top app bar", (className: string) => createTopAppBar({ class: className })],
  ["bottom app bar", (className: string) => createBottomAppBar({ class: className })],
  ["button group", (className: string) => createButtonGroup({ class: className })],
  ["segmented button", (className: string) => createSegmentedButton({ class: className })],
  ["tabs", (className: string) => createTabs({ class: className })],
  ["tab", (className: string) => createTab({ text: "Tab", class: className })],
  ["toolbar", (className: string) => createToolbar({ class: className })],
  ["FAB menu", (className: string) => createFabMenu({
    icon: "", ariaLabel: "Actions", presentation: "list",
    items: [{ id: "one", text: "One" }, { id: "two", text: "Two" }],
    class: className,
  })],
  ["select", (className: string) => createSelect({ options: [], class: className })],
] as const;

for (const [name, create] of factories) {
  describe(`${name} class option`, () => {
    for (const classes of ["probe", "a b"]) {
      test(`puts '${classes}' on the root element`, () => {
        const component = create(classes);
        try {
          for (const className of classes.split(" ")) {
            expect(component.element.classList.contains(className)).toBe(true);
          }
        } finally {
          component.destroy();
        }
      });
    }
  });
}
