// src/elements/timepicker.ts
/**
 * `<m-timepicker>`: the time picker as a form-associated custom element.
 *
 * The factory renders no field of its own, only its modal dialog, so the
 * element shows nothing until it opens: an app opens it from its own control
 * with `show()` or the `open` attribute (a `<label for>` pointing at it opens
 * it too), and shows the value where it likes. The dialog is a native
 * `<dialog>` in the element's shadow root shown with `showModal()`: the page
 * outside is inert, and focus goes back to whatever opened it.
 *
 * The value is a 24-hour time, `HH:MM`, or `HH:MM:SS` when `step` is under a
 * minute, as on `<input type=time>`; empty is `""`. The dial starts on the
 * value, or on the current time when there is none.
 *
 * The factory's time changes as the dial moves and stays when it is
 * cancelled. The element keeps the committed value apart: OK commits the
 * time and dispatches `change` with `{ value }` when it differs; Cancel,
 * Escape, the backdrop and `close()` put the dial back. `open` reflects the
 * dialog's state, as on `<dialog open>`; `open` and `close` are dispatched as
 * it opens and closes (not when the attribute is what changed).
 *
 * `step` is in seconds, as on `<input type=time>`: under a minute it shows
 * seconds and is their step (`secondStep`); from a minute up it is the
 * minute step (`minuteStep`), rounded to whole minutes, which is the finest
 * the dial has. `min` and `max` are the factory's `minTime` and `maxTime`.
 * Those three and `name` have no setter: changing one recreates the picker,
 * keeping the value. The element reports `required` itself, as
 * `valueMissing`.
 *
 * @module elements
 */

import createTimePicker from "../components/timepicker";
import {
  TIME_FORMAT, TIME_PICKER_ORIENTATION, TIME_PICKER_TYPE,
  type TimePickerComponent, type TimePickerConfig,
} from "../components/timepicker/types";
import { createEmitter, type EventCallback } from "../core/state/emitter";
import { PREFIX } from "../core/config";
import { defineElement, type DefineOptions, type ElementHost, type ElementInstance, type ElementSpec } from "./define";

/** The time picker with a committed value, as the element sees it. */
export interface TimepickerElementComponent {
  element: HTMLElement;
  picker: TimePickerComponent;
  /** The committed time, or "". */
  getValue: () => string;
  setValue: (value: string) => void;
  /** Opens the dialog, unless the picker is disabled. */
  show: () => void;
  /** Closes the dialog without committing. */
  close: () => void;
  isOpen: () => boolean;
  disabled: boolean;
  required: boolean;
  on: (event: string, handler: EventCallback) => void;
  off: (event: string, handler: EventCallback) => void;
  destroy: () => void;
}

