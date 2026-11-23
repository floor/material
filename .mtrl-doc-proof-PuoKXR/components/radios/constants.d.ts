/** Radio states for styling and behavior */
export declare const RADIO_STATES: {
    /** Radio is selected */
    readonly CHECKED: "checked";
    /** Radio is not selected */
    readonly UNCHECKED: "unchecked";
    /** Radio is disabled */
    readonly DISABLED: "disabled";
    /** Radio has keyboard focus */
    readonly FOCUSED: "focused";
};
/** Radio layout directions */
export declare const RADIO_DIRECTIONS: {
    /** Radios stacked vertically */
    readonly VERTICAL: "vertical";
    /** Radios arranged horizontally */
    readonly HORIZONTAL: "horizontal";
};
/** Radio events */
export declare const RADIO_EVENTS: {
    /** Fired when a radio button is selected */
    readonly CHANGE: "change";
    /** Native input focus event; listen on the input, not the group emitter. */
    readonly FOCUS: "focus";
    /** Native input blur event; listen on the input, not the group emitter. */
    readonly BLUR: "blur";
};
/** Default configuration values */
export declare const RADIO_DEFAULTS: {
    /** Default radio direction */
    readonly DIRECTION: "vertical";
};
