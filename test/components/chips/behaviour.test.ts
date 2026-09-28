// FLO-256, after the m3.material.io chips accessibility page: Backspace and Delete
// remove a focused removable chip and focus moves on to a neighbour, the arrows reach
// the set from the remove button and follow the reading direction, and the set is a
// named group without attributes ARIA does not allow on one.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { createChips, type ChipsConfig, type ChipsComponent } from "../../../src/components/chips";

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
  for (const chips of instances) {
    for (const chip of chips.getChips()) chip.destroy();
    chips.destroy();
  }
  dom.window.close();
});
const mount = (config: ChipsConfig = {}, host: HTMLElement = document.body) => {
  const chips = createChips(config);
  instances.push(chips);
  host.append(chips.element);
  return chips;
};
const press = (target: Element, key: string) =>
  target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
const inputs = (labels: string[], extra: Record<string, unknown> = {}) =>
  labels.map(label => ({ type: "input" as const, label, value: label.toLowerCase(), ...extra }));

describe("removing chips from the keyboard", () => {
  test("Backspace removes the focused input chip and focus moves to the next", () => {
    const chips = mount({ chips: inputs(["Ann", "Bob", "Cid"]) });
    const [, bob] = chips.getChips();
    bob!.focus();
    press(bob!.action, "Backspace");
    expect(chips.getChips().map(chip => chip.getLabel())).toEqual(["Ann", "Cid"]);
    expect(document.activeElement).toBe(chips.getChips()[1]!.action);
  });

  test("Delete on the last chip moves focus to the one before", () => {
    const chips = mount({ chips: inputs(["Ann", "Bob"]) });
    const bob = chips.getChips()[1]!;
    bob.focus();
    press(bob.action, "Delete");
    expect(chips.getChips().map(chip => chip.getLabel())).toEqual(["Ann"]);
    expect(document.activeElement).toBe(chips.getChips()[0]!.action);
  });

  test("the keys also work on the remove button, and not on chips that cannot be removed", () => {
    const chips = mount({ chips: [...inputs(["Ann"]), { type: "filter", label: "Food" }] });
    const ann = chips.getChips()[0]!;
    press(ann.element.querySelector(".mtrl-chip__remove")!, "Backspace");
    expect(chips.getChips().map(chip => chip.getLabel())).toEqual(["Food"]);
    const food = chips.getChips()[0]!;
    press(food.action, "Backspace");
    expect(chips.getChips()).toHaveLength(1);
  });

  test("a disabled chip is not removed", () => {
    const chips = mount({ chips: inputs(["Ann"], { disabled: true }) });
    press(chips.getChips()[0]!.action, "Delete");
    expect(chips.getChips()).toHaveLength(1);
  });
});

describe("arrows between chips", () => {
  test("an arrow on the remove button moves to the next chip; Enter there removes without selecting", () => {
    const chips = mount({ chips: inputs(["Ann", "Bob"]) });
    const [ann, bob] = chips.getChips();
    ann!.focus();
    press(ann!.element.querySelector(".mtrl-chip__remove")!, "ArrowRight");
    expect(document.activeElement).toBe(bob!.action);
    const remove = bob!.element.querySelector<HTMLButtonElement>(".mtrl-chip__remove")!;
    press(remove, "Enter");
    expect(bob!.isSelected()).toBe(false);
  });

  test("in a right-to-left layout ArrowLeft moves forward", () => {
    const host = document.createElement("div");
    host.setAttribute("dir", "rtl");
    document.body.append(host);
    const chips = mount({ chips: [{ label: "One" }, { label: "Two" }] }, host);
    const [one, two] = chips.getChips();
    one!.focus();
    press(one!.action, "ArrowLeft");
    expect(document.activeElement).toBe(two!.action);
    press(two!.action, "ArrowRight");
    expect(document.activeElement).toBe(one!.action);
  });
});

describe("the set's accessibility", () => {
  test("a named group, without aria-multiselectable", () => {
    const chips = mount({ label: "Interests", multiSelect: true, chips: [{ label: "One" }] });
    expect(chips.element.getAttribute("role")).toBe("group");
    expect(chips.element.hasAttribute("aria-multiselectable")).toBe(false);
    const label = chips.element.querySelector(".mtrl-chips__label")!;
    expect(label.id).not.toBe("");
    expect(chips.element.getAttribute("aria-labelledby")).toBe(label.id);
  });
});
