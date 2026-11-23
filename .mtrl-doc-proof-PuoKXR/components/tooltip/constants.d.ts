/** Tooltip positions */
export declare const TOOLTIP_POSITIONS: {
    /** Position above the target element */
    readonly TOP: "top";
    /** Position to the right of the target element */
    readonly RIGHT: "right";
    /** Position below the target element */
    readonly BOTTOM: "bottom";
    /** Position to the left of the target element */
    readonly LEFT: "left";
    /** Position above and aligned to the start of the target */
    readonly TOP_START: "top-start";
    /** Position above and aligned to the end of the target */
    readonly TOP_END: "top-end";
    /** Position to the right and aligned to the start of the target */
    readonly RIGHT_START: "right-start";
    /** Position to the right and aligned to the end of the target */
    readonly RIGHT_END: "right-end";
    /** Position below and aligned to the start of the target */
    readonly BOTTOM_START: "bottom-start";
    /** Position below and aligned to the end of the target */
    readonly BOTTOM_END: "bottom-end";
    /** Position to the left and aligned to the start of the target */
    readonly LEFT_START: "left-start";
    /** Position to the left and aligned to the end of the target */
    readonly LEFT_END: "left-end";
};
/** Tooltip visual variants */
export declare const TOOLTIP_VARIANTS: {
    /** Standard tooltip with background and arrow */
    readonly DEFAULT: "default";
    /** Rich tooltip with support for HTML content */
    readonly RICH: "rich";
    /** Plain text tooltip with minimal styling */
    readonly PLAIN: "plain";
};
/** Tooltip events */
export declare const TOOLTIP_EVENTS: {
    /** Fired when tooltip becomes visible */
    readonly SHOW: "show";
    /** Fired when tooltip becomes hidden */
    readonly HIDE: "hide";
    /** Fired when mouse enters target element */
    readonly ENTER: "enter";
    /** Fired when mouse leaves target element */
    readonly LEAVE: "leave";
};
/** Default configuration values for tooltip */
export declare const TOOLTIP_DEFAULTS: {
    /** Default tooltip position */
    readonly POSITION: "bottom";
    /** Default visual variant */
    readonly VARIANT: "default";
    /** Default visibility state */
    readonly VISIBLE: false;
    /** Default show delay in milliseconds */
    readonly SHOW_DELAY: 300;
    /** Default hide delay in milliseconds */
    readonly HIDE_DELAY: 100;
    /** Default offset from target in pixels */
    readonly OFFSET: 8;
    /** Default arrow size in pixels */
    readonly ARROW_SIZE: 8;
    /** Whether to show tooltip on focus by default */
    readonly SHOW_ON_FOCUS: true;
    /** Whether to show tooltip on hover by default */
    readonly SHOW_ON_HOVER: true;
};
/** CSS class names used by the tooltip component */
export declare const TOOLTIP_CLASSES: {
    /** Root element class */
    readonly ROOT: "tooltip";
    /** Reserved slot; the current tooltip renders content directly in its root. */
    readonly CONTAINER: "tooltip__container";
    /** Arrow element class */
    readonly ARROW: "tooltip__arrow";
    /** Reserved slot; the current tooltip renders content directly in its root. */
    readonly CONTENT: "tooltip__content";
    /** Visible state class */
    readonly VISIBLE: "tooltip--visible";
    /** Hidden state class */
    readonly HIDDEN: "tooltip--hidden";
    /** Default variant class */
    readonly DEFAULT: "tooltip--default";
    /** Rich variant class */
    readonly RICH: "tooltip--rich";
    /** Plain variant class */
    readonly PLAIN: "tooltip--plain";
    /** Position prefix - append position name (e.g. */
    readonly POSITION_PREFIX: "tooltip--";
};
