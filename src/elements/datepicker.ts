// src/elements/datepicker.ts
/**
 * `<m-datepicker>`: the date picker as a form-associated custom element.
 *
 * The factory renders its own field, a text input with a calendar button:
 * that field is the trigger. A click on the button (or on the input of a
 * modal variant), ArrowDown in the input, the `open` attribute or `show()`
 * opens the calendar. The modal variants (`modal`, `modal-input`,
 * `fullscreen`) are a native `<dialog>` in the element's shadow root shown
 * with `showModal()`: the page outside is inert and Save commits, Cancel,
 * Escape and the backdrop do not. The docked calendar opens beside the field
 * (`show()`, not modal) and commits each date chosen.
 *
 * The value is an ISO date, `YYYY-MM-DD`, as on `<input type=date>`. With
 * `selection-mode="range"` a complete range is an ISO 8601 interval,
 * `YYYY-MM-DD/YYYY-MM-DD`: one string for the form, with a separator no date
 * contains. A lone date in range mode is a one-day range, `d/d`, as the
 * factory holds it. Empty is `""`. A value that is not one of these, or
 * that `min`, `max` or the mode rule out, empties the picker (the factory
 * keeps no such date).
 *
 * The `value` attribute is the default and the `value` property the live
 * value, as on a native input: the attribute moves the value until the user
 * or script changes it, and a form reset returns to it. `change` is
 * dispatched with `{ value }` when a date is committed. `open` reflects the
 * calendar's state, as on `<dialog open>`; `open` and `close` are dispatched
 * as it opens and closes (not when the attribute is what changed).
 *
 * `initial-view` is the view the calendar first opens on: `day`, `month` or
 * `year` (the full-screen variant has the days only). `close-on-select`
 * closes the calendar on a date chosen, committing it: a modal variant then
 * needs no Save. The factory reads both once: a change recreates the picker.
 *
 * The input of a modal variant is read-only, which takes it out of constraint
 * validation: the element reports the factory's `required` check as
 * `valueMissing`. `readonly` is the factory's: the value stays and the
 * calendar closed. `supporting-text` is the factory's supporting text.
 *
 * Parts: `datepicker`, `label`, `anchor`, `input`, `trigger`, `help`, `error`, `calendar`,
 * `header`, `navigation`, `prev`, `next`, `weekday`, `day`, among others.
 *
 * @module elements
 */

import createDatePicker from "../components/datepicker";
import type { DatePickerComponent, DatePickerConfig, DatePickerValue } from "../components/datepicker/types";
import { formatDate } from "../components/datepicker/utils";
import { defineElement, type DefineOptions, type ElementHost, type ElementInstance, type ElementSpec } from "./define";

/** The date picker, with what the element adds to it. */
export interface DatepickerElementComponent extends DatePickerComponent {
  /** Opens the calendar, unless the picker is disabled or read-only. */
  show: () => void;
}

const iso = (date: Date | null | undefined): string => (date ? formatDate(date, "YYYY-MM-DD") : "");

/** The element's value: a date, a `start/end` interval, or "". */
const toValue = (value: DatePickerValue, end?: Date | null): string =>
  Array.isArray(value) ? `${iso(value[0])}/${iso(value[1])}` : value && end ? `${iso(value)}/${iso(end)}` : iso(value);

const hosts = new WeakMap<DatepickerElementComponent, ElementHost<DatepickerElementComponent>>();

let missing: string | null = null;
/** The browser's own message for a required date left empty. */
const valueMissingMessage = (): string =>
  (missing ??= Object.assign(document.createElement("input"), { type: "date", required: true }).validationMessage ||
    "Please fill out this field.");

/** Reports the factory's `required` check, which the read-only input does not. */
const validate = (c: DatepickerElementComponent): void => {
  const internals = hosts.get(c)?.internals;
  if (!internals) return;
  if (!c.checkValidity()) internals.setValidity({ valueMissing: true }, valueMissingMessage(), c.input);
  else internals.setValidity({});
};

/** Sets the value from its string form; anything the picker cannot hold empties it. */
const setValue = (c: DatepickerElementComponent, value: unknown): void => {
  const text = value === null || value === undefined ? "" : String(value);
  const [start, end] = text.split("/");
  if (start) c.setValue(end === undefined ? start : [start, end]);
  // In range mode the factory holds a lone date as a one-day range.
  const held = c.getValue();
  const expected = Array.isArray(held) && end === undefined ? `${text}/${text}` : text;
  if (held !== null && toValue(held) !== expected) c.clear();
  validate(c);
};

