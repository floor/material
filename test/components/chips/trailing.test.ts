// FLO-259: a filter chip's trailing icon can have its own action (the m3.material.io
// chips' trailing icon "can be used to open a menu or remove the chip"), and a chip an
// app makes draggable shows Compose's dragged state.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { createChips, createFilterChip, type ChipComponent } from "../../../src/components/chips";

let dom: JSDOM;
beforeEach(() => {
  dom = new JSDOM("<!DOCTYPE html><body></body>", { url: "http://localhost/", pretendToBeVisual: true });
  Object.assign(globalThis, {
    window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node,
    Event: dom.window.Event, MouseEvent: dom.window.MouseEvent, KeyboardEvent: dom.window.KeyboardEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  });
});
afterEach(() => dom.window.close());
const mount = (chip: ChipComponent) => { document.body.append(chip.element); return chip; };
const press = (target: Element, key: string) =>
  target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

describe("filter chip trailing action", () => {
  test("a menu trailing button beside the action, named, with popup semantics and a drop-down arrow", () => {
    const calls: ChipComponent[] = [];
    const chip = mount(createFilterChip({ label: "Price", trailingMenu: true, onTrailingClick: c => calls.push(c) }));
    const button = chip.trailingAction!;
    expect(button).toBeDefined();
    expect(button.parentElement).toBe(chip.element);
    expect(chip.action.contains(button)).toBe(false);
    expect(button.getAttribute("aria-label")).toBe("Price options");
    expect(button.getAttribute("aria-haspopup")).toBe("menu");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.querySelector("path")?.getAttribute("d")).toBe("M7 10l5 5 5-5z");
    const emitted: ChipComponent[] = [];
    chip.on("trailing", c => emitted.push(c));
    button.click();
    expect(calls).toEqual([chip]);
    expect(emitted).toEqual([chip]);
    expect(chip.isSelected()).toBe(false);
  });

  test("without trailingMenu it removes: named Remove {label}, a close icon; trailingLabel overrides", () => {
    const chip = mount(createFilterChip({ label: "Red", onTrailingClick: () => {} }));
    expect(chip.trailingAction!.getAttribute("aria-label")).toBe("Remove Red");
    expect(chip.trailingAction!.hasAttribute("aria-haspopup")).toBe(false);
    const named = mount(createFilterChip({ label: "Red", onTrailingClick: () => {}, trailingLabel: "Clear red" }));
    expect(named.trailingAction!.getAttribute("aria-label")).toBe("Clear red");
  });

  test("a disabled chip's trailing button is disabled and does nothing", () => {
    let calls = 0;
    const chip = mount(createFilterChip({ label: "Price", disabled: true, onTrailingClick: () => calls++ }));
    expect(chip.trailingAction!.disabled).toBe(true);
    chip.trailingAction!.click();
    expect(calls).toBe(0);
  });

  test("without onTrailingClick there is no trailing button", () => {
    expect(mount(createFilterChip({ label: "Red" })).trailingAction).toBeUndefined();
  });

  test("in a set, Enter on it does not select the chip, and the arrows move on", () => {
    let opened = 0;
    const chips = createChips({ chips: [{ type: "filter", label: "Price", trailingMenu: true, onTrailingClick: () => opened++ }, { type: "filter", label: "Size" }] });
    document.body.append(chips.element);
    const [price, size] = chips.getChips();
    press(price!.trailingAction!, "Enter");
    expect(price!.isSelected()).toBe(false);
    price!.focus();
    press(price!.trailingAction!, "ArrowRight");
    expect(document.activeElement).toBe(size!.action);
    price!.trailingAction!.click();
    expect(opened).toBe(1);
  });
});

describe("dragged state", () => {
  test("a dragged chip is marked from dragstart to dragend", () => {
    const chip = mount(createFilterChip({ label: "Red" }));
    chip.element.draggable = true;
    chip.element.dispatchEvent(new dom.window.Event("dragstart", { bubbles: true }));
    expect(chip.element.classList.contains("mtrl-chip--dragged")).toBe(true);
    chip.element.dispatchEvent(new dom.window.Event("dragend", { bubbles: true }));
    expect(chip.element.classList.contains("mtrl-chip--dragged")).toBe(false);
  });
});

// A chip appears finished: its icons animate only on a change after it was made, since
// @starting-style would otherwise grow them on the first render.
describe("motion only after the chip was made", () => {
  test("a new chip, selected or with an icon, carries no --motion; its first change adds it", () => {
    const chip = mount(createFilterChip({ label: "Red", selected: true, leadingIcon: '<svg viewBox="0 0 24 24"></svg>' }));
    expect(chip.element.classList.contains("mtrl-chip--motion")).toBe(false);
    chip.setSelected(false);
    expect(chip.element.classList.contains("mtrl-chip--motion")).toBe(true);
  });

  test("in a set too: built chips are still, a click animates", () => {
    const chips = createChips({ chips: [{ label: "A", selected: true }, { label: "B" }] });
    document.body.append(chips.element);
    const [a, b] = chips.getChips();
    expect(a!.element.classList.contains("mtrl-chip--motion")).toBe(false);
    b!.action.click();
    expect(b!.element.classList.contains("mtrl-chip--motion")).toBe(true);
  });
});
