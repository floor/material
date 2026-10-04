// Decided by Dr Jones on 2026-09-28: chip sets follow Material's selection
// defaults (MDC Chip.md: multi-select, with single-select and selection-required
// opt-in), and input chips are always removable (m3.material.io chips).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { createChips, createInputChip, type ChipsConfig, type ChipsComponent, type ChipComponent } from "../../../src/components/chips";

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
const mount = (config: ChipsConfig = {}) => {
  const chips = createChips(config);
  instances.push(chips);
  document.body.append(chips.element);
  return chips;
};
const THREE = [{ label: "Red", value: "red" }, { label: "Green", value: "green" }, { label: "Blue", value: "blue" }];
const click = (chip: ChipComponent) => chip.action.click();

describe("selection defaults", () => {
  test("a set is multi-select unless told otherwise", () => {
    const chips = mount({ chips: THREE });
    const [red, green] = chips.getChips();
    click(red!); click(green!);
    expect(chips.getSelectedValues()).toEqual(["red", "green"]);
  });

  test("the last selected chip can be deselected by default, in either mode", () => {
    for (const multiSelect of [true, false]) {
      const chips = mount({ chips: THREE, multiSelect });
      const red = chips.getChips()[0]!;
      click(red); click(red);
      expect(chips.getSelectedValues()).toEqual([]);
    }
  });

  test("selectionRequired keeps the last selected chip, in either mode", () => {
    for (const multiSelect of [true, false]) {
      const chips = mount({ chips: THREE, multiSelect, selectionRequired: true });
      const [red, green] = chips.getChips();
      click(red!);
      click(red!);
      expect(chips.getSelectedValues()).toEqual(["red"]);
      if (multiSelect) {
        click(green!); click(red!);
        expect(chips.getSelectedValues()).toEqual(["green"]);
      }
    }
  });
});

describe("input chips are always removable", () => {
  test("without onRemove an input chip has its remove button, and leaves the page when removed", () => {
    const chip = createInputChip({ label: "Ada" });
    document.body.append(chip.element);
    const removed: ChipComponent[] = [];
    chip.on("remove", instance => removed.push(instance));
    const remove = chip.element.querySelector<HTMLButtonElement>(".mtrl-chip__remove");
    expect(remove?.getAttribute("aria-label")).toBe("Remove Ada");
    remove!.click();
    expect(removed).toEqual([chip]);
    expect(chip.element.isConnected).toBe(false);
  });

  test("Backspace removes one too", () => {
    const chip = createInputChip({ label: "Ada" });
    document.body.append(chip.element);
    chip.action.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }));
    expect(chip.element.isConnected).toBe(false);
  });

  test("in a set the set removes it, emits remove, and still calls onRemove", () => {
    const calls: string[] = [];
    const chips = mount({ chips: [{ type: "input", label: "Ada", value: "ada", onRemove: chip => calls.push(chip.getLabel()) }] });
    const removed: ChipComponent[] = [];
    chips.on("remove", event => removed.push(event.chip));
    chips.getChips()[0]!.element.querySelector<HTMLButtonElement>(".mtrl-chip__remove")!.click();
    expect(calls).toEqual(["Ada"]);
    expect(removed).toHaveLength(1);
    expect(chips.getChips()).toHaveLength(0);
  });
});
