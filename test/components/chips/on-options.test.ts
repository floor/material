// A config on* option is the same listener as on(event): same calls, same payload.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import {
  createChips,
  createFilterChip,
  createInputChip,
  type ChipChangePayload,
  type ChipComponent,
  type ChipEvents,
  type ChipsChangeEvent,
  type ChipsComponent,
  type ChipsConfig,
} from "../../../src/components/chips";

let dom: JSDOM;
let chips: ChipComponent[];
let sets: ChipsComponent[];
beforeEach(() => {
  dom = new JSDOM("<!DOCTYPE html><body></body>", { url: "http://localhost/", pretendToBeVisual: true });
  Object.assign(globalThis, {
    window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node,
    Event: dom.window.Event, MouseEvent: dom.window.MouseEvent, KeyboardEvent: dom.window.KeyboardEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  });
  chips = [];
  sets = [];
});
afterEach(() => {
  for (const set of sets) {
    for (const chip of set.getChips()) chip.destroy();
    set.destroy();
  }
  for (const chip of chips) chip.destroy();
  dom.window.close();
});
const mountChip = <T extends ChipComponent>(chip: T) => {
  chips.push(chip);
  document.body.append(chip.element);
  return chip;
};
const mountSet = (config: ChipsConfig) => {
  const set = createChips(config);
  sets.push(set);
  document.body.append(set.element);
  return set;
};

describe("chips set onChange is an on(change) listener", () => {
  test("a click and selectByValue(value, true) call onChange and on(change) once each, with the same object", () => {
    for (const multiSelect of [false, true]) {
      const option: ChipsChangeEvent[] = [];
      const listener: ChipsChangeEvent[] = [];
      const set = mountSet({
        multiSelect,
        chips: [{ value: "a", ripple: false }, { value: "b", ripple: false }],
        onChange: event => option.push(event),
      });
      set.on("change", event => listener.push(event));

      set.getChips()[0]!.element.click();
      set.selectByValue("b", true);

      expect(option).toHaveLength(2);
      expect(listener).toHaveLength(2);
      expect(option[0]).toBe(listener[0]);
      expect(option[1]).toBe(listener[1]);
      expect(option.map(event => ({ ...event }))).toEqual([
        { value: multiSelect ? ["a"] : "a", selected: ["a"], changed: "a" },
        {
          value: multiSelect ? ["a", "b"] : "b",
          selected: multiSelect ? ["a", "b"] : ["b"],
          changed: null,
        },
      ]);
    }
  });

  test("onChange runs after a listener registered earlier and before one registered later", () => {
    const order: string[] = [];
    const set = mountSet({
      chips: [{ value: "a", ripple: false }],
      on: { change: () => order.push("earlier") },
      onChange: () => order.push("option"),
    });
    set.on("change", () => order.push("later"));
    set.getChips()[0]!.element.click();
    expect(order).toEqual(["earlier", "option", "later"]);
  });

  test("off(change) drops onChange, and selectByValue without the flag stays silent", () => {
    const calls: string[] = [];
    const onChange = () => calls.push("option");
    const listener = () => calls.push("listener");
    const set = mountSet({
      chips: [{ value: "a", ripple: false }, { value: "b", ripple: false }],
      onChange,
    });
    set.on("change", listener);
    expect(set.off("change", onChange).off("change", listener)).toBe(set);
    set.getChips()[0]!.element.click();
    set.selectByValue("b");
    set.selectByValue("b", true);
    expect(calls).toEqual([]);
    expect(set.getSelectedValues()).toEqual(["b"]);
  });

  test("an onChange that selectByValue(value, true) the same value stops at the second call", () => {
    const values: unknown[] = [];
    let set!: ChipsComponent;
    set = mountSet({
      multiSelect: false,
      chips: [{ value: "a", ripple: false }, { value: "b", ripple: false }],
      onChange: event => {
        values.push(event.value);
        if (values.length > 2) throw new Error("loop");
        set.selectByValue("a", true);
      },
    });
    set.getChips()[1]!.element.click();
    expect(values).toEqual(["b", "a"]);
    expect(set.getValue()).toBe("a");
  });

  test("a listener that destroys the set is not followed by a later handler, and teardown calls nothing", () => {
    const calls: string[] = [];
    let set!: ChipsComponent;
    set = mountSet({
      chips: [{ value: "a", ripple: false }, { value: "b", ripple: false }],
      on: {
        change: () => {
          calls.push("early");
          set.destroy();
        },
      },
      onChange: () => calls.push("onChange"),
    });
    expect(() => set.getChips()[0]!.element.click()).not.toThrow();
    expect(calls).toEqual(["early"]);
    calls.length = 0;
    expect(() => set.selectByValue("b", true)).not.toThrow();
    expect(() => set.destroy()).not.toThrow();
    expect(calls).toEqual([]);
  });
});

