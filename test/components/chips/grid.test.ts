// A chip set follows the m3.material.io chips' web roles. It is a grid with a
// row of gridcell chips and one Tab stop; a one-action chip's cell is its focus
// target and carries the selection, and a two-action chip keeps its two buttons.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { createChips, createFilterChip, type ChipsConfig, type ChipsComponent } from "../../../src/components/chips";

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
  for (const chips of instances) { for (const chip of chips.getChips()) chip.destroy(); chips.destroy(); }
  dom.window.close();
});
const mount = (config: ChipsConfig) => {
  const chips = createChips(config);
  instances.push(chips);
  document.body.append(chips.element);
  return chips;
};
const press = (target: Element, key: string) =>
  target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
const tabStops = (chips: ChipsComponent) =>
  Array.from(chips.element.querySelectorAll<HTMLElement>("[tabindex]")).filter(element => element.tabIndex === 0);

describe("chip set as a grid", () => {
  test("grid > row > gridcell, the grid named and saying whether several can be selected", () => {
    const chips = mount({ label: "Filters", multiSelect: false, chips: [{ label: "A" }, { type: "input", label: "B" }] });
    expect(chips.element.getAttribute("role")).toBe("grid");
    expect(chips.element.getAttribute("aria-multiselectable")).toBe("false");
    const row = chips.element.querySelector(".mtrl-chips__container")!;
    expect(row.getAttribute("role")).toBe("row");
    for (const chip of chips.getChips()) expect(chip.element.getAttribute("role")).toBe("gridcell");
  });

  test("a one-action chip's cell is its focus target and carries the selection; its button is hidden", () => {
    const chips = mount({ chips: [{ label: "A", value: "a" }] });
    const [a] = chips.getChips();
    expect(a!.element.tabIndex).toBe(0);
    expect(a!.action.getAttribute("aria-hidden")).toBe("true");
    expect(a!.action.hasAttribute("role")).toBe(false);
    expect(a!.element.getAttribute("aria-selected")).toBe("false");
    a!.focus();
    expect(document.activeElement).toBe(a!.element);
    press(a!.element, " ");
    expect(a!.element.getAttribute("aria-selected")).toBe("true");
    expect(chips.getSelectedValues()).toEqual(["a"]);
  });

  test("the set is one Tab stop, which follows focus", () => {
    const chips = mount({ chips: [{ label: "A" }, { label: "B" }, { label: "C" }] });
    const [a, b] = chips.getChips();
    expect(tabStops(chips)).toEqual([a!.element]);
    a!.focus();
    press(a!.element, "ArrowRight");
    expect(document.activeElement).toBe(b!.element);
    expect(tabStops(chips)).toEqual([b!.element]);
  });

  test("a two-action chip's action and remove button are targets in turn; Home and End reach the ends", () => {
    const chips = mount({ chips: [{ label: "A" }, { type: "input", label: "B" }, { label: "C" }] });
    const [a, b, c] = chips.getChips();
    const remove = b!.element.querySelector<HTMLElement>(".mtrl-chip__remove")!;
    expect(b!.element.hasAttribute("tabindex")).toBe(false);
    a!.focus();
    press(a!.element, "ArrowRight");
    expect(document.activeElement).toBe(b!.action);
    press(b!.action, "ArrowRight");
    expect(document.activeElement).toBe(remove);
    press(remove, "ArrowRight");
    expect(document.activeElement).toBe(c!.element);
    press(c!.element, "Home");
    expect(document.activeElement).toBe(a!.element);
    press(a!.element, "End");
    expect(document.activeElement).toBe(c!.element);
  });

  test("a chip on its own keeps its native button", () => {
    const chip = createFilterChip({ label: "Alone" });
    document.body.append(chip.element);
    expect(chip.element.hasAttribute("role")).toBe(false);
    expect(chip.action.getAttribute("role")).toBe("checkbox");
    expect(chip.action.hasAttribute("aria-hidden")).toBe(false);
    chip.destroy();
  });
});
