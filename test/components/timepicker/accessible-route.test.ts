// test/components/timepicker/accessible-route.test.ts
//
// Dr Jones decided (2026-09-20) that the text-input mode is the time picker's
// accessible route. The dial is accessible as well, and
// its hour and minute boxes are radios, as in Compose. M3 says the same thing — manual entry through text input rather
// than exclusively the dial, with the input selector reachable from the dial
// through the keyboard icon.
//
// That decision only holds if three things are true, and none of them were:
// the fields have to be named, the dial must not present itself to assistive
// technology as something it is not, and the route between the two must be a
// safe control. These tests pin all three.
//
// Labels here are M3's own, from its accessibility table: "Hour", "Minute",
// "Toggle input picker" and "Toggle dial picker".

import { describe, test, expect, beforeEach } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const g = globalThis as any;
for (const key of [
  "window", "document", "navigator", "HTMLElement", "HTMLInputElement",
  "HTMLCanvasElement", "Element", "Node", "Event", "MouseEvent",
  "KeyboardEvent", "CustomEvent",
]) {
  g[key] = (dom.window as any)[key];
}
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = () => {};
g.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
(dom.window as any).HTMLCanvasElement.prototype.getContext = () => null;

import { renderTimePicker } from "../../../src/components/timepicker/render";
import {
  TIME_FORMAT,
  TIME_PERIOD,
  TIME_PICKER_TYPE,
} from "../../../src/components/timepicker/types";

const PREFIX = "mtrl";

/** A picker rendered into its own container, as a page would have it. */
function picker(overrides: Record<string, unknown> = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  renderTimePicker(
    container,
    { hours: 10, minutes: 30, seconds: 0, period: TIME_PERIOD.AM } as never,
    {
      prefix: PREFIX,
      format: TIME_FORMAT.AMPM,
      type: TIME_PICKER_TYPE.DIAL,
      showSeconds: false,
      ...overrides,
    } as never,
    () => {},
  );
  return container;
}

const q = (c: HTMLElement, sel: string) => c.querySelector(sel) as HTMLElement;

beforeEach(() => { document.body.innerHTML = ""; });

describe("in input mode the time fields are named inputs", () => {
  const input = { type: TIME_PICKER_TYPE.INPUT };

  test("the hour field is labelled Hour", () => {
    const c = picker(input);
    expect(q(c, `.${PREFIX}-time-picker__hours`).getAttribute("aria-label")).toBe("Hour");
  });

  test("the minute field is labelled Minute", () => {
    const c = picker(input);
    expect(q(c, `.${PREFIX}-time-picker__minutes`).getAttribute("aria-label")).toBe("Minute");
  });

  test("the second field is labelled Second when it is shown", () => {
    const c = picker({ ...input, showSeconds: true });
    expect(q(c, `.${PREFIX}-time-picker__seconds`).getAttribute("aria-label")).toBe("Second");
  });

  test("they are real text inputs, which is the role M3 asks for", () => {
    const c = picker(input);
    for (const cls of ["hours", "minutes"]) {
      const field = q(c, `.${PREFIX}-time-picker__${cls}`) as HTMLInputElement;
      expect(field.tagName).toBe("INPUT");
      expect(field.disabled).toBe(false);
    }
    expect(c.querySelector("[role=radio][data-type]")).toBeNull();
  });

  // M3 labels the input mode's fields below them.
  test("each field has a visible label below it, tied to it", () => {
    const c = picker({ ...input, showSeconds: true });
    const labels = Array.from(c.querySelectorAll<HTMLLabelElement>(`.${PREFIX}-time-picker__input-label`));
    expect(labels.map(label => label.textContent)).toEqual(["Hour", "Minute", "Second"]);
    for (const label of labels) {
      const field = label.parentElement!.querySelector("input")!;
      expect(label.htmlFor).toBe(field.id);
      expect(label.previousElementSibling === field).toBe(true);
    }
  });

  test("dial mode's boxes have no field labels", () => {
    const c = picker({ showSeconds: true });
    expect(c.querySelectorAll(`.${PREFIX}-time-picker__input-label`)).toHaveLength(0);
  });
});

