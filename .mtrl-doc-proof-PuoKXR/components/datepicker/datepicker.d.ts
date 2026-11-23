import type { DatePickerComponent, DatePickerConfig, DatePickerValueOf } from "./types.js";
/** M3 calendar/input modes share a draft; modal acceptance is the commit boundary. */
/** The value's type follows a literal selectionMode: `'range'` makes it a pair, the default a date. */
declare const createDatePicker: <M extends string = "single">(config?: DatePickerConfig & {
    selectionMode?: M;
}) => DatePickerComponent<DatePickerValueOf<M>>;
export default createDatePicker;
