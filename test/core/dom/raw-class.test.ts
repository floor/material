// test/core/dom/raw-class.test.ts
//
// 1.0 removed `rawClass` (FLO-117 made class and className unprefixed, so it
// did what they do). A 0.10 caller that still passes it gets neither its
// classes nor a stray rawclass attribute: the key stays reserved.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { createElement } from "../../../src/core/dom/create";

let dom: JSDOM;
beforeAll(() => {
  dom = new JSDOM("<!doctype html><body></body>");
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node });
});
afterAll(() => dom.window.close());

test("rawClass is ignored, not applied and not written as an attribute; class is the way", () => {
  const element = createElement({ rawClass: "legacy-a legacy-b" } as Parameters<typeof createElement>[0]);
  expect(element.className).toBe("");
  expect(element.hasAttribute("rawclass")).toBe(false);
  expect(createElement({ class: "legacy-a legacy-b" }).className).toBe("legacy-a legacy-b");
});
