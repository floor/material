/** Available slider color variants */
export declare const SLIDER_COLORS: {
    /** Primary color variant */
    readonly PRIMARY: "primary";
    /** Secondary color variant */
    readonly SECONDARY: "secondary";
    /** Tertiary color variant */
    readonly TERTIARY: "tertiary";
    /** Error color variant */
    readonly ERROR: "error";
};
/** Available slider size variants */
export declare const SLIDER_SIZES: {
    /** Extra small size (default) - 16px track height */
    readonly XS: 16;
    /** Small size - 24px track height */
    readonly S: 24;
    /** Medium size - 40px track height */
    readonly M: 40;
    /** Large size - 56px track height */
    readonly L: 56;
    /** Extra large size - 96px track height */
    readonly XL: 96;
};
/** Slider component size type */
export type SliderSize = keyof typeof SLIDER_SIZES | number;
/** Slider component measurements */
export declare const SLIDER_MEASUREMENTS: {
    /** Handle size in pixels */
    readonly HANDLE_SIZE: 16;
    /** Handle height for XS and S sizes in pixels (M3: 44dp) */
    readonly SMALL_HANDLE_HEIGHT: 44;
    /** Handle height offset for M, L, XL sizes (added to track height: 52, 68, 108dp) */
    readonly HANDLE_HEIGHT_OFFSET: 12;
    /** Minimum container height in pixels (M3 minimum touch target) */
    readonly MIN_HEIGHT: 48;
    /** Tick size in pixels */
    readonly TICK_SIZE: 4;
    /** Dot size in pixels */
    readonly DOT_SIZE: 4;
    /** Handle gap pixels */
    readonly HANDLE_GAP: 6;
};
/** Available slider events */
export declare const SLIDER_EVENTS: {
    /** Fired when slider value changes and interaction completes */
    readonly CHANGE: "change";
    /** Fired during dragging as value changes */
    readonly INPUT: "input";
    /** Fired when slider receives focus */
    readonly FOCUS: "focus";
    /** Fired when slider loses focus */
    readonly BLUR: "blur";
    /** Fired when interaction starts */
    readonly START: "start";
    /** Fired when interaction ends */
    readonly END: "end";
};
/** Position options for slider label and icon */
export declare const SLIDER_POSITIONS: {
    /** Position at the start */
    readonly START: "start";
    /** Position at the end */
    readonly END: "end";
};
/** Default slider configuration values */
export declare const SLIDER_DEFAULTS: {
    /** Minimum value */
    readonly MIN: 0;
    /** Maximum value */
    readonly MAX: 100;
    /** Starting value */
    readonly VALUE: 0;
    /** Step increment size */
    readonly STEP: 1;
    /** Whether slider is disabled */
    readonly DISABLED: false;
    /** Default color variant */
    readonly COLOR: "primary";
    /** Default size variant */
    readonly SIZE: "XS";
    /** Whether to show tick marks */
    readonly TICKS: false;
    /** Whether to show value while dragging */
    readonly SHOW_VALUE: true;
    /** Whether to snap to steps during dragging */
    readonly SNAP_TO_STEPS: true;
    /** Whether slider is a range slider (two handles) */
    readonly RANGE: false;
    /** Whether slider is a centered slider (active track from center) */
    readonly CENTERED: false;
    /** Default icon position */
    readonly ICON_POSITION: "start";
    /** Default label position */
    readonly LABEL_POSITION: "start";
};
/** CSS class names used by the slider component */
export declare const SLIDER_CLASSES: {
    /** Root element class */
    readonly ROOT: "slider";
    /** Container for slider track and handles */
    readonly CONTAINER: "slider__container";
    /** Filled track portion class */
    readonly FILL: "slider__fill";
    /** Handle element class */
    readonly HANDLE: "slider__handle";
    /** Second handle element class (for range slider) */
    readonly HANDLE_SECOND: "slider__handle--second";
    /** Tick marks container class */
    readonly LABEL: "slider__label";
    /** Value display class */
    readonly VALUE: "slider__value";
    /** Icon container class */
    readonly ICON: "slider__icon";
    /** Disabled state class */
    readonly DISABLED: "slider--disabled";
    /** Focused state class */
    readonly FOCUSED: "slider--focused";
    /** Dragging state class */
    readonly DRAGGING: "slider--dragging";
    /** Range slider variant class */
    readonly RANGE: "slider--range";
    /** Primary color variant class */
    readonly PRIMARY: "slider--primary";
    /** Secondary color variant class */
    readonly SECONDARY: "slider--secondary";
    /** Tertiary color variant class */
    readonly TERTIARY: "slider--tertiary";
    /** Error color variant class */
    readonly ERROR: "slider--error";
};
