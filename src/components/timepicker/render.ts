// src/components/timepicker/render.ts

import {
  ResolvedTimePickerConfig,
  TimeValue,
  TIME_PICKER_TYPE,
  TIME_FORMAT,
  TIME_PERIOD,
} from "./types";
import { TIMEPICKER_ICONS } from "./constants";
import { padZero, convertTo12Hour } from "./utils";
import { createDial, nameFor, type DialSelector } from "./dial";

/** An hour, minute or second box: a radio in dial mode, a number input in input mode. */
type TimeField = HTMLInputElement | HTMLButtonElement;

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
  // a time is the input mode's. They were number fields in both modes. FLO-283.
  const dialMode = config.type === TIME_PICKER_TYPE.DIAL;
  const selectors = dialMode ? document.createElement("div") : inputContainer;
  if (dialMode) {
    selectors.className = `${config.prefix}-time-picker__selectors`;
    selectors.setAttribute("role", "radiogroup");
    selectors.setAttribute("aria-label", "Time");
    inputContainer.appendChild(selectors);
  }

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
    if (unit === "second") {
      const label = document.createElement("label");
      label.className = `${config.prefix}-time-picker__input-label`;
      label.textContent = "Second";
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
  // from assistive tech. FLO-279.
  const dial = createDial({
    prefix: config.prefix,
    format: config.format,
    onSelect: (value, final, pointer) => selectFromDial(value, final, pointer),
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

  // The dial shows the time at once; it no longer waits for a canvas to size.
  dial.update(timeValue, activeSelector);

  // The mode toggle is handled once, by the API, which re-renders the picker and
  // keeps focus on the toggle. This listener switched the view in place as well,
  // and its delayed focus landed on nodes the re-render had replaced. FLO-278.

  // Handle input time changes
  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const type = target.getAttribute("data-type");
    const value = target.value;

    // Skip processing if the field is empty (user might be in the middle of typing)
    if (value === "") return;

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

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

      if (timeValue.hours !== previousValue.hours && onTimeChange) {
        onTimeChange("hours", newHours);
      }
    } else if (type === "minute") {
      let newMinutes = numValue;

      // Handle minute constraints
      if (numValue < 0) newMinutes = 0;
      if (numValue > 59) newMinutes = 59;

      timeValue.minutes = newMinutes;

      // Set this field as active for the dial
      setActive("minute");

      if (timeValue.minutes !== previousValue.minutes && onTimeChange) {
        onTimeChange("minutes", newMinutes);
      }
    } else if (type === "second") {
      let newSeconds = numValue;

      // Handle second constraints
      if (numValue < 0) newSeconds = 0;
      if (numValue > 59) newSeconds = 59;

      timeValue.seconds = newSeconds;

      // Set this field as active for the dial
      setActive("second");

      if (timeValue.seconds !== previousValue.seconds && onTimeChange) {
        onTimeChange("seconds", newSeconds);
      }
    }
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
    input.addEventListener("change", () => {
      const value = input === hoursInput
        ? (config.format === TIME_FORMAT.MILITARY ? timeValue.hours : timeValue.hours % 12 || 12)
        : input === minutesInput ? timeValue.minutes : timeValue.seconds || 0;
      show(input, value);
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
    if (timeValue.period !== period) {
      const oldPeriod = timeValue.period;
      timeValue.period = period;

      // Adjust hours when switching between AM/PM
      if (oldPeriod === TIME_PERIOD.AM && period === TIME_PERIOD.PM) {
        if (timeValue.hours < 12) {
          timeValue.hours += 12;
        }
      } else if (oldPeriod === TIME_PERIOD.PM && period === TIME_PERIOD.AM) {
        if (timeValue.hours >= 12) {
          timeValue.hours -= 12;
        }
      }

      // Update display for 12-hour format
      if (config.format === TIME_FORMAT.AMPM) {
        const displayHours =
          timeValue.hours === 0
            ? 12
            : timeValue.hours > 12
            ? timeValue.hours - 12
            : timeValue.hours;
        show(hoursInput, displayHours);
      }

      // Update period selectors
      container
        .querySelectorAll(
          `.${config.prefix}-time-picker__period-am, .${config.prefix}-time-picker__period-pm`
        )
        .forEach((el) => {
          el.classList.remove(`${config.prefix}-time-picker__period--selected`);
          el.setAttribute("aria-checked", "false");
          // Out of the tab order: a radiogroup is one stop, and the selected
          // option is the one Tab reaches.
          el.setAttribute("tabindex", "-1");
        });

      const selectedPeriod = container.querySelector(
        `.${config.prefix}-time-picker__period-${period.toLowerCase()}`
      );
      if (selectedPeriod) {
        selectedPeriod.classList.add(
          `${config.prefix}-time-picker__period--selected`
        );
        selectedPeriod.setAttribute("aria-checked", "true");
        selectedPeriod.setAttribute("tabindex", "0");
      }

      // Update dial if visible
      if (dialContainer.style.display === "block") {
        dial.update(timeValue, activeSelector);
      }

      if (onTimeChange) {
        onTimeChange("hours", timeValue.hours);
      }
    }
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
  // Compose; not from the keyboard. FLO-279.
  // The value before a drag began: what a release compares against to notify.
  let started: TimeValue | null = null;
  function selectFromDial(value: number, final: boolean, pointer: boolean): void {
    if (!final && !started) started = { ...timeValue };
    const previousValue = started ?? { ...timeValue };
    if (activeSelector === "hour") {
      let newHours = value;

      // Adjust for 12-hour format
      if (config.format === TIME_FORMAT.AMPM) {
        if (timeValue.period === TIME_PERIOD.PM && value !== 12) {
          newHours += 12;
        } else if (
          timeValue.period === TIME_PERIOD.AM &&
          value === 12
        ) {
          newHours = 0;
        }
      }

      timeValue.hours = newHours;
      timeValue.period = newHours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;

      // Update input display
      if (config.format === TIME_FORMAT.AMPM) {
        const displayHours =
          newHours === 0 ? 12 : newHours > 12 ? newHours - 12 : newHours;
        show(hoursInput, displayHours);
      } else {
        show(hoursInput, newHours);
      }

      if (timeValue.hours !== previousValue.hours && final && onTimeChange) {
        onTimeChange("hours", newHours);
      }
    } else if (activeSelector === "minute") {
      timeValue.minutes = value;
      show(minutesInput, value);

      if (timeValue.minutes !== previousValue.minutes && final && onTimeChange) {
        onTimeChange("minutes", value);
      }
    } else if (activeSelector === "second" && secondsInput) {
      timeValue.seconds = value;
      show(secondsInput, value);

      if (timeValue.seconds !== previousValue.seconds && final && onTimeChange) {
        onTimeChange("seconds", value);
      }
    }

    dial.update(timeValue, activeSelector);
    if (!final) return;
    started = null;
    if (pointer && activeSelector === "hour") {
      setTimeout(() => { if (dial.element.isConnected && activeSelector === "hour") minutesInput.click(); }, 200);
    }
  }

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
