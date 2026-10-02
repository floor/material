import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { createChips, type ChipsConfig, type ChipsComponent, type ChipsEvents, type ChipComponent } from "../../../src/components/chips";

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
    // Destroy child instances explicitly: container lifecycle cleanup is separate from this contract.
    for (const chip of chips.getChips()) chip.destroy();
    chips.destroy();
  }
  dom.window.close();
});
const mount = (config: ChipsConfig = {}) => {
  const chips = createChips(config);
  instances.push(chips);
  document.body.append(chips.element);
  return chips;
};

describe("chips container events", () => {
  test("config add handlers receive each initial chip and later additions after insertion", () => {
    const added: { chip: ChipComponent; value: string | string[] | null }[] = [];
    const parents: (HTMLElement | null)[] = [];
    const chips = mount({ chips: [{ value: "a", selected: true, ripple: false }], on: { add: event => {
      added.push({ chip: event.chip, value: event.value });
      parents.push(event.chip.element.parentElement);
    } } });
    expect(added).toEqual([{ chip: chips.getChips()[0], value: ["a"] }]);
    expect(chips.addChip({ value: "b", ripple: false })).toBe(chips);
    expect(added).toEqual(chips.getChips().map(chip => ({ chip, value: ["a"] })));
    expect(added.map(event => event.chip.getValue())).toEqual(["a", "b"]);
    for (const parent of parents) expect(chips.element.contains(parent)).toBe(true);
  });

  test("add value equals the getter inside the handler in single and multi sets", () => {
    for (const multiSelect of [false, true]) {
      const chips = mount({ multiSelect });
      const values: unknown[] = [];
      chips.on("add", event => {
        expect(event.value).toEqual(chips.getValue());
        expect(chips.getChips()).toContain(event.chip);
        values.push(event.value);
      });
      chips.addChip({ value: "a", selected: true, ripple: false });
      chips.addChip({ value: "b", selected: true, ripple: false });
      expect(values).toEqual(multiSelect ? [["a"], ["a", "b"]] : ["a", "b"]);
    }
  });

  test("adding a selected chip moves a single selection before add is dispatched", () => {
    const chips = mount({ multiSelect: false });
    const events: unknown[] = [];
    chips.on("add", event => {
      expect(event.value).toBe(chips.getValue());
      events.push({ type: "add", value: event.value, chip: event.chip.getValue(), selected: chips.getSelectedValues() });
    });
    chips.on("change", event => events.push({ type: "change", value: event.value }));

    chips.addChip({ value: "a", selected: true, ripple: false });
    chips.addChip({ value: "b", selected: true, ripple: false });

    expect(chips.getChips().map(chip => chip.isSelected())).toEqual([false, true]);
    expect(chips.getValue()).toBe("b");
    expect(events).toEqual([
      { type: "add", value: "a", chip: "a", selected: ["a"] },
      { type: "add", value: "b", chip: "b", selected: ["b"] },
    ]);
  });

  test("initial selected chips in a single-select set leave the last declared selected", () => {
    const events: unknown[] = [];
    const chips = mount({ multiSelect: false, chips: [
      { value: "a", selected: true, ripple: false },
      { value: "b", selected: true, ripple: false },
    ], on: {
      add: event => events.push({ type: "add", value: event.value, selected: event.chip.isSelected() }),
      change: event => events.push({ type: "change", value: event.value }),
    } });
    expect(chips.getChips().map(chip => chip.isSelected())).toEqual([false, true]);
    expect(chips.getValue()).toBe("b");
    expect(events).toEqual([
      { type: "add", value: "a", selected: true },
      { type: "add", value: "b", selected: true },
    ]);
  });

  test("click change passes both arguments, including valueless chips, and calls onChange", () => {
    const events: [(string | null)[], string | null][] = [];
    const callbacks: [(string | null)[], string | null][] = [];
    const chips = mount({ multiSelect: true, chips: [{ value: "a", ripple: false }, { ripple: false }],
      on: { change: (...args) => events.push(args) }, onChange: (...args) => callbacks.push(args) });
    const [a, blank] = chips.getChips();
    a.element.click();
    blank.element.click();
    a.element.click();
    expect(events).toEqual([[["a"], "a"], [["a", null], null], [[null], "a"]]);
    expect(callbacks).toEqual(events);
  });

  test("keyboard selection emits the same positional change contract", () => {
    const events: [(string | null)[], string | null][] = [];
    const chips = mount({ multiSelect: true, chips: [{ value: "a", ripple: false }] });
    chips.on("change", (...args) => events.push(args));
    chips.element.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight" }));
    // Enter goes to the focused chip cell (FLO-261: the set is a grid of cells).
    document.activeElement!.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(events).toEqual([[["a"], "a"]]);
  });

  test("programmatic selection and clearing are silent; selectByValue(values, true) opts in with null as the changed value", () => {
    const events: [(string | null)[], string | null][] = [];
    const chips = mount({ multiSelect: false, chips: [{ value: "a", ripple: false }, { value: "b", ripple: false }] });
    chips.on("change", (...args) => events.push(args));
    // A programmatic change emits no change, as on a native control (FLO-328).
    chips.selectByValue("a").selectByValue("b").setValue("a").clearSelection();
    expect(chips.getSelectedValues()).toEqual([]);
    expect(events).toEqual([]);
    chips.selectByValue("a", true).selectByValue("a", true);
    expect(events).toEqual([[["a"], null]]);
  });

  test("change is one object with the element's value, and the positional call still works (FLO-320)", () => {
    const read: unknown[] = [];
    const positional: unknown[] = [];
    const single = mount({ multiSelect: false, chips: [{ value: "a", ripple: false }, { value: "b", ripple: false }] });
    const multi = mount({ multiSelect: true, chips: [{ value: "a", ripple: false }, { ripple: false }] });
    for (const chips of [single, multi]) {
      chips.on("change", event => read.push({ value: event.value, selected: event.selected, changed: event.changed }));
      chips.on("change", (selectedValues, changedValue) => positional.push([[...selectedValues], changedValue]));
    }
    single.getChips()[1].element.click();
    single.clearSelection();
    multi.getChips()[0].element.click();
    multi.getChips()[1].element.click();
    multi.selectByValue(["a"]);
    // clearSelection() and selectByValue() are silent (FLO-328): clicks only.
    expect(read).toEqual([
      { value: "b", selected: ["b"], changed: "b" },
      { value: ["a"], selected: ["a"], changed: "a" },
      // A chip without a value is in `selected` as null, and not in `value`
      { value: ["a"], selected: ["a", null], changed: null },
    ]);
    expect(positional).toEqual([[["b"], "b"], [["a"], "a"], [["a", null], null]]);
  });

  test("remove reports post-removal selection and the removed chip's value, by instance or index", () => {
    const chips = mount({ chips: [{ value: "a", selected: true, ripple: false }, { value: "b", selected: true, ripple: false }] });
    const original = chips.getChips();
    const removed: ChipComponent[] = [];
    const values: unknown[] = [];
    chips.on("remove", event => {
      expect(event.value).toEqual(chips.getValue());
      expect(chips.getChips()).not.toContain(event.chip);
      expect(chips.element.contains(event.chip.element)).toBe(false);
      values.push({ value: event.value, chipValue: event.chipValue });
      removed.push(event.chip);
    });
    chips.removeChip(original[0]).removeChip(0).removeChip(0);
    expect(values).toEqual([{ value: ["b"], chipValue: "a" }, { value: [], chipValue: "b" }]);
    expect(removed).toEqual(original);
    expect(chips.getChips()).toEqual([]);
    for (const chip of removed) expect(chip.element.isConnected).toBe(false);
  });

  test("remove preserves null chipValue and the single-select value shape", () => {
    const single = mount({ multiSelect: false, chips: [{ value: "a", selected: true, ripple: false }] });
    single.on("remove", event => {
      expect(event.value).toEqual(single.getValue());
      expect(event).toMatchObject({ value: null, chipValue: "a" });
    });
    single.removeChip(0);

    const multi = mount({ chips: [{ ripple: false }] });
    multi.on("remove", event => {
      expect(event.value).toEqual(multi.getValue());
      expect(event).toMatchObject({ value: [], chipValue: null });
    });
    multi.removeChip(0);
  });

  test("on/off preserve chaining and remove only the requested listener", () => {
    const chips = mount();
    const first: ChipComponent[] = [];
    const second: ChipComponent[] = [];
    const handler: ChipsEvents["add"] = event => first.push(event.chip);
    expect(chips.on("add", handler).on("add", event => second.push(event.chip))).toBe(chips);
    chips.addChip({ value: "a", ripple: false });
    expect(chips.off("add", handler)).toBe(chips);
    chips.addChip({ value: "b", ripple: false });
    expect(first.map(chip => chip.getValue())).toEqual(["a"]);
    expect(second.map(chip => chip.getValue())).toEqual(["a", "b"]);
  });
});
