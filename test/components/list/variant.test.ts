// The list's `variant`: 'standard' (the default, M3's baseline list) or
// 'segmented' (the expressive list, Compose's SegmentedListItem).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import createList from "../../../src/components/list";
import * as listIndex from "../../../src/components/list";
import { LIST_VARIANTS } from "../../../src/components/list/constants";
import { listElement } from "../../../src/elements/list";
import type { ListComponent, ListConfig, ListItem } from "../../../src/components/list/types";

let dom: JSDOM;
let lists: ListComponent<ListItem>[];
beforeEach(() => {
  dom = new JSDOM("<!doctype html><body></body>", { pretendToBeVisual: true });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent, KeyboardEvent: dom.window.KeyboardEvent });
  lists = [];
});
afterEach(() => { lists.forEach(list => list.destroy()); dom.window.close(); });
const mount = (config: Partial<ListConfig<ListItem>> = {}) => {
  const list = createList({ items: [{ id: "a", headline: "Alpha" }], ...config }); lists.push(list); document.body.append(list.element); return list;
};
const variantClasses = (list: ListComponent<ListItem>): string[] =>
  Array.from(list.element.classList).filter((name) => /^mtrl-list--(standard|segmented)$/.test(name));

describe("list variant", () => {
  test("LIST_VARIANTS names the two variants, from the constants path and the list's index", () => {
    expect(LIST_VARIANTS).toEqual({ STANDARD: "standard", SEGMENTED: "segmented" });
    expect((listIndex as Record<string, unknown>).LIST_VARIANTS).toBe(LIST_VARIANTS);
  });
  test("the default is standard", () => {
    expect(variantClasses(mount())).toEqual(["mtrl-list--standard"]);
  });
  test("each variant sets its modifier class, and only its own", () => {
    expect(variantClasses(mount({ variant: "standard" }))).toEqual(["mtrl-list--standard"]);
    expect(variantClasses(mount({ variant: "segmented" }))).toEqual(["mtrl-list--segmented"]);
  });
  test("an unknown variant is the default", () => {
    for (const variant of ["expressive", "", null, 3, "Segmented"]) {
      expect(variantClasses(mount({ variant: variant as never }))).toEqual(["mtrl-list--standard"]);
    }
  });
  test("the variant keeps the class option and the base class", () => {
    const list = mount({ variant: "segmented", class: "people" });
    expect(list.element.classList.contains("mtrl-list")).toBe(true);
    expect(list.element.classList.contains("people")).toBe(true);
  });
  test("<m-list> declares variant as a string attribute that feeds the factory's option", () => {
    const attributes = listElement.spec.attributes as Record<string, { type: string; config?: string }>;
    expect(attributes.variant).toEqual({ type: "string", config: "variant" });
  });
});
