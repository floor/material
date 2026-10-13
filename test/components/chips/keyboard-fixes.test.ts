// test/components/chips/keyboard-fixes.test.ts
//
// A keyboard fix the migration found (the migration was not merged; its
// fixes were): keyboard.disable() stops the arrows. The set's own listener kept
// handling them after the chips' listeners were removed. The other chips fix,
// the direction through a shadow root, is checked in a browser (elements:check):
// JSDOM's :dir() does not cross a shadow root.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { createChips, type ChipsComponent } from "../../../src/components/chips";

let dom: JSDOM;
let instances: ChipsComponent[];
beforeEach(() => {
  dom = new JSDOM("<!DOCTYPE html><body></body>", { url: "http://localhost/", pretendToBeVisual: true });
  Object.assign(globalThis, {
    window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node,
    Event: dom.window.Event, MouseEvent: dom.window.MouseEvent, KeyboardEvent: dom.window.KeyboardEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  });
  instances = [];
});
afterEach(() => {
  for (const chips of instances) chips.destroy();
  dom.window.close();
});

const press = (target: Element, key: string) =>
  target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

const chipsIn = (parent: Node) => {
  const chips = createChips({ chips: [{ label: "A" }, { label: "B" }, { label: "C" }] });
  instances.push(chips);
  parent.appendChild(chips.element);
  return chips;
};

test("keyboard.disable() stops the arrows, and enable brings them back", () => {
  const chips = chipsIn(document.body);
  const { keyboard } = chips;
  const [a, b] = chips.getChips();
  keyboard.disable();
  a!.element.focus();
  press(a!.element, "ArrowRight");
  expect(document.activeElement).toBe(a!.element);
  keyboard.enable();
  press(a!.element, "ArrowRight");
  expect(document.activeElement).toBe(b!.element);
});