// In dial mode the boxes only choose what the dial sets, so they are
// radios named as Compose names them, with the value they show.
describe("in dial mode the hour and minute boxes are radios", () => {
  const boxes = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLButtonElement>("[data-type]"));

  test("buttons with the radio role in a radiogroup, named Select hour and Select minutes", () => {
    const c = picker();
    const [hour, minute] = boxes(c);
    expect(c.querySelector("input")).toBeNull();
    expect(hour.closest("[role=radiogroup]")).not.toBeNull();
    expect([hour.tagName, hour.getAttribute("type"), hour.getAttribute("role")]).toEqual(["BUTTON", "button", "radio"]);
    expect(hour.getAttribute("aria-label")).toBe("Select hour: 10 o'clock");
    expect(minute.getAttribute("aria-label")).toBe("Select minutes: 30 minutes");
    expect(hour.textContent).toBe("10");
    expect(minute.textContent).toBe("30");
  });

  test("the hour is checked first and is the one tab stop", () => {
    const c = picker({ showSeconds: true });
    expect(boxes(c).map(box => [box.getAttribute("aria-checked"), box.tabIndex])).toEqual([["true", 0], ["false", -1], ["false", -1]]);
  });

  test("a click checks a box and turns the dial to it", () => {
    const c = picker();
    const [hour, minute] = boxes(c);
    minute.click();
    expect([hour.getAttribute("aria-checked"), minute.getAttribute("aria-checked")]).toEqual(["false", "true"]);
    expect(q(c, `.${PREFIX}-time-picker__dial-face`).getAttribute("aria-label")).toBe("Minute");
  });

  test("the arrows move the check and the focus, and wrap", () => {
    const c = picker({ showSeconds: true });
    const [hour, minute, second] = boxes(c);
    hour.focus();
    hour.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(document.activeElement === second).toBe(true);
    expect(second.getAttribute("aria-checked")).toBe("true");
    expect(q(c, `.${PREFIX}-time-picker__dial-face`).getAttribute("aria-label")).toBe("Second");
    second.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    hour.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement === minute).toBe(true);
    expect(minute.tabIndex).toBe(0);
  });

  test("a value picked on the dial renames the box", () => {
    const c = picker({ format: TIME_FORMAT.MILITARY });
    const [hour] = boxes(c);
    const twenty = Array.from(c.querySelectorAll<HTMLElement>("[role=option]")).find(option => option.dataset.value === "20")!;
    twenty.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(hour.textContent).toBe("20");
    expect(hour.getAttribute("aria-label")).toBe("Select hour: 20 hours");
  });
});

// The dial is a listbox of its numbers, reachable and operable by keyboard;
// it was a canvas hidden from assistive technology.
describe("the dial is an accessible control", () => {
  test("a listbox named Hour, its numbers options named as times, one tab stop", () => {
    const c = picker();
    const face = q(c, `.${PREFIX}-time-picker__dial-face`);
    expect(face.getAttribute("role")).toBe("listbox");
    expect(face.getAttribute("aria-label")).toBe("Hour");
    const options = Array.from(face.querySelectorAll("[role=option]"));
    expect(options).toHaveLength(12);
    expect(options[3].getAttribute("aria-label")).toBe("3 o'clock");
    expect(face.querySelectorAll('[role=option][tabindex="0"]')).toHaveLength(1);
    expect(face.querySelectorAll('[aria-selected="true"]')).toHaveLength(1);
  });

  test("the arrows move between numbers and wrap; Enter selects", () => {
    const c = picker();
    const face = q(c, `.${PREFIX}-time-picker__dial-face`);
    const stop = face.querySelector<HTMLElement>('[role=option][tabindex="0"]')!;
    stop.focus();
    stop.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    const moved = document.activeElement as HTMLElement;
    expect(moved.getAttribute("role")).toBe("option");
    expect(moved).not.toBe(stop);
    moved.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(moved.getAttribute("aria-selected")).toBe("true");
  });
});

describe("the route to the input mode is a safe, labelled button", () => {
  const toggle = (c: HTMLElement) =>
    q(c, `.${PREFIX}-time-picker__toggle-type`) as HTMLButtonElement;

  // The defect: every other button in the dialog sets type="button", this one
  // did not. A button with no type is a submit button, and the picker can sit
  // inside a form.
  test("it does not submit the form it sits in", () => {
    const c = picker();
    expect(toggle(c).getAttribute("type")).toBe("button");
  });

  test("it carries M3's label for the direction it goes in", () => {
    const c = picker({ type: TIME_PICKER_TYPE.DIAL });
    expect(toggle(c).getAttribute("aria-label")).toBe("Toggle input picker");
  });

  test("and the other label when it starts in input mode", () => {
    const c = picker({ type: TIME_PICKER_TYPE.INPUT });
    expect(toggle(c).getAttribute("aria-label")).toBe("Toggle dial picker");
  });

  test("it is a real button, so Enter and Space work without wiring", () => {
    const c = picker();
    expect(toggle(c).tagName).toBe("BUTTON");
  });

  test("cancel and confirm are safe buttons too", () => {
    const c = picker();
    expect(q(c, `.${PREFIX}-time-picker__cancel`).getAttribute("type")).toBe("button");
    expect(q(c, `.${PREFIX}-time-picker__confirm`).getAttribute("type")).toBe("button");
  });
});
