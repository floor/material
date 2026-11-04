// test/components/datepicker/deferred.test.ts
//
// The deferred entry's contract: everything that must be true when open()
// returns is true before the calendar exists; everything that needs the
// calendar happens when the chunk lands, and exactly once.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import createDeferredDatePicker from "../../../src/components/datepicker/deferred";
import type { DatePickerComponent } from "../../../src/components/datepicker";

let dom: JSDOM;
let instances: DatePickerComponent[];
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
  for (const picker of instances) picker.destroy();
  dom.window.close();
});
const mount = (config = {}) => {
  const picker = createDeferredDatePicker(config);
  instances.push(picker);
  document.body.append(picker.element);
  return picker;
};
const dialogOf = (picker: DatePickerComponent) => picker.element.querySelector("dialog")!;
const triggerOf = (picker: DatePickerComponent) => picker.element.querySelector<HTMLElement>('[data-action="open"]')!;
/** Waits for the surface chunk to land, without assuming how many tasks that takes. */
const landed = async (picker: DatePickerComponent): Promise<void> => {
  for (let i = 0; i < 200; i += 1) {
    if (dialogOf(picker).querySelector("[data-date]")) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error("the surface chunk never landed");
};

describe("deferred datepicker contract", () => {
  test("isOpen and open are synchronous; the surface is not", async () => {
    const picker = mount({ variant: "modal" });
    const events: string[] = [];
    picker.on("open", () => events.push("open")).on("close", () => events.push("close"));
    picker.open();
    // The call has already decided; nothing is painted yet.
    expect(picker.isOpen()).toBe(true);
    expect(events).toEqual(["open"]);
    expect(dialogOf(picker).hasAttribute("open")).toBe(false);
    expect(dialogOf(picker).querySelector("[data-date]")).toBeNull();
    expect(triggerOf(picker).getAttribute("aria-expanded")).toBe("false");
    // The aria name falls back to the label until the title is rendered.
    expect(dialogOf(picker).getAttribute("aria-label")).toBe("Select date");
    await landed(picker);
    expect(dialogOf(picker).hasAttribute("open")).toBe(true);
    expect(triggerOf(picker).getAttribute("aria-expanded")).toBe("true");
    expect(dialogOf(picker).querySelector(`#${dialogOf(picker).id.replace(/-dialog$/, "")}-title`)).not.toBeNull();
    // Focus landed in the calendar, once.
    expect(document.activeElement instanceof dom.window.HTMLElement).toBe(true);
    expect(dialogOf(picker).contains(document.activeElement)).toBe(true);
    expect(events).toEqual(["open"]);
  });

  test("close while the surface is in flight: synchronous, and nothing is shown", async () => {
    const picker = mount({ variant: "modal" });
    const events: string[] = [];
    picker.on("open", () => events.push("open")).on("close", () => events.push("close"));
    picker.open();
    picker.close();
    expect(picker.isOpen()).toBe(false);
    expect(events).toEqual(["open", "close"]);
    await landed(picker);
    // The chunk arrived, the calendar is mounted, and the closed picker stays closed.
    expect(dialogOf(picker).hasAttribute("open")).toBe(false);
    expect(triggerOf(picker).getAttribute("aria-expanded")).toBe("false");
    expect(events).toEqual(["open", "close"]);
  });

  test("open, close, open during the flight ends open, with one surface and one calendar", async () => {
    const picker = mount({ variant: "modal" });
    let opens = 0;
    picker.on("open", () => opens += 1);
    picker.open();
    picker.close();
    picker.open();
    expect(picker.isOpen()).toBe(true);
    expect(opens).toBe(2);
    await landed(picker);
    expect(dialogOf(picker).hasAttribute("open")).toBe(true);
    expect(picker.element.querySelectorAll("dialog").length).toBe(1);
    expect(picker.element.querySelectorAll("[data-date]").length).toBeGreaterThan(0);
    expect(opens).toBe(2);
  });

  test("the trigger's intent preloads the surface without opening", async () => {
    const picker = mount();
    triggerOf(picker).dispatchEvent(new dom.window.Event("pointerenter"));
    expect(picker.isOpen()).toBe(false);
    await landed(picker);
    expect(picker.isOpen()).toBe(false);
    expect(dialogOf(picker).hasAttribute("open")).toBe(false);
    expect(triggerOf(picker).getAttribute("aria-expanded")).toBe("false");
    // The preloaded surface paints on the first open, with no second mount.
    picker.open();
    expect(dialogOf(picker).hasAttribute("open")).toBe(true);
    expect(picker.element.querySelectorAll("dialog").length).toBe(1);
  });
});
