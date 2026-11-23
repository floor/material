/** Time picker display types */
export declare const TIMEPICKER_TYPES: {
    /** Clock dial-based time picker */
    readonly DIAL: "dial";
    /** Text input-based time picker */
    readonly INPUT: "input";
};
/** Time picker orientations */
export declare const TIMEPICKER_ORIENTATIONS: {
    /** Vertical layout (default on mobile) */
    readonly VERTICAL: "vertical";
    /** Horizontal layout */
    readonly HORIZONTAL: "horizontal";
};
/** Time formats */
export declare const TIMEPICKER_FORMATS: {
    /** 12-hour format with AM/PM */
    readonly AMPM: "12h";
    /** 24-hour format */
    readonly MILITARY: "24h";
};
/** Time periods for 12-hour format */
export declare const TIMEPICKER_PERIODS: {
    /** Morning */
    readonly AM: "AM";
    /** Afternoon/Evening */
    readonly PM: "PM";
};
/** Time picker event types */
export declare const TIMEPICKER_EVENTS: {
    /** Fired when the committed time changes: on OK, or setValue */
    readonly CHANGE: "change";
    /** Fired as the dial, fields or AM/PM change the draft, while open */
    readonly INPUT: "input";
    /** Fired when time picker opens */
    readonly OPEN: "open";
    /** Fired when time picker closes */
    readonly CLOSE: "close";
    /** Fired when time is confirmed */
    readonly CONFIRM: "confirm";
    /** Fired when time picker is canceled */
    readonly CANCEL: "cancel";
};
/** Time constants used for generating clock numbers and validation */
export declare const TIMEPICKER_VALUES: {
    /** Hours for 12-hour format (1-12) */
    readonly HOURS_12: number[];
    /** Hours for 24-hour format (0-23) */
    readonly HOURS_24: number[];
    /** Minutes (0-59) */
    readonly MINUTES: number[];
    /** Seconds (0-59) */
    readonly SECONDS: number[];
};
/** Element class selectors for time picker components */
export declare const TIMEPICKER_SELECTORS: {
    /** Main container selector */
    readonly CONTAINER: ".mtrl-time-picker";
    /** Dialog container selector */
    readonly DIALOG: ".mtrl-time-picker__dialog";
    /** Title element selector */
    readonly TITLE: ".mtrl-time-picker__title";
    /** Content container selector */
    readonly CONTENT: ".mtrl-time-picker__content";
    /** Clock dial container selector */
    readonly DIAL: ".mtrl-time-picker__dial";
    /** Clock dial face selector */
    readonly DIAL_FACE: ".mtrl-time-picker__dial-face";
    /** Clock centre dot selector */
    readonly DIAL_CENTER: ".mtrl-time-picker__dial-centre";
    /** Clock numbers container selector */
    readonly DIAL_NUMBERS: ".mtrl-time-picker__dial-numbers";
    /** Individual number element selector */
    readonly DIAL_NUMBER: ".mtrl-time-picker__dial-number";
    /** Input container selector */
    readonly INPUT_CONTAINER: ".mtrl-time-picker__input-container";
    /** Hours input selector */
    readonly HOURS_INPUT: ".mtrl-time-picker__hours";
    /** Minutes input selector */
    readonly MINUTES_INPUT: ".mtrl-time-picker__minutes";
    /** Seconds input selector */
    readonly SECONDS_INPUT: ".mtrl-time-picker__seconds";
    /** Time separator selector */
    readonly SEPARATOR: ".mtrl-time-picker__separator";
    /** AM/PM selector container */
    readonly PERIOD_CONTAINER: ".mtrl-time-picker__period";
    /** AM button selector */
    readonly PERIOD_AM: ".mtrl-time-picker__period-am";
    /** PM button selector */
    readonly PERIOD_PM: ".mtrl-time-picker__period-pm";
    /** Actions container selector */
    readonly ACTIONS: ".mtrl-time-picker__actions";
    /** Toggle type button selector */
    readonly TOGGLE_TYPE_BUTTON: ".mtrl-time-picker__toggle-type";
    /** Cancel button selector */
    readonly CANCEL_BUTTON: ".mtrl-time-picker__cancel";
    /** Confirm button selector */
    readonly CONFIRM_BUTTON: ".mtrl-time-picker__confirm";
};
/** Default icons for the time picker */
export declare const TIMEPICKER_ICONS: {
    /** Default clock icon */
    readonly CLOCK: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\">\n    <circle cx=\"12\" cy=\"12\" r=\"10\"></circle>\n    <polyline points=\"12 6 12 12 16 14\"></polyline>\n  </svg>";
    /** Default keyboard icon */
    readonly KEYBOARD: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\">\n    <rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\" ry=\"2\"></rect>\n    <line x1=\"6\" y1=\"8\" x2=\"6\" y2=\"8\"></line>\n    <line x1=\"10\" y1=\"8\" x2=\"10\" y2=\"8\"></line>\n    <line x1=\"14\" y1=\"8\" x2=\"14\" y2=\"8\"></line>\n    <line x1=\"18\" y1=\"8\" x2=\"18\" y2=\"8\"></line>\n    <line x1=\"6\" y1=\"12\" x2=\"6\" y2=\"12\"></line>\n    <line x1=\"10\" y1=\"12\" x2=\"10\" y2=\"12\"></line>\n    <line x1=\"14\" y1=\"12\" x2=\"14\" y2=\"12\"></line>\n    <line x1=\"18\" y1=\"12\" x2=\"18\" y2=\"12\"></line>\n    <line x1=\"6\" y1=\"16\" x2=\"18\" y2=\"16\"></line>\n  </svg>";
};
/** Default configuration values for the time picker */
export declare const TIMEPICKER_DEFAULTS: {
    /** Default picker type */
    readonly TYPE: "dial";
    /** Default time format */
    readonly FORMAT: "12h";
    /** Default orientation */
    readonly ORIENTATION: "vertical";
    /** Whether to show seconds selector */
    readonly SHOW_SECONDS: false;
    /** Step interval for minute selection */
    readonly MINUTE_STEP: 1;
    /** Step interval for second selection */
    readonly SECOND_STEP: 1;
    /** Default cancel button text */
    readonly CANCEL_TEXT: "Cancel";
    /** Default confirm button text */
    readonly CONFIRM_TEXT: "OK";
    /** Whether picker is initially open: the default of the `open` option */
    readonly OPEN: false;
    /** Default clock icon */
    readonly CLOCK_ICON: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\">\n    <circle cx=\"12\" cy=\"12\" r=\"10\"></circle>\n    <polyline points=\"12 6 12 12 16 14\"></polyline>\n  </svg>";
    /** Default keyboard icon */
    readonly KEYBOARD_ICON: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\">\n    <rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\" ry=\"2\"></rect>\n    <line x1=\"6\" y1=\"8\" x2=\"6\" y2=\"8\"></line>\n    <line x1=\"10\" y1=\"8\" x2=\"10\" y2=\"8\"></line>\n    <line x1=\"14\" y1=\"8\" x2=\"14\" y2=\"8\"></line>\n    <line x1=\"18\" y1=\"8\" x2=\"18\" y2=\"8\"></line>\n    <line x1=\"6\" y1=\"12\" x2=\"6\" y2=\"12\"></line>\n    <line x1=\"10\" y1=\"12\" x2=\"10\" y2=\"12\"></line>\n    <line x1=\"14\" y1=\"12\" x2=\"14\" y2=\"12\"></line>\n    <line x1=\"18\" y1=\"12\" x2=\"18\" y2=\"12\"></line>\n    <line x1=\"6\" y1=\"16\" x2=\"18\" y2=\"16\"></line>\n  </svg>";
};
