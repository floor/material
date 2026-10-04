// src/components/timepicker/render.ts

import {
  ResolvedTimePickerConfig,
  TimeValue,
  TIME_PICKER_TYPE,
  TIME_FORMAT,
  TIME_PERIOD,
} from "./types";
import { TIMEPICKER_ICONS } from "./constants";
import { padZero, convertTo12Hour, limitsOf, reachable, constrainTime, secondsOfTime } from "./utils";
import { createDial, nameFor, type DialSelector } from "./dial";

/** An hour, minute or second box: a radio in dial mode, a number input in input mode. */
type TimeField = HTMLInputElement | HTMLButtonElement;

let fieldIds = 0;

import { setHTML } from "../../core/dom/html";
/**
 * Renders the time picker dialog
 * @param {HTMLElement} container - Dialog container element
 * @param {TimeValue} timeValue - Current time value
 * @param {TimePickerConfig} config - Time picker configuration
 * @param {Function} onTimeChange - Optional callback when time changes
 */
export const renderTimePicker = (
  container: HTMLElement,
  timeValue: TimeValue,
  config: ResolvedTimePickerConfig,
  onTimeChange?: (key: "hours" | "minutes" | "seconds", value: number) => void
): void => {
  // Clear container content
  container.replaceChildren();

  // Create title if provided
  if (config.title) {
    const title = document.createElement("div");
    title.className = `${config.prefix}-time-picker__title`;
    title.textContent = config.title;
    title.id = config.titleId ?? `${config.prefix}-time-picker__title`;
    container.appendChild(title);
  }

  // Create content container
  const content = document.createElement("div");
  content.className = `${config.prefix}-time-picker__content`;
  container.appendChild(content);

  // Create time input container (same for both modes)
  const inputContainer = document.createElement("div");
  inputContainer.className = `${config.prefix}-time-picker__input-container`;
  content.appendChild(inputContainer);

  // Determine display hours based on format
  const { hours: displayHours } =
    config.format === TIME_FORMAT.MILITARY
      ? { hours: timeValue.hours }
      : convertTo12Hour(timeValue.hours);

  // In dial mode the hour and minute boxes choose which part the dial sets, so
  // they are radios, "Select hour" and "Select minutes", as in Compose; typing
  // a time is the input mode's. They were number fields in both modes.
  const dialMode = config.type === TIME_PICKER_TYPE.DIAL;
  // The fields and their separators: a box of their own, kept left to right in
  // any direction, as a time is written (Compose); the AM/PM selector follows the
  // page's direction beside it.
  const selectors = document.createElement("div");
  selectors.className = `${config.prefix}-time-picker__selectors`;
  if (dialMode) {
    selectors.setAttribute("role", "radiogroup");
    selectors.setAttribute("aria-label", "Time");
  }
  inputContainer.appendChild(selectors);

  const SELECT: Record<DialSelector, string> = { hour: "Select hour", minute: "Select minutes", second: "Select seconds" };
  const NAME: Record<DialSelector, string> = { hour: "Hour", minute: "Minute", second: "Second" };
  const CLASS: Record<DialSelector, string> = { hour: "hours", minute: "minutes", second: "seconds" };

  /** Shows a value in a field: the text of a radio, with its name, or an input's value. */
  const show = (field: TimeField | undefined, value: number): void => {
    if (!field) return;
    const unit = field.getAttribute("data-type") as DialSelector;
    if (dialMode) {
      field.textContent = padZero(value);
      field.setAttribute("aria-label", `${SELECT[unit]}: ${nameFor(unit, config.format, value)}`);
    } else {
      field.value = padZero(value);
    }
  };

  /** One field: a radio in dial mode, a number input in input mode. */
  const createField = (unit: DialSelector, min: number, max: number, value: number): TimeField => {
    const wrapper = document.createElement("div");
    wrapper.className = `${config.prefix}-time-picker__time-input-field`;
    let field: TimeField;
    if (dialMode) {
      field = document.createElement("button");
      field.type = "button";
      field.setAttribute("role", "radio");
      const active = unit === "hour";
      field.setAttribute("aria-checked", String(active));
      field.setAttribute("data-active", String(active));
      field.tabIndex = active ? 0 : -1;
    } else {
      const input = document.createElement("input");
      input.type = "number";
      input.min = String(min);
      input.max = String(max);
      // M3 names these fields "Hour" and "Minute" for assistive technology.
      input.setAttribute("aria-label", NAME[unit]);
      input.setAttribute("inputmode", "numeric");
      input.setAttribute("pattern", "[0-9]*");
      field = input;
    }
    field.className = `${config.prefix}-time-picker__${CLASS[unit]}`;
    field.setAttribute("data-type", unit);
    show(field, value);
    wrapper.appendChild(field);
    // Input mode labels its fields below them: Hour, Minute (M3's supporting
    // text). Only a seconds field had one, in both modes.
    if (!dialMode) {
      field.id = `${config.prefix}-time-picker-${unit}-${++fieldIds}`;
      const label = document.createElement("label");
      label.className = `${config.prefix}-time-picker__input-label`;
      label.htmlFor = field.id;
      label.textContent = NAME[unit];
      wrapper.appendChild(label);
    }
    selectors.appendChild(wrapper);
    return field;
  };

  const createSeparator = (): void => {
    const separator = document.createElement("div");
    separator.className = `${config.prefix}-time-picker__separator`;
    separator.textContent = ":";
    selectors.appendChild(separator);
  };

  const military = config.format === TIME_FORMAT.MILITARY;
  const hoursInput = createField("hour", military ? 0 : 1, military ? 23 : 12, displayHours);
  createSeparator();
  const minutesInput = createField("minute", 0, 59, timeValue.minutes);

  // Seconds if enabled. Undefined when they are off, which every reader below
  // checks for.
  let secondsInput: TimeField | undefined;
  if (config.showSeconds) {
    createSeparator();
    secondsInput = createField("second", 0, 59, timeValue.seconds || 0);
  }

  // Add period selector for 12-hour format
  if (config.format === TIME_FORMAT.AMPM) {
    // AM and PM are one choice with two options, so M3 gives them the radio
    // role in a list rather than two independent toggle buttons. The practical
    // difference is what a person is told: "AM, radio button, 1 of 2,
    // selected" rather than "AM, button, pressed", and one tab stop with
    // arrows rather than two tab stops.
    const periodContainer = document.createElement("div");
    periodContainer.className = `${config.prefix}-time-picker__period`;
    periodContainer.setAttribute("role", "radiogroup");
    periodContainer.setAttribute("aria-label", "AM or PM");

    /** One option. Only the selected one is in the tab order. */
    const createPeriodOption = (period: TIME_PERIOD): HTMLElement => {
      const selected = timeValue.period === period;
      const option = document.createElement("div");
      option.className = `${config.prefix}-time-picker__period-${period.toLowerCase()} ${
        selected ? `${config.prefix}-time-picker__period--selected` : ""
      }`;
      option.textContent = period;
      option.setAttribute("role", "radio");
      option.setAttribute("aria-checked", selected ? "true" : "false");
      option.setAttribute("tabindex", selected ? "0" : "-1");
      return option;
    };

    const amPeriod = createPeriodOption(TIME_PERIOD.AM);
    const pmPeriod = createPeriodOption(TIME_PERIOD.PM);

    periodContainer.appendChild(amPeriod);
    periodContainer.appendChild(pmPeriod);
    inputContainer.appendChild(periodContainer);
  }

  // Create canvas-based dial container (shown/hidden based on mode)
  const dialContainer = document.createElement("div");
  dialContainer.className = `${config.prefix}-time-picker__dial`;
  dialContainer.style.display =
    config.type === TIME_PICKER_TYPE.DIAL ? "block" : "none";
  content.appendChild(dialContainer);

  // The dial, in the DOM: a listbox of its numbers, operable by pointer and by
  // keyboard, with a hand that springs between values. It was a canvas hidden
  // from assistive tech.
  const dial = createDial({
    prefix: config.prefix,
    format: config.format,
    onSelect: (value, final, pointer) => selectFromDial(value, final, pointer),
    allowed: (unit, value) => allowed(unit, value),
  });
  dialContainer.appendChild(dial.element);

  // Create actions container
  const actions = document.createElement("div");
  actions.className = `${config.prefix}-time-picker__actions`;
  container.appendChild(actions);

  // Create type toggle button
  const toggleTypeButton = document.createElement("button");
  toggleTypeButton.className = `${config.prefix}-time-picker__toggle-type`;
  // Without this a button defaults to type="submit", and this one sits inside
  // whatever form the picker was placed in. Cancel and confirm already set it.
  toggleTypeButton.setAttribute("type", "button");
  toggleTypeButton.setAttribute(
    "aria-label",
    config.type === TIME_PICKER_TYPE.DIAL
      ? "Toggle input picker"
      : "Toggle dial picker"
  );
  setHTML(toggleTypeButton,
    config.type === TIME_PICKER_TYPE.DIAL
      ? config.keyboardIcon || TIMEPICKER_ICONS.KEYBOARD
      : config.clockIcon || TIMEPICKER_ICONS.CLOCK);
  actions.appendChild(toggleTypeButton);

  // Create action buttons container
  const actionButtons = document.createElement("div");
  actionButtons.className = `${config.prefix}-time-picker__action-buttons`;
  actions.appendChild(actionButtons);

  // Create cancel button
  const cancelButton = document.createElement("button");
  cancelButton.className = `${config.prefix}-time-picker__cancel`;
  cancelButton.textContent = config.cancelText || "Cancel";
  cancelButton.setAttribute("type", "button");
  actionButtons.appendChild(cancelButton);

  // Create confirm button
  const confirmButton = document.createElement("button");
  confirmButton.className = `${config.prefix}-time-picker__confirm`;
  confirmButton.textContent = config.confirmText || "OK";
  confirmButton.setAttribute("type", "button");
  actionButtons.appendChild(confirmButton);

  // Track active selector for clock dial
  let activeSelector: DialSelector = "hour";

  const fields = (): Array<[DialSelector, TimeField]> =>
    ([["hour", hoursInput], ["minute", minutesInput], ["second", secondsInput]] as Array<[DialSelector, TimeField | undefined]>)
      .filter((entry): entry is [DialSelector, TimeField] => entry[1] !== undefined);

  /** Makes one part the active one: the filled box, the checked radio, the dial's face. */
  const setActive = (unit: DialSelector): void => {
    activeSelector = unit;
    for (const [type, field] of fields()) {
      field.setAttribute("data-active", String(type === unit));
      if (dialMode) {
        field.setAttribute("aria-checked", String(type === unit));
        field.tabIndex = type === unit ? 0 : -1;
      }
    }
    dial.update(timeValue, activeSelector);
  };

  // minTime, maxTime, minuteStep and secondStep, which were accepted and never
  // applied. A dial number or AM/PM that cannot be reached is disabled,
  // a pick lands on the step, and a time outside the limits moves to the nearest
  // one inside.
  const limits = limitsOf(config.minTime, config.maxTime);
  const minuteStep = Math.max(1, Math.floor(config.minuteStep) || 1);
  const secondStep = Math.max(1, Math.floor(config.secondStep) || 1);
  const HALF_DAY = 12 * 3600;
  const roundToStep = (value: number, step: number): number => Math.min(Math.round(value / step) * step, 59 - (59 % step));
  const to24 = (hour: number): number =>
    config.format === TIME_FORMAT.MILITARY ? hour : (hour % 12) + (timeValue.period === TIME_PERIOD.PM ? 12 : 0);
  const periodAllowed = (period: TIME_PERIOD): boolean =>
    period === TIME_PERIOD.AM ? reachable(limits, 0, HALF_DAY - 1) : reachable(limits, HALF_DAY, 2 * HALF_DAY - 1);
  /** Whether a dial value can be picked, given the rest of the time. */
  function allowed(unit: DialSelector, value: number): boolean {
    if (unit === "hour") {
      const start = to24(value) * 3600;
      return reachable(limits, start, start + 3599);
    }
    const hour = timeValue.hours * 3600;
    if (unit === "minute") return value % minuteStep === 0 && reachable(limits, hour + value * 60, hour + value * 60 + 59);
    return value % secondStep === 0 && reachable(limits, hour + timeValue.minutes * 60 + value);
  }

  /** Shows the time everywhere: the fields, AM/PM and the dial. */
  const refresh = (): void => {
    show(hoursInput, config.format === TIME_FORMAT.MILITARY ? timeValue.hours : timeValue.hours % 12 || 12);
    show(minutesInput, timeValue.minutes);
    show(secondsInput, timeValue.seconds ?? 0);
    markPeriod();
    dial.update(timeValue, activeSelector);
  };

  /** Moves the time inside the limits, then shows it. */
  const settle = (): void => {
    Object.assign(timeValue, constrainTime(timeValue, limits, minuteStep, secondStep));
    refresh();
  };

  /** Notifies once, and only when the time differs from `before`. */
  const notify = (before: TimeValue): void => {
    if (secondsOfTime(before) !== secondsOfTime(timeValue)) onTimeChange?.("hours", timeValue.hours);
  };

  /** AM and PM: which is selected, and which cannot be reached. */
  function markPeriod(): void {
    for (const period of [TIME_PERIOD.AM, TIME_PERIOD.PM]) {
      const element = container.querySelector<HTMLElement>(`.${config.prefix}-time-picker__period-${period.toLowerCase()}`);
      if (!element) continue;
      const selected = timeValue.period === period;
      element.classList.toggle(`${config.prefix}-time-picker__period--selected`, selected);
      element.setAttribute("aria-checked", String(selected));
      // Out of the tab order: a radiogroup is one stop, and the selected
      // option is the one Tab reaches.
      element.setAttribute("tabindex", selected ? "0" : "-1");
      if (periodAllowed(period)) element.removeAttribute("aria-disabled");
      else element.setAttribute("aria-disabled", "true");
    }
  }

  // The dial shows the time at once; it no longer waits for a canvas to size.
  dial.update(timeValue, activeSelector);

  // The mode toggle is handled once, by the API, which re-renders the picker and
  // keeps focus on the toggle. This listener switched the view in place as well,
  // and its delayed focus landed on nodes the re-render had replaced.

  // Handle input time changes
  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const type = target.getAttribute("data-type");
    const value = target.value;
    // Typing is not held to the limits and steps until it is committed (change,
    // or Enter): a first digit is rarely a valid time on its own.
    const commit = e.type !== "input";
    const numValue = parseInt(value, 10);

    // An empty field may be mid-typing; committed empty, it shows the time again.
    if (isNaN(numValue)) {
      if (commit) refresh();
      return;
    }

    const previousValue = { ...timeValue };

    if (type === "hour") {
      let newHours = numValue;

      // Handle hour constraints
      if (config.format === TIME_FORMAT.AMPM) {
        // Special handling for 12-hour format
        if (numValue < 1) newHours = 12;
        if (numValue > 12) newHours = 1;

        // Convert to 24h format internally
        if (timeValue.period === TIME_PERIOD.PM && newHours !== 12) {
          newHours += 12;
        } else if (timeValue.period === TIME_PERIOD.AM && newHours === 12) {
          newHours = 0;
        }
      } else {
        // 24-hour format validation
        if (numValue < 0) newHours = 0;
        if (numValue > 23) newHours = 23;
      }

      timeValue.hours = newHours;
      timeValue.period = newHours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;

      // Set this field as active for the dial
      setActive("hour");
    } else if (type === "minute") {
      let newMinutes = numValue;

      // Handle minute constraints
      if (numValue < 0) newMinutes = 0;
      if (numValue > 59) newMinutes = 59;

      timeValue.minutes = commit ? roundToStep(newMinutes, minuteStep) : newMinutes;

      // Set this field as active for the dial
      setActive("minute");
    } else if (type === "second") {
      let newSeconds = numValue;

      // Handle second constraints
      if (numValue < 0) newSeconds = 0;
      if (numValue > 59) newSeconds = 59;

      timeValue.seconds = commit ? roundToStep(newSeconds, secondStep) : newSeconds;

      // Set this field as active for the dial
      setActive("second");
    }

    if (commit) settle();
    notify(previousValue);
  };

  // Native input keeps the form current while typing. Also accept change
  // for integrations that commit directly; unchanged values do not notify twice.
  const isInput = (field: TimeField | undefined): field is HTMLInputElement => field?.tagName === "INPUT";
  for (const input of [hoursInput, minutesInput, secondsInput]) {
    if (!isInput(input)) continue;
    input.addEventListener("input", handleInputChange);
    input.addEventListener("change", handleInputChange);
    input.addEventListener("keyup", event => {
      if (event.key === "Enter") handleInputChange(event);
    });
  }

  // Input mode: Enter moves on to the next field, then to OK.
  if (isInput(hoursInput) && isInput(minutesInput)) {
    const hours = hoursInput, minutes = minutesInput;
    hours.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        minutes.focus();
        minutes.select();
      }
    });

    minutes.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        if (config.showSeconds && isInput(secondsInput)) {
          secondsInput.focus();
          secondsInput.select();
        } else {
          confirmButton.focus();
        }
      }
    });

    if (isInput(secondsInput)) {
      secondsInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          confirmButton.focus();
        }
      });
    }
  }

  // Handle period selection (AM/PM)
  const handlePeriodChange = (period: TIME_PERIOD) => {
    if (timeValue.period === period || !periodAllowed(period)) return;
    const previousValue = { ...timeValue };
    timeValue.period = period;
    // The same hour on the other half of the day.
    timeValue.hours = (timeValue.hours % 12) + (period === TIME_PERIOD.PM ? 12 : 0);
    settle();
    notify(previousValue);
  };

  // Add event listeners for period selectors
  if (config.format === TIME_FORMAT.AMPM) {
    const amPeriodElement = container.querySelector(
      `.${config.prefix}-time-picker__period-am`
    );
    const pmPeriodElement = container.querySelector(
      `.${config.prefix}-time-picker__period-pm`
    );

    /**
     * Wires one option of the radiogroup.
     *
     * Enter and Space still select it, because they were wired in #97 and
     * people press them whatever the role says. The arrows are what the radio
     * role adds: in a group they move the selection, and the focus goes with
     * it. With two options every arrow lands on the other one.
     */
    const wirePeriod = (
      element: Element | null,
      period: (typeof TIME_PERIOD)[keyof typeof TIME_PERIOD],
      other: (typeof TIME_PERIOD)[keyof typeof TIME_PERIOD],
    ): void => {
      if (!element) return;

      element.addEventListener("click", () => handlePeriodChange(period));

      element.addEventListener("keydown", (event) => {
        const key = (event as KeyboardEvent).key;

        if (key === "Enter" || key === " " || key === "Spacebar") {
          // Space would otherwise scroll the page out from under the picker.
          event.preventDefault();
          handlePeriodChange(period);
          return;
        }

        if (
          key === "ArrowLeft" ||
          key === "ArrowRight" ||
          key === "ArrowUp" ||
          key === "ArrowDown"
        ) {
          event.preventDefault();
          // A period outside minTime and maxTime is skipped: with two, the
          // selection stays.
          if (!periodAllowed(other)) return;
          handlePeriodChange(other);
          // The selection carries focus with it, which is what makes the group
          // a single tab stop rather than a trap.
          const moved = container.querySelector(
            `.${config.prefix}-time-picker__period-${other.toLowerCase()}`,
          );
          if (moved instanceof HTMLElement) moved.focus();
        }
      });
    };

    wirePeriod(amPeriodElement, TIME_PERIOD.AM, TIME_PERIOD.PM);
    wirePeriod(pmPeriodElement, TIME_PERIOD.PM, TIME_PERIOD.AM);
  }

  // A value picked on the dial: by pointer (dragging updates the fields and the
  // dial as it goes, and notifies on release) or by keyboard. After a pointer
  // picks an hour, the dial moves on to minutes once the hand has landed, as in
  // Compose; not from the keyboard.
  // The value before a drag began: what a release compares against to notify.
  let started: TimeValue | null = null;
  function selectFromDial(value: number, final: boolean, pointer: boolean): void {
    if (!final && !started) started = { ...timeValue };
    const previousValue = started ?? { ...timeValue };
    // A pointer lands between labels; it picks the nearest step.
    if (activeSelector !== "hour") value = roundToStep(value, activeSelector === "minute" ? minuteStep : secondStep);
    const picked = allowed(activeSelector, value);
    if (picked) {
      if (activeSelector === "hour") {
        timeValue.hours = to24(value);
        timeValue.period = timeValue.hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;
      } else if (activeSelector === "minute") {
        timeValue.minutes = value;
      } else if (secondsInput) {
        timeValue.seconds = value;
      }
      settle();
    }
    if (!final) return;
    started = null;
    notify(previousValue);
    if (picked && pointer && activeSelector === "hour") {
      setTimeout(() => { if (dial.element.isConnected && activeSelector === "hour") minutesInput.click(); }, 200);
    }
  }

  markPeriod();

  // Dial mode: the boxes are a radiogroup. A click or Enter or Space checks one
  // and turns the dial to it; the arrows move the check and the focus, as in a
  // radiogroup, and Tab reaches only the checked one.
  if (dialMode) {
    for (const [unit, field] of fields()) {
      field.addEventListener("click", () => setActive(unit));
      field.addEventListener("keydown", event => {
        const key = (event as KeyboardEvent).key;
        const step = key === "ArrowRight" || key === "ArrowDown" ? 1
          : key === "ArrowLeft" || key === "ArrowUp" ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        const all = fields();
        const [next, target] = all[(all.findIndex(([type]) => type === unit) + step + all.length) % all.length];
        setActive(next);
        target.focus();
      });
    }
  }
};
