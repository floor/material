// src/components/datepicker/deferred.ts
//
// The opt-in entry: the same synchronous shell as the default picker — the
// field, the trigger, isOpen(), the open/close events, a cancellable close
// while the surface is in flight — with the calendar imported on the first
// open instead of built at creation. The trigger's pointerenter or focus
// starts that import a little earlier, without opening anything.
//
// What the surface paints is what waits: the calendar, its initial focus and
// its aria title. Until it lands the dialog carries `aria-label` as its name,
// `aria-expanded` stays false, and `open` has already been emitted; read
// isOpen() rather than the DOM while an open is in flight.
import { createDatePickerShell } from "./shell";
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
 * Creates a date picker whose calendar loads on the first open
 *
 * @param config - The picker's configuration
 * @returns The date picker component, openable before its surface exists
 */
export const createDeferredDatePicker = <M extends string = "single">(
  config: DatePickerConfig & { selectionMode?: M } = {},
): DatePickerComponent<DatePickerValueOf<M>> => {
  const { component, preload } = createDatePickerShell(config, undefined, () => import("./surface"));
  // The intent that precedes the click: the trigger's hover or focus warms
  // the chunk so the first open is already there. The import is idempotent.
  const trigger = component.element.querySelector<HTMLElement>('[data-action="open"]');
  trigger?.addEventListener("pointerenter", preload, { once: true });
  trigger?.addEventListener("focus", preload, { once: true });
  return component;
};

export default createDeferredDatePicker;
