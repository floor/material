/** Switch label position options */
export declare const SWITCH_LABEL_POSITIONS: {
    /** Label positioned before the switch (left in LTR layouts) */
    readonly START: "start";
    /** Label positioned after the switch (right in LTR layouts) */
    readonly END: "end";
};
/** Switch states */
export declare const SWITCH_STATES: {
    /** Switch is checked/on */
    readonly CHECKED: "checked";
    /** Switch is unchecked/off */
    readonly UNCHECKED: "unchecked";
    /** Switch is disabled */
    readonly DISABLED: "disabled";
    /** Switch is enabled */
    readonly ENABLED: "enabled";
};
/** Switch events */
export declare const SWITCH_EVENTS: {
    /** Emitted when the checked state changes. */
    readonly CHANGE: "change";
    /** The switch received focus. */
    readonly FOCUS: "focus";
    /** The switch lost focus. */
    readonly BLUR: "blur";
};
/** Default configuration values for switch */
export declare const SWITCH_DEFAULTS: {
    /** Default checked state */
    readonly CHECKED: false;
    /** Default disabled state */
    readonly DISABLED: false;
    /** Default required state */
    readonly REQUIRED: false;
    /** Default label position: the label leads and the switch trails, as in M3 settings rows */
    readonly LABEL_POSITION: "start";
    /** Default input value */
    readonly VALUE: "on";
};
/** CSS class names used by the switch component */
export declare const SWITCH_CLASSES: {
    /** Root element class */
    readonly ROOT: "switch";
    /** Container element class */
    readonly CONTAINER: "switch__container";
    /** Content wrapper class */
    readonly CONTENT: "switch__content";
    /** Label element class */
    readonly LABEL: "switch__label";
    /** Input element class */
    readonly INPUT: "switch__input";
    /** Track element class */
    readonly TRACK: "switch__track";
    /** Thumb element class */
    readonly THUMB: "switch__thumb";
    /** Label at start position class */
    readonly LABEL_START: "switch--label-start";
    /** Label at end position class */
    readonly LABEL_END: "switch--label-end";
    /** Checked state class */
    readonly CHECKED: "switch--checked";
    /** Disabled state class */
    readonly DISABLED: "switch--disabled";
    /** Error state class */
    readonly ERROR: "switch--error";
    /** Helper/supporting text class */
    readonly HELPER: "switch__helper";
    /** Error helper text class */
    readonly HELPER_ERROR: "switch__helper--error";
    /** Focus state class */
    readonly FOCUSED: "switch--focused";
};
