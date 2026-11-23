import type { ForwardedEventPayload } from "../../core/dom/index.js";
import type { NormalizedEvent } from "../../core/utils/mobile.js";
/** Value returned by the API, including complete ranges and empty selections. */
export type DatePickerValue = Date | [
    Date,
    Date
] | null;
/** The value as the selection mode shapes it: a range is a pair, a single date a date; an unknown mode, either. */
export type DatePickerValueOf<M> = M extends "range" ? [
    Date,
    Date
] | null : M extends "single" ? Date | null : DatePickerValue;
/** What setValue and `value` take: a date, a range as a pair, or as { start, end }. */
export type DatePickerInput = Date | string | [
    Date | string,
    Date | string
] | {
    start: Date | string;
    end: Date | string;
};
/** One shape whatever committed the value: a range's `value` is the pair, and `rangeEndDate` its end, kept for compatibility (null otherwise). */
export interface DatePickerChangePayload<V = DatePickerValue> {
    value: V;
    rangeEndDate: Date | null;
    formattedValue: string;
    /** The value as ISO 8601 text, the `value` of the `<m-datepicker>` element's */
    iso: string;
}
/** Visibility events carry the committed value, including complete ranges. */
export interface DatePickerVisibilityPayload<V = DatePickerValue> {
    value: V;
}
/** Normalized touch-end event emitted by the interactive root. */
export type DatePickerTapPayload = NormalizedEvent;
/** Horizontal swipe emitted by the interactive root. */
export interface DatePickerSwipePayload {
    direction: "left" | "right";
    deltaX: number;
    deltaY: number;
}
/** A deferred calendar import failed. */
export interface DatePickerLoadErrorPayload {
    error: unknown;
}
/** Events emitted by the picker API, calendar selections and interactive root. */
export interface DatePickerEvents<V = DatePickerValue> {
    change: (payload: DatePickerChangePayload<V>) => void;
    open: (payload: DatePickerVisibilityPayload<V>) => void;
    close: (payload: DatePickerVisibilityPayload<V>) => void;
    loaderror: (payload: DatePickerLoadErrorPayload) => void;
    click: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    keydown: (payload: ForwardedEventPayload<KeyboardEvent, HTMLElement>) => void;
    tap: (payload: DatePickerTapPayload) => void;
    swipe: (payload: DatePickerSwipePayload) => void;
}
/** DatePicker variant types */
export type DatePickerVariant = 'docked' | 'modal' | 'modal-input' | 'fullscreen';
/** DatePicker view types */
export type DatePickerView = 'day' | 'month' | 'year';
/** DatePicker selection mode types */
export type DatePickerSelectionMode = 'single' | 'range';
/** Configuration interface for the DatePicker component */
export interface DatePickerConfig {
    /** Name of the committed form input. */
    name?: string;
    /**
 * DatePicker variant that determines display style
 * @default 'docked'
 */
    variant?: DatePickerVariant | string;
    /**
 * Whether the datepicker is initially disabled
 * @default false
 */
    disabled?: boolean;
    /**
 * Initial view to display (day, month, year)
 * @default 'day'
 */
    initialView?: DatePickerView | string;
    /**
 * Selection mode for the datepicker (single or range)
 * @default 'single'
 */
    selectionMode?: DatePickerSelectionMode | string;
    /** Initial selected date(s) */
    value?: DatePickerInput;
    /** The value shows and cannot change: no typing, no calendar. */
    readOnly?: boolean;
    /** A date is required: on the input for forms, and checkValidity(). */
    required?: boolean;
    /** The supporting text under the field. */
    supportingText?: string;
    /** Minimum selectable date */
    minDate?: Date | string;
    /** Maximum selectable date */
    maxDate?: Date | string;
    /**
 * BCP 47 locale tag driving month and weekday names, the first day of the week, and the default displayed date format when `dateFormat` is omitted.
 * @default 'en-US'
 */
    locale?: string;
    /**
 * Format for displaying dates (derived from `locale` when omitted)
 * @default 'MM/DD/YYYY'
 */
    dateFormat?: string;
    /** Label text for the datepicker */
    label?: string;
    /** Accessible name of the calendar dialog; defaults to the visible label. */
    ariaLabel?: string;
    /** Placeholder text for the input field */
    placeholder?: string;
    /** Additional CSS classes to add to the datepicker */
    class?: string;
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /** Component name used in class generation */
    componentName?: string;
    /**
 * Whether to enable animation effects
 * @default true
 */
    animate?: boolean;
    /**
 * Whether pointer or Space selection also closes the picker.
 * @default false
 */
    closeOnSelect?: boolean;
    /** Array of dates to highlight or disable */
    specialDates?: Array<{
        date: Date | string;
        highlight?: boolean;
        disabled?: boolean;
        tooltip?: string;
    }>;
}
/** Date object with additional properties for rendering */
export interface CalendarDate {
    /** JavaScript Date object */
    date: Date;
    /** Day of the month (1-31) */
    day: number;
    /** Whether the date is in the current month being displayed */
    isCurrentMonth: boolean;
    /** Whether the date is today */
    isToday: boolean;
    /** Whether the date is selected */
    isSelected: boolean;
    /** Whether the date is disabled */
    isDisabled: boolean;
    /** Whether the date is the first date in a range */
    isRangeStart?: boolean;
    /** Whether the date is the last date in a range */
    isRangeEnd?: boolean;
    /** Whether the date is between start and end in a range */
    isRangeMiddle?: boolean;
}
/** Calendar API interface for managing calendar navigation */
export interface CalendarAPI {
    /** Updates the calendar view to display a specific month/year */
    goToDate: (date: Date) => void;
    /** Moves to the next month */
    nextMonth: () => void;
    /** Moves to the previous month */
    prevMonth: () => void;
    /** Moves to the next year */
    nextYear: () => void;
    /** Moves to the previous year */
    prevYear: () => void;
    /** Switches to day selection view */
    showDayView: () => void;
    /** Switches to month selection view */
    showMonthView: () => void;
    /** Switches to year selection view */
    showYearView: () => void;
    /** Gets the current calendar view */
    getCurrentView: () => string;
}
/** DatePicker component interface */
export interface DatePickerComponent<V = DatePickerValue> {
    /** The datepicker's main DOM element */
    element: HTMLElement;
    /** The input field DOM element */
    input: HTMLInputElement;
    /** API for managing calendar and selected dates */
    calendar: CalendarAPI;
    /** API for managing disabled state */
    disabled: {
        /** Enables the datepicker */
        enable: () => void;
        /** Disables the datepicker */
        disable: () => void;
        /** Checks if the datepicker is disabled */
        isDisabled: () => boolean;
    };
    /** API for managing component lifecycle */
    lifecycle: {
        /** Destroys the component and cleans up resources */
        destroy: () => void;
    };
    /**
 * Gets a class name with the component's prefix
 * @param name
 */
    getClass: (name: string) => string;
    /** Opens the datepicker dropdown/modal. */
    open: () => DatePickerComponent<V>;
    /** Closes the datepicker dropdown/modal. */
    close: () => DatePickerComponent<V>;
    /** Whether the dropdown or modal is open */
    isOpen: () => boolean;
    /** Gets the selected date(s) */
    getValue: () => V;
    /**
 * Sets the selected date(s).
 * @param value
 */
    setValue: (value: DatePickerInput) => DatePickerComponent<V>;
    /** Read-only: the value shows and cannot change */
    setReadOnly: (readOnly: boolean) => DatePickerComponent<V>;
    /** Whether the picker is read-only */
    isReadOnly: () => boolean;
    /** Whether a date is required */
    setRequired: (required: boolean) => DatePickerComponent<V>;
    /** False when a date is required and missing. */
    checkValidity: () => boolean;
    /** As checkValidity(), and shows the error on the field when false */
    reportValidity: () => boolean;
    /** The supporting text; empty or null shows the date format */
    setSupportingText: (text: string | null) => DatePickerComponent<V>;
    /** Names the calendar dialog; empty restores its visible label. */
    setAriaLabel: (label: string) => DatePickerComponent<V>;
    /** Gets the formatted date string based on the selected date(s) */
    getFormattedValue: () => string;
    /** Clears the selected date(s). */
    clear: () => DatePickerComponent<V>;
    /** Enables the datepicker */
    enable: () => DatePickerComponent<V>;
    /** Disables the datepicker */
    disable: () => DatePickerComponent<V>;
    /**
 * Sets the minimum selectable date
 * @param date
 */
    setMinDate: (date: Date | string) => DatePickerComponent<V>;
    /**
 * Sets the maximum selectable date
 * @param date
 */
    setMaxDate: (date: Date | string) => DatePickerComponent<V>;
    /** Destroys the datepicker component and cleans up resources */
    destroy: () => void;
    /**
 * Adds an event listener to the datepicker
 * @param event
 * @param handler
 */
    on: <K extends keyof DatePickerEvents<V>>(event: K, handler: DatePickerEvents<V>[K]) => DatePickerComponent<V>;
    /**
 * Removes an event listener from the datepicker
 * @param event
 * @param handler
 */
    off: <K extends keyof DatePickerEvents<V>>(event: K, handler: DatePickerEvents<V>[K]) => DatePickerComponent<V>;
}
/** Internal calendar view model. */
export interface DatePickerState {
    selectedDate: Date | null;
    rangeEndDate: Date | null;
    currentView: DatePickerView;
    currentMonth: number;
    currentYear: number;
    focusedDate: Date;
    minDate: Date | null;
    maxDate: Date | null;
    locale: string;
    firstDayOfWeek: number;
    dateFormat: string;
    variant: DatePickerVariant;
    selectionMode: DatePickerSelectionMode;
    inputMode: boolean;
    prefix: string;
    id: string;
    label: string;
    specialDates: NonNullable<DatePickerConfig["specialDates"]>;
    isAllowed(date: Date): boolean;
    /** Full screen: the first month of the rendered list, and how many follow. */
    listStart?: Date;
    listLength?: number;
}
/** Register the date picker's existing options with the component-defaults map. */
declare module "../../core/config/global" {
    interface ComponentConfigMap {
        datepicker?: Partial<DatePickerConfig>;
    }
}
