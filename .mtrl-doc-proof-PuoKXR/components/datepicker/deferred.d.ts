import type { DatePickerComponent, DatePickerConfig, DatePickerValueOf } from "./types.js";
export type { DatePickerConfig, DatePickerComponent, DatePickerEvents, DatePickerValue, DatePickerValueOf, DatePickerInput, DatePickerChangePayload, DatePickerLoadErrorPayload, DatePickerVisibilityPayload, DatePickerTapPayload, DatePickerSwipePayload, DatePickerVariant, DatePickerView, DatePickerSelectionMode, CalendarAPI, } from "./types.js";
/**
 * Creates a date picker whose calendar loads on the first open
 * @param config
 */
export declare const createDeferredDatePicker: <M extends string = "single">(config?: DatePickerConfig & {
    selectionMode?: M;
}) => DatePickerComponent<DatePickerValueOf<M>>;
export default createDeferredDatePicker;
