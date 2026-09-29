// test/components/timepicker/limits.test.ts
//
// minTime, maxTime, minuteStep and secondStep (FLO-281). All four were accepted,
// documented and never applied: `isTimeWithinConstraints` had no caller. The
// dial disables what cannot be reached, a pick lands on the step, and a time
// outside the limits moves to the nearest one inside.

import { describe, expect, test } from "bun:test";
import createTimePicker from "../../../src/components/timepicker";
import { TIME_FORMAT, TIME_PERIOD, TIME_PICKER_TYPE, type TimePickerConfig } from "../../../src/components/timepicker/types";
import { constrainTime, limitsOf } from "../../../src/components/timepicker/utils";
import { callbacksFixture } from "../callbacks.fixture";

const mount = callbacksFixture();

const setup = (config: TimePickerConfig) => {
  // Edits are a draft until OK (FLO-288): what they did shows in `input`.
  const changes: string[] = [];
  const picker = mount(createTimePicker({ value: "10:15", ...config }));
  picker.on("input", value => changes.push(value));
  const draft = () => changes.at(-1) ?? picker.getValue();
  const dialog = picker.dialogElement;
  const options = () => Array.from(dialog.querySelectorAll<HTMLElement>("[role=option]"));
  const option = (value: number) => options().find(element => element.dataset.value === String(value))!;
  const disabled = () => options().filter(element => element.getAttribute("aria-disabled") === "true").map(element => Number(element.dataset.value));
  const press = (element: HTMLElement, key: string) => element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  const box = (unit: string) => dialog.querySelector<HTMLElement>(`[data-type="${unit}"]`)!;
  const period = (name: string) => dialog.querySelector<HTMLElement>(`.mtrl-time-picker__period-${name}`)!;
  return { picker, changes, draft, options, option, disabled, press, box, period };
};

describe("constrainTime", () => {
  const at = (hours: number, minutes: number, seconds = 0) => ({ hours, minutes, seconds, period: hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM });
  const limits = limitsOf("09:07", "17:52");

  test("a time inside the limits is left alone", () => {
    expect(constrainTime(at(12, 3), limits, 5)).toEqual(at(12, 3));
  });

  test("before the earliest: up to the first step at or after it", () => {
    expect(constrainTime(at(8, 0), limits, 5)).toEqual(at(9, 10));
    expect(constrainTime(at(8, 0), limits)).toEqual(at(9, 7));
  });

  test("after the latest: down to the last step at or before it", () => {
    expect(constrainTime(at(20, 0), limits, 15)).toEqual(at(17, 45, 59));
    expect(constrainTime(at(20, 0), limitsOf(undefined, "17:52:40"), 1, 15)).toEqual(at(17, 52, 30));
  });

  test("missing or invalid bounds leave that end of the day open", () => {
    expect(limitsOf(undefined, "25:00")).toEqual({ min: 0, max: 86399 });
  });
});