interface TimepickerElementConfig extends TimePickerConfig {
  step?: number;
  required?: boolean;
  disabled?: boolean;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/** `step` in seconds to the dial's steps. */
const steps = (step: number | undefined): Partial<TimePickerConfig> => {
  if (!step || step <= 0) return {};
  if (step < 60) return { showSeconds: true, secondStep: Math.round(step) || 1 };
  return { minuteStep: Math.round(step / 60) };
};

const create = (config: TimepickerElementConfig): TimepickerElementComponent => {
  const { step, required, disabled, value, ...rest } = config;
  const holder = document.createElement("div");
  const initial = value && TIME.test(value) ? value : "";
  const picker = createTimePicker({ ...rest, ...steps(step), value: initial || undefined, container: holder });
  // The dialog lives in the picker's own element, which the shadow root holds.
  picker.element.append(picker.dialogElement);
  const events = createEmitter();
  let committed = initial && picker.getValue();
  // The dial's time when it opened, which Cancel puts back, and whether OK closed it.
  let draft = "";
  let confirming = false;

  const onOpen = (): void => {
    draft = picker.getValue();
    confirming = false;
    events.emit("open");
  };
  const onClose = (): void => {
    if (confirming) {
      const previous = committed;
      committed = picker.getValue();
      if (committed !== previous) events.emit("change", committed);
    } else if (picker.getValue() !== draft) {
      picker.setValue(draft);
    }
    confirming = false;
    events.emit("close");
  };
  // OK closes the dialog, then emits `confirm`: it is known here first, before
  // the factory's own click listener closes it.
  const onClick = (event: MouseEvent): void => {
    if (event.target instanceof Element && event.target.closest(`.${PREFIX}-time-picker__confirm`)) confirming = true;
  };
  picker.on("open", onOpen);
  picker.on("close", onClose);
  picker.dialogElement.addEventListener("click", onClick, true);

  const component: TimepickerElementComponent = {
    element: picker.element,
    picker,
    getValue: () => committed,
    setValue: (next) => {
      if (next && TIME.test(next)) {
        picker.setValue(next);
        committed = picker.getValue();
      } else {
        committed = "";
      }
    },
    show: () => {
      if (!component.disabled) picker.open();
    },
    close: () => void picker.close(),
    isOpen: () => picker.isOpen,
    disabled: !!disabled,
    required: !!required,
    on: (event, handler) => void events.on(event, handler),
    off: (event, handler) => events.off(event, handler),
    destroy: () => {
      picker.off("open", onOpen);
      picker.off("close", onClose);
      picker.dialogElement.removeEventListener("click", onClick, true);
      events.clear();
      picker.destroy();
    },
  };
  return component;
};

const hosts = new WeakMap<TimepickerElementComponent, ElementHost<TimepickerElementComponent>>();

let missing: string | null = null;
/** The browser's own message for a required time left empty. */
const valueMissingMessage = (): string =>
  (missing ??= Object.assign(document.createElement("input"), { type: "time", required: true }).validationMessage ||
    "Please fill out this field.");

const validate = (c: TimepickerElementComponent): void => {
  const internals = hosts.get(c)?.internals;
  if (!internals) return;
  if (c.required && !c.getValue()) internals.setValidity({ valueMissing: true }, valueMissingMessage());
  else internals.setValidity({});
};

const setValue = (c: TimepickerElementComponent, value: unknown): void => {
  c.setValue(value === null || value === undefined ? "" : String(value));
  validate(c);
};

const setDisabled = (c: TimepickerElementComponent, disabled: boolean): void => {
  c.disabled = disabled;
  if (disabled) c.close();
};

/** Opens or closes the dialog; `open` then says whether it did (a disabled picker stays closed). */
const setOpen = (c: TimepickerElementComponent, open: boolean, host: HTMLElement): void => {
  if (open) c.show();
  else c.close();
  host.toggleAttribute("open", c.isOpen());
};

const timepickerSpec = {
  name: "timepicker",
  create: (config) => create(config as TimepickerElementConfig),
  styles: ["timepicker"],
  // Nothing shows until the dialog opens, which is in the top layer.
  hostStyles: ":host{display:contents}",
  attributes: {
    // The default value; not called once the element is dirty.
    value: { type: "string", config: "value", update: (c, v) => setValue(c, v) },
    format: {
      type: "string",
      config: "format",
      update: (c, v) => void c.picker.setFormat(v === "24h" ? TIME_FORMAT.MILITARY : TIME_FORMAT.AMPM),
    },
    type: {
      type: "string",
      config: "type",
      update: (c, v) => void c.picker.setType(v === "input" ? TIME_PICKER_TYPE.INPUT : TIME_PICKER_TYPE.DIAL),
    },
    orientation: {
      type: "string",
      config: "orientation",
      update: (c, v) =>
        void c.picker.setOrientation(v === "horizontal" ? TIME_PICKER_ORIENTATION.HORIZONTAL : TIME_PICKER_ORIENTATION.VERTICAL),
    },
    // The factory's limits and steps are read once: a change recreates it.
    min: { type: "string", config: "minTime" },
    max: { type: "string", config: "maxTime" },
    step: { type: "number", config: "step" },
    label: { type: "string", config: "title", update: (c, v) => void c.picker.setTitle(v === null ? "" : String(v)) },
    required: {
      type: "boolean",
      config: "required",
      update: (c, v) => {
        c.required = !!v;
        validate(c);
      },
    },
    disabled: { type: "boolean", config: "disabled", update: (c, v) => setDisabled(c, !!v) },
    open: { type: "boolean", update: (c, v, host) => setOpen(c, !!v, host) },
  },
  properties: {
    value: { get: (c): string => c.getValue(), set: setValue },
  },
  model: "value" as const,
  methods: ["show", "close"] as const,
  events: {
    change: { detail: (payload) => ({ value: payload as string }) },
    open: { detail: () => null },
    close: { detail: () => null },
  },
  form: {
    value: (c) => c.getValue(),
    events: ["change"],
    activate: (c) => c.show(),
    state: (c) => c.getValue(),
    restore: (c, state) => setValue(c, state),
    disable: (c, disabled) => setDisabled(c, disabled),
  },
  setup: (host, c) => {
    hosts.set(c, host);
    validate(c);
    // `open` reflects the dialog's state, as on <dialog>.
    const reflect = (): void => void host.toggleAttribute("open", c.isOpen());
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
} satisfies ElementSpec<TimepickerElementComponent>;

export const timepickerElement = defineElement<TimepickerElementComponent>(timepickerSpec);
export type TimepickerSpec = typeof timepickerSpec;
/** `<m-timepicker>` as a ref or a query returns it. */
export type TimepickerElement = ElementInstance<TimepickerSpec, TimepickerElementComponent>;

/** Registers `<m-timepicker>` (or `<prefix-timepicker>`). */
export const defineTimepicker = (options?: DefineOptions): string => timepickerElement.define(options);
