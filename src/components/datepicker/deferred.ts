// src/components/datepicker/deferred.ts
//
// The opt-in entry: a synchronous shell with the default picker's contract —
// the field, the trigger, isOpen(), the open/close events, a cancellable close
// while the surface is in flight — with the calendar imported on the first
// open instead of built at creation. The trigger's pointerenter or focus
// starts that import a little earlier, without opening anything.
//
// The shell and the surface are the opt-in entry's own modules, so the default
// entry keeps the modules it always had, byte for byte; what they repeat of
// the default's code is what an opt-in caller pays for, and nobody else does.
//
// What the surface paints is what waits: the calendar, its initial focus and
// its aria title. Until it lands the dialog carries `aria-label` as its name,
// `aria-expanded` stays false, and `open` has already been emitted; read
// isOpen() rather than the DOM while an open is in flight.
import { createDatePickerShell } from "./shell";
import type { DatePickerSurface, DatePickerSurfaceInput } from "./surface";
import type { DatePickerComponent, DatePickerConfig, DatePickerValueOf } from "./types";

export type {
  DatePickerConfig,
  DatePickerComponent,
  DatePickerEvents,
  DatePickerValue,
  DatePickerValueOf,
  DatePickerInput,
  DatePickerChangePayload,
  DatePickerVisibilityPayload,
  DatePickerTapPayload,
  DatePickerSwipePayload,
  DatePickerVariant,
  DatePickerView,
  DatePickerSelectionMode,
  CalendarAPI,
} from "./types";

/**
 * The shell's surface until the calendar lands: open() and every synchronous
 * answer come from the shell, the import starts on the first show (or the
 * trigger's intent to open), and the calendar takes over the tuple when it
 * arrives.
 */
const createDeferredSurface = (...input: DatePickerSurfaceInput): DatePickerSurface => {
  const [state, dialog, , , trigger, , isOpen] = input;
  let real: DatePickerSurface | null = null;
  // 0: idle, 1: the import is in flight, 2: destroyed.
  let phase = 0;
  const request = () => {
    if (phase) return;
    phase = 1;
    import("./surface").then(
      ({ createCalendarSurface }) => {
        if (phase === 2) return;
        // The calendar paints itself at creation; an open still in flight
        // paints when it lands.
        real = createCalendarSurface(...input);
        if (isOpen()) real[0]();
      },
      (error: unknown) => console.error("Date picker surface failed to load:", error),
    );
  };
  // The surface renders the title the dialog is labelled by; until it lands,
  // the field's label names the dialog.
  if (dialog.getAttribute("aria-modal") === "true") dialog.setAttribute("aria-label", state.label);
  trigger.addEventListener("pointerenter", request, { once: true });
  trigger.addEventListener("focus", request, { once: true });
  return [
    () => { if (real) real[0](); else request(); },
    () => real?.[1](),
    (focus, action) => real?.[2](focus, action),
    event => real?.[3](event),
    event => real?.[4](event),
    () => real?.[5]() ?? true,
    () => { phase = 2; real?.[6](); },
  ];
};

/**
 * Creates a date picker whose calendar loads on the first open
 *
 * @param config - The picker's configuration
 * @returns The date picker component, openable before its surface exists
 */
export const createDeferredDatePicker = <M extends string = "single">(
  config: DatePickerConfig & { selectionMode?: M } = {},
): DatePickerComponent<DatePickerValueOf<M>> => createDatePickerShell<M>(config, createDeferredSurface);

export default createDeferredDatePicker;
