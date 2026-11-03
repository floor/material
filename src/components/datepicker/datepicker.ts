// src/components/datepicker/datepicker.ts
//
// The default entry: the shell and the calendar surface built together, so the
// picker paints at creation and stays fully synchronous, as it has always
// been. The deferred entry (./deferred) runs the same shell and imports this
// surface on the first open instead.
import { createDatePickerShell } from "./shell";
import { createCalendarSurface } from "./surface";
import type { DatePickerComponent, DatePickerConfig, DatePickerValueOf } from "./types";

/**
 * Creates a date picker with its calendar built and painted at creation
 *
 * @param config - The picker's configuration
 * @returns The date picker component
 */
const createDatePicker = <M extends string = "single">(
  config: DatePickerConfig & { selectionMode?: M } = {},
): DatePickerComponent<DatePickerValueOf<M>> => createDatePickerShell(config, createCalendarSurface);

export default createDatePicker;