describe("a chip alone: on* options are the event listeners", () => {
  test("onChange matches the change listener for a click, including a leftover (selected, chip)", () => {
    const option: ChipChangePayload[] = [];
    const listener: ChipChangePayload[] = [];
    const order: string[] = [];
    let leftover: { length: number; selected: unknown; chip: unknown } | undefined;
    const chip = mountChip(createFilterChip({
      label: "Filter",
      value: "f",
      ripple: false,
      onChange: (payload) => {
        order.push("option");
        option.push(payload);
      },
    }));
    chip.on("change", (payload) => {
      order.push("listener");
      listener.push(payload);
    });
    const old = mountChip(createFilterChip({
      label: "Old",
      value: "old",
      ripple: false,
      onChange: function (selected: unknown, instance: unknown) {
        leftover = { length: arguments.length, selected, chip: instance };
      } as ChipEvents["change"],
    }));

    chip.action.click();
    chip.action.click();
    old.action.click();

    expect(option).toHaveLength(2);
    expect(listener).toHaveLength(2);
    expect(option[0]).toBe(listener[0]);
    expect(option[1]).toBe(listener[1]);
    expect(option).toEqual([
      { selected: true, chip, value: "f" },
      { selected: false, chip, value: "f" },
    ]);
    expect(order).toEqual(["option", "listener", "option", "listener"]);
    expect(leftover).toEqual({
      length: 1,
      selected: { selected: true, chip: old, value: "old" },
      chip: undefined,
    });
    chip.setSelected(true);
    expect(option).toHaveLength(2);
  });

  test("onClick matches the click listener, including a leftover that expected the chip", () => {
    const option: unknown[] = [];
    const listener: unknown[] = [];
    const order: string[] = [];
    let leftover: { length: number; first: unknown; second: unknown } | undefined;
    const chip = mountChip(createFilterChip({
      label: "Filter",
      ripple: false,
      onClick: (payload) => {
        order.push("option");
        option.push(payload);
      },
    }));
    chip.on("click", (payload) => {
      order.push("listener");
      listener.push(payload);
    });
    const old = mountChip(createAssistChipStandIn());
    function createAssistChipStandIn() {
      return createFilterChip({
        label: "Old",
        ripple: false,
        onClick: function (first: unknown, second: unknown) {
          leftover = { length: arguments.length, first, second };
        } as ChipEvents["click"],
      });
    }
    old.action.click();
    chip.action.click();

    expect(option).toHaveLength(1);
    expect(listener).toHaveLength(1);
    expect(option[0]).toBe(listener[0]);
    const payload = option[0] as { event: MouseEvent; originalEvent: MouseEvent; element: HTMLElement };
    expect(payload.element).toBe(chip.element);
    expect(payload.event).toBe(payload.originalEvent);
    expect(payload.event.type).toBe("click");
    expect(order).toEqual(["option", "listener"]);
    expect(leftover?.length).toBe(1);
    expect(leftover?.second).toBeUndefined();
    const first = leftover?.first as { element?: HTMLElement; focus?: unknown };
    expect(first.element).toBe(old.element);
    expect(first.focus).toBeUndefined();
  });

  test("onRemove matches the remove listener and is registered before a later one", () => {
    const option: ChipComponent[] = [];
    const listener: ChipComponent[] = [];
    const order: string[] = [];
    const chip = mountChip(createInputChip({
      label: "Ada",
      ripple: false,
      onRemove: (instance) => {
        order.push("option");
        option.push(instance);
      },
    }));
    chip.on("remove", (instance) => {
      order.push("listener");
      listener.push(instance);
    });
    chip.element.querySelector<HTMLButtonElement>(".mtrl-chip__remove")!.click();
    expect(option).toEqual([chip]);
    expect(listener).toEqual([chip]);
    expect(option[0]).toBe(listener[0]);
    expect(order).toEqual(["option", "listener"]);
  });

  test("onTrailingClick matches the trailing listener and is registered before a later one", () => {
    const option: ChipComponent[] = [];
    const listener: ChipComponent[] = [];
    const order: string[] = [];
    const chip = mountChip(createFilterChip({
      label: "Price",
      ripple: false,
      onTrailingClick: (instance) => {
        order.push("option");
        option.push(instance);
      },
    }));
    chip.on("trailing", (instance) => {
      order.push("listener");
      listener.push(instance);
    });
    chip.trailingAction!.click();
    expect(option).toEqual([chip]);
    expect(listener).toEqual([chip]);
    expect(option[0]).toBe(listener[0]);
    expect(order).toEqual(["option", "listener"]);
  });

  test("onSelect still receives the chip and has no event of its own", () => {
    const selected: ChipComponent[] = [];
    const chip = mountChip(createFilterChip({
      label: "Filter",
      ripple: false,
      onSelect: (instance) => selected.push(instance),
    }));
    const names: string[] = [];
    chip.on("change", () => names.push("change"));
    chip.action.click();
    expect(selected).toEqual([chip]);
    expect(names).toEqual(["change"]);
    expect("select" in chip).toBe(false);
  });
});

describe("a chip inside a set keeps today's item callbacks", () => {
  test("the item onChange is still (selected, chip), the chip's change does not fire, and onSelect still receives the chip", () => {
    const itemChange: unknown[][] = [];
    const itemSelect: unknown[] = [];
    const chipChange: unknown[] = [];
    const setChange: ChipsChangeEvent[] = [];
    const set = mountSet({
      chips: [{
        value: "a",
        ripple: false,
        onChange: (...args: unknown[]) => { itemChange.push(args); },
        onSelect: (chip) => { itemSelect.push(chip); },
      }],
    });
    const chip = set.getChips()[0]!;
    chip.on("change", payload => chipChange.push(payload));
    set.on("change", event => setChange.push(event));
    chip.element.click();
    expect(chipChange).toEqual([]);
    expect(itemChange).toEqual([[true, chip]]);
    expect(itemSelect).toEqual([chip]);
    expect(setChange.map(event => event.changed)).toEqual(["a"]);
  });
});