const create = (config: DatePickerConfig): DatepickerElementComponent => {
  const { value, ...rest } = config;
  const picker = createDatePicker(rest);
  const component: DatepickerElementComponent = Object.assign(picker, {
    show: (): void => void picker.open(),
  });
  // The value's string form, a range's included, as the property takes it.
  if (value) setValue(component, value);
  return component;
};

const isOpen = (c: DatepickerElementComponent): boolean => !!c.element.querySelector("dialog")?.open;

/** Opens or closes the calendar; `open` then says whether it did (a disabled picker stays closed). */
const setOpen = (c: DatepickerElementComponent, open: boolean, host: HTMLElement): void => {
  if (open) c.show();
  else c.close();
  host.toggleAttribute("open", isOpen(c));
};

const datepickerSpec = {
  name: "datepicker",
  create: (config) => create(config as DatePickerConfig),
  styles: ["datepicker"],
  attributes: {
    variant: { type: "string", config: "variant" },
    "selection-mode": { type: "string", config: "selectionMode" },
    // The default value; not called once the element is dirty.
    value: { type: "string", config: "value", update: (c, v) => setValue(c, v) },
    // The factory can set a limit but not remove one: a change recreates it.
    min: { type: "string", config: "minDate" },
    max: { type: "string", config: "maxDate" },
    "date-format": { type: "string", config: "dateFormat" },
    "initial-view": { type: "string", config: "initialView" },
    "close-on-select": { type: "boolean", config: "closeOnSelect" },
    label: { type: "string", config: "label" },
    "supporting-text": {
      type: "string",
      config: "supportingText",
      // Without its own text, the help line shows the format.
      update: (c, v) => void c.setSupportingText(v === null ? null : String(v)),
    },
    required: {
      type: "boolean",
      config: "required",
      update: (c, v) => {
        c.setRequired(!!v);
        validate(c);
      },
    },
    disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
    readonly: { type: "boolean", config: "readOnly", update: (c, v) => void c.setReadOnly(!!v) },
    open: { type: "boolean", update: (c, v, host) => setOpen(c, !!v, host) },
  },
  properties: {
    value: { get: (c): string => toValue(c.getValue()), set: setValue },
  },
  model: "value" as const,
  methods: ["show", "close"] as const,
  events: {
    change: {
      detail: (payload) => {
        const { value, rangeEndDate } = payload as { value: DatePickerValue; rangeEndDate?: Date | null };
        return { value: toValue(value, rangeEndDate) };
      },
    },
    open: { detail: () => null, state: true },
    close: { detail: () => null, state: true },
  },
  form: {
    value: (c) => toValue(c.getValue()),
    events: ["change"],
    activate: (c) => c.input.focus(),
    state: (c) => toValue(c.getValue()),
    restore: (c, state) => setValue(c, state),
    disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
  },
  setup: (host, c) => {
    hosts.set(c, host);
    validate(c);
    // `open` reflects the calendar's state, as on <dialog>.
    const reflect = (): void => void host.toggleAttribute("open", isOpen(c));
    const onChange = (): void => validate(c);
    c.on("open", reflect);
    c.on("close", reflect);
    c.on("change", onChange);
    if (host.hasAttribute("open")) setOpen(c, true, host);
    return () => {
      c.off("open", reflect);
      c.off("close", reflect);
      c.off("change", onChange);
    };
  },
} satisfies ElementSpec<DatepickerElementComponent>;

export const datepickerElement = defineElement<DatepickerElementComponent>(datepickerSpec);
export type DatepickerSpec = typeof datepickerSpec;
/** `<m-datepicker>` as a ref or a query returns it. */
export type DatepickerElement = ElementInstance<DatepickerSpec, DatepickerElementComponent>;

/** Registers `<m-datepicker>` (or `<prefix-datepicker>`). */
export const defineDatepicker = (options?: DefineOptions): string => datepickerElement.define(options);

declare global {
  /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
  interface HTMLElementTagNameMap {
    "m-datepicker": DatepickerElement;
  }
}