describe("minTime and maxTime on the dial", () => {
  test("hours outside the limits are disabled, for the period shown", () => {
    const p = setup({ minTime: "09:30", maxTime: "17:00" });
    // 10:15 AM: 9, 10 and 11 o'clock can be reached this morning.
    expect(p.disabled()).toEqual([12, 1, 2, 3, 4, 5, 6, 7, 8]);
    p.period("pm").click();
    // PM: noon to 5 o'clock.
    expect(p.disabled()).toEqual([6, 7, 8, 9, 10, 11]);
  });

  test("24-hour: the hours outside the limits, on both rings", () => {
    const p = setup({ format: TIME_FORMAT.MILITARY, minTime: "09:30", maxTime: "17:00" });
    expect(p.disabled()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 18, 19, 20, 21, 22, 23]);
  });

  test("a disabled hour cannot be picked; an allowed one moves the time inside the limits", () => {
    const p = setup({ minTime: "09:30", maxTime: "17:00" });
    p.press(p.option(8), "Enter");
    expect(p.draft()).toBe("10:15");
    expect(p.changes).toEqual([]);
    // Nine o'clock at a quarter past is before 09:30.
    p.press(p.option(9), "Enter");
    expect(p.draft()).toBe("09:30");
    expect(p.changes).toEqual(["09:30"]);
    expect(p.box("minute").textContent).toBe("30");
  });

  test("a pointer on a disabled hour picks nothing, and stays on hours", () => {
    const p = setup({ minTime: "09:30", maxTime: "17:00" });
    const face = p.picker.dialogElement.querySelector<HTMLElement>(".mtrl-time-picker__dial-face")!;
    // JSDOM lays nothing out, so the face's centre is at 0,0: this is 8 o'clock.
    const at = { clientX: Math.round(Math.sin(240 * Math.PI / 180) * 100), clientY: Math.round(-Math.cos(240 * Math.PI / 180) * 100), button: 0, bubbles: true };
    face.dispatchEvent(new MouseEvent("pointerdown", at));
    face.dispatchEvent(new MouseEvent("pointerup", at));
    expect(p.draft()).toBe("10:15");
    expect(p.changes).toEqual([]);
    expect(face.getAttribute("aria-label")).toBe("Hour");
  });

  test("minutes before the earliest are disabled in its hour", () => {
    const p = setup({ minTime: "09:30", value: "09:45" });
    p.box("minute").click();
    expect(p.disabled()).toEqual([0, 5, 10, 15, 20, 25]);
  });

  test("AM or PM with no time inside the limits is disabled, and does nothing", () => {
    const p = setup({ minTime: "13:00", value: "14:00" });
    expect(p.period("am").getAttribute("aria-disabled")).toBe("true");
    expect(p.period("pm").hasAttribute("aria-disabled")).toBe(false);
    p.period("am").click();
    p.period("pm").focus();
    p.press(p.period("pm"), "ArrowLeft");
    expect(document.activeElement === p.period("pm")).toBe(true);
    expect(p.draft()).toBe("14:00");
    expect(p.changes).toEqual([]);
  });

  test("switching AM/PM moves the time inside the limits", () => {
    const p = setup({ maxTime: "15:00", value: "04:30" });
    p.period("pm").click();
    expect(p.draft()).toBe("15:00");
  });
});

describe("minuteStep and secondStep", () => {
  test("minutes off the step are disabled", () => {
    const p = setup({ minuteStep: 15, value: "10:00" });
    p.box("minute").click();
    expect(p.disabled()).toEqual([5, 10, 20, 25, 35, 40, 50, 55]);
  });

  test("a pointer between labels picks the nearest step", () => {
    const p = setup({ minuteStep: 15, value: "10:00" });
    p.box("minute").click();
    const face = p.picker.dialogElement.querySelector<HTMLElement>(".mtrl-time-picker__dial-face")!;
    // JSDOM lays nothing out, so the face's centre is at 0,0: this is 22 minutes.
    const at = { clientX: Math.round(Math.sin(132 * Math.PI / 180) * 100), clientY: Math.round(-Math.cos(132 * Math.PI / 180) * 100), button: 0, bubbles: true };
    face.dispatchEvent(new MouseEvent("pointerdown", at));
    face.dispatchEvent(new MouseEvent("pointerup", at));
    expect(p.draft()).toBe("10:15");
    expect(p.changes).toEqual(["10:15"]);
  });

  test("seconds off the step are disabled", () => {
    const p = setup({ showSeconds: true, secondStep: 10, value: "10:00:00" });
    p.box("second").click();
    expect(p.disabled()).toEqual([5, 15, 25, 35, 45, 55]);
  });
});

describe("typed times are held to the limits and steps when committed", () => {
  const typed = (config: TimePickerConfig) => {
    const p = setup({ type: TIME_PICKER_TYPE.INPUT, ...config });
    const edit = (unit: string, value: string, commit = true) => {
      const input = p.box(unit) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      if (commit) input.dispatchEvent(new Event("change", { bubbles: true }));
      return input;
    };
    return { ...p, edit };
  };

  test("a minute rounds to the step on commit, not while typing", () => {
    const p = typed({ minuteStep: 15 });
    p.edit("minute", "2", false);
    expect(p.draft()).toBe("10:02");
    const input = p.edit("minute", "22");
    expect(p.draft()).toBe("10:15");
    expect(input.value).toBe("15");
  });

  test("a field committed empty shows the time again", () => {
    const p = typed({});
    const input = p.edit("minute", "");
    expect(input.value).toBe("15");
    expect(p.draft()).toBe("10:15");
  });

  test("an hour before the earliest moves up to it on commit", () => {
    const p = typed({ minTime: "09:30" });
    const input = p.edit("hour", "8");
    expect(p.draft()).toBe("09:30");
    expect(input.value).toBe("09");
    expect((p.box("minute") as HTMLInputElement).value).toBe("30");
    expect(p.changes.at(-1)).toBe("09:30");
  });
});
