// test/components/synchronous-open.test.ts
//
// What is true on the line after open() (or expand()) returns, pinned before
// the menu a select or split button holds is loaded on demand (FLO-543,
// FLO-544). These pass on the code as it is: they are the guard, not a fix.
// "Open" here is state, ARIA and events; when the surface is painted is not
// part of the contract.
import { describe, expect, test } from "bun:test";
import createSelect from "../../src/components/select";
import createSplitButton from "../../src/components/split-button";
import createDialog from "../../src/components/dialog";
import createDatePicker from "../../src/components/datepicker";
import createTimePicker from "../../src/components/timepicker";
import { callbacksFixture, wait } from "./callbacks.fixture";

const mount = callbacksFixture();
const options = [{ id: "xs", text: "Extra small" }, { id: "s", text: "Small" }, { id: "m", text: "Medium" }];
const select = (config = {}) => mount(createSelect({ label: "Size", options, value: "s", ...config }));
const inputOf = (component: { element: HTMLElement }) => component.element.querySelector("input")!;
const optionIds = (component: { element: HTMLElement }) => {
  const list = document.getElementById(inputOf(component).getAttribute("aria-controls") ?? "");
  return [...(list?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])].map(option => option.id);
};

describe("select: open() is synchronous", () => {
  test("isOpen(), aria-expanded and the open event are there when open() returns", async () => {
    const component = select();
    await wait();
    const seen: string[] = [];
    component.on("open", () => { seen.push("open"); });
    expect(component.isOpen()).toBe(false);
    expect(component.open()).toBe(component);
    expect(component.isOpen()).toBe(true);
    expect(inputOf(component).getAttribute("aria-expanded")).toBe("true");
    expect(seen).toEqual(["open"]);
  });

  for (const key of ["ArrowDown", "ArrowUp", "Enter", " ", "m"]) {
    test(`the first ${JSON.stringify(key)} on a closed select opens it on the selected option and is not lost`, async () => {
      const component = select();
      await wait();
      const seen: string[] = [];
      component.on("open", () => { seen.push("open"); });
      const input = inputOf(component);
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      input.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(component.isOpen()).toBe(true);
      expect(input.getAttribute("aria-expanded")).toBe("true");
      expect(seen).toEqual(["open"]);
      expect(component.getValue()).toBe("s");
      expect(input.getAttribute("aria-activedescendant")).toBe(optionIds(component)[1]);
    });
  }

  test("the first Home and End on a closed select open it on the first and the last option", async () => {
    for (const [key, index] of [["Home", 0], ["End", 2]] as const) {
      const component = select();
      await wait();
      const input = inputOf(component);
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      input.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(component.isOpen()).toBe(true);
      expect(input.getAttribute("aria-activedescendant")).toBe(optionIds(component)[index]);
    }
  });

  test("setValue and setOptions on a closed select are applied and leave it closed", async () => {
    const component = select();
    await wait();
    component.setValue("m");
    expect(component.getValue()).toBe("m");
    expect(component.getText()).toBe("Medium");
    expect(inputOf(component).value).toBe("Medium");
    component.setOptions([{ id: "l", text: "Large" }]);
    expect(component.getOptions().map(option => option.id)).toEqual(["l"]);
    expect(component.getValue()).toBe(null);
    expect(component.isOpen()).toBe(false);
    component.open();
    expect(optionIds(component)).toHaveLength(1);
  });
});

describe("split button: expand() is synchronous", () => {
  const items = [{ id: "pdf", text: "PDF" }, { id: "csv", text: "CSV" }];
  const split = () => mount(createSplitButton({ text: "Export", items }));

  test("isExpanded(), aria-expanded and the events are there when expand() returns", async () => {
    const component = split();
    await wait();
    const seen: string[] = [];
    for (const name of ["expand", "collapse", "change"] as const) component.on(name, () => { seen.push(name); });
    expect(component.expand()).toBe(component);
    expect(component.isExpanded()).toBe(true);
    expect(component.trailingElement.getAttribute("aria-expanded")).toBe("true");
    expect(seen).toEqual(["expand", "change"]);
    expect(component.collapse()).toBe(component);
    expect(component.isExpanded()).toBe(false);
    expect(component.trailingElement.getAttribute("aria-expanded")).toBe("false");
    expect(seen).toEqual(["expand", "change", "collapse", "change"]);
  });
});

describe("dialog, date picker, time picker: what open() has done when it returns", () => {
  test("dialog: beforeopen has run and can cancel; open and isOpen() follow on a timer", async () => {
    const dialog = mount(createDialog({ title: "Delete?" }));
    const seen: string[] = [];
    dialog.on("beforeopen", () => { seen.push("beforeopen"); });
    dialog.on("open", () => { seen.push("open"); });
    expect(dialog.open()).toBe(dialog);
    expect(seen).toEqual(["beforeopen"]);
    expect(dialog.isOpen()).toBe(false);
    await wait();
    expect(seen).toEqual(["beforeopen", "open"]);
    expect(dialog.isOpen()).toBe(true);

    const cancelled = mount(createDialog({ title: "Delete?" }));
    const opened: string[] = [];
    cancelled.on("beforeopen", event => { event.preventDefault(); });
    cancelled.on("open", () => { opened.push("open"); });
    cancelled.open();
    await wait();
    expect(opened).toEqual([]);
    expect(cancelled.isOpen()).toBe(false);
  });

  // The top-layer dialog (layer: "top") needs showModal(), which JSDOM lacks:
  // modal-layer.test.ts stubs it and pins that open and isOpen() are there
  // when open() returns.
  test("date picker: the open event is emitted during open()", async () => {
    const picker = mount(createDatePicker({ label: "Date" }));
    await wait();
    const seen: string[] = [];
    picker.on("open", () => { seen.push("open"); });
    expect(picker.open()).toBe(picker);
    expect(seen).toEqual(["open"]);
  });

  test("time picker: isOpen and the open event are there when open() returns", async () => {
    const picker = mount(createTimePicker({ value: "09:30" }));
    await wait();
    const seen: string[] = [];
    picker.on("open", () => { seen.push("open"); });
    expect(picker.isOpen).toBe(false);
    expect(picker.open()).toBe(picker);
    expect(picker.isOpen).toBe(true);
    expect(seen).toEqual(["open"]);
  });
});
