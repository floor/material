/** DatePicker variants */
export declare const DATEPICKER_VARIANTS: {
    /** Docked datepicker appears inline on the page */
    readonly DOCKED: "docked";
    /** Modal datepicker appears in a dialog overlay */
    readonly MODAL: "modal";
    /** Modal with input field for entering dates */
    readonly MODAL_INPUT: "modal-input";
};
/** DatePicker views */
export declare const DATEPICKER_VIEWS: {
    /** Daily calendar grid view */
    readonly DAY: "day";
    /** Month selection view */
    readonly MONTH: "month";
    /** Year selection view */
    readonly YEAR: "year";
};
/** DatePicker selection modes */
export declare const DATEPICKER_SELECTION_MODES: {
    /** Select a single date */
    readonly SINGLE: "single";
    /** Select a date range */
    readonly RANGE: "range";
};
/** Day names for the calendar */
export declare const DAY_NAMES: string[];
/** Month names for the calendar */
export declare const MONTH_NAMES: string[];
/** Month names abbreviated */
export declare const MONTH_NAMES_SHORT: string[];
/** Default format for displaying dates */
export declare const DEFAULT_DATE_FORMAT = "MM/DD/YYYY";
/** DatePicker CSS class names */
export declare const DATEPICKER_CLASSES: {
    /** Root container class */
    readonly ROOT: "datepicker";
    /** Class for the input field */
    readonly INPUT: "datepicker__input";
    /** Class for the calendar container */
    readonly CALENDAR: "datepicker__calendar";
    /** Class for the header section */
    readonly HEADER: "datepicker__header";
    /** Class for the month/year navigation */
    readonly NAVIGATION: "datepicker__navigation";
    /** Class for the day names row */
    readonly WEEKDAYS: "datepicker__weekdays";
    /** Class for the days grid */
    readonly DAYS: "datepicker__days";
    /** Class for individual day cells */
    readonly DAY: "datepicker__day";
    /** Class for today's date */
    readonly TODAY: "datepicker__day--today";
    /** Class for selected date */
    readonly SELECTED: "datepicker__day--selected";
    /** Class for disabled dates */
    readonly DISABLED: "datepicker__day--disabled";
    /** Class for dates outside the current month */
    readonly OUTSIDE_MONTH: "datepicker__day--outside";
    /** Class for first date in a range */
    readonly RANGE_START: "datepicker__cell--range-start";
    /** Class for last date in a range */
    readonly RANGE_END: "datepicker__cell--range-end";
    /** Class for dates between start and end in a range */
    readonly RANGE_MIDDLE: "datepicker__cell--range";
};
/** DatePicker events */
export declare const DATEPICKER_EVENTS: {
    /** Fired when the selected date changes */
    readonly CHANGE: "change";
    /** Fired when the datepicker opens */
    readonly OPEN: "open";
    /** Fired when the datepicker closes */
    readonly CLOSE: "close";
    /** Fired when a day is clicked/focused */
    readonly SELECT: "select";
    /** Fired when the view changes (day/month/year) */
    readonly VIEW_CHANGE: "viewChange";
};
/** Internal SVG assets; accessible names are on their buttons. */
export declare const DATEPICKER_ICONS: {
    readonly calendar: "<svg viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2ZM5 10h14v10H5V10Zm0-4h14v2H5V6Zm2 6h4v4H7v-4Z\"/></svg>";
    readonly edit: "<svg viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"m3 17.25 11.06-11.06 3.75 3.75L6.75 21H3v-3.75ZM20.71 7.04l-1.83 1.83-3.75-3.75 1.83-1.83a1 1 0 0 1 1.41 0l2.34 2.34a1 1 0 0 1 0 1.41Z\"/></svg>";
    readonly previous: "<svg viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"m15.4 7.4-1.4-1.4-6 6 6 6 1.4-1.4-4.6-4.6Z\"/></svg>";
    readonly next: "<svg viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"m8.6 7.4 1.4-1.4 6 6-6 6-1.4-1.4 4.6-4.6Z\"/></svg>";
    readonly close: "<svg viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12Z\"/></svg>";
};
