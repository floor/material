/** TextField variant constants */
declare const TEXT_FIELD_VARIANTS: {
    /** Filled variant with background and animated label */
    readonly FILLED: "filled";
    /** Outlined variant with border and animated label */
    readonly OUTLINED: "outlined";
};
/** TextField state constants */
declare const TEXT_FIELD_STATES: {
    /** TextField is active (focused) */
    readonly ACTIVE: "active";
    /** TextField is inactive (not focused) */
    readonly INACTIVE: "inactive";
    /** TextField is disabled */
    readonly DISABLED: "disabled";
};
/** TextField type constants */
declare const TEXT_FIELD_TYPES: {
    /** Standard text input */
    readonly TEXT: "text";
    /** Password input with obscured characters */
    readonly PASSWORD: "password";
    /** Email input with email validation */
    readonly EMAIL: "email";
    /** Numeric input */
    readonly NUMBER: "number";
    /** Telephone number input */
    readonly TEL: "tel";
    /** URL input with URL validation */
    readonly URL: "url";
    /** Search input */
    readonly SEARCH: "search";
    /** Multiline text input (textarea) */
    readonly MULTILINE: "multiline";
};
/** TextField event constants */
declare const TEXT_FIELD_EVENTS: {
    /** Emitted on native input change; setValue() is silent */
    readonly CHANGE: "change";
    /** Fired during input */
    readonly INPUT: "input";
    /** Fired when text field receives focus */
    readonly FOCUS: "focus";
    /** Fired when text field loses focus */
    readonly BLUR: "blur";
    /** Fired when the trailing icon button is activated (`trailingIconLabel`) */
    readonly TRAILING: "trailing";
    /** Legacy name, not emitted; listen for keydown on the input and check key === "Enter" */
    readonly ENTER: "enter";
    /** Native input event only; not emitted through on() */
    readonly KEYDOWN: "keydown";
    /** Native input event only; not emitted through on() */
    readonly KEYUP: "keyup";
};
/** TextField density constants */
declare const TEXT_FIELD_DENSITY: {
    /** Default density (56px height) */
    readonly DEFAULT: "default";
    /** Compact density (40px height) */
    readonly COMPACT: "compact";
};
/** Default text field configuration values */
declare const TEXT_FIELD_DEFAULTS: {
    /** Default input type */
    readonly TYPE: "text";
    /** Default visual variant */
    readonly VARIANT: "filled";
    /** Default density level */
    readonly DENSITY: "default";
    /** Default disabled state */
    readonly DISABLED: false;
    /** Default required state */
    readonly REQUIRED: false;
    /** Default error state */
    readonly ERROR: false;
    /** Default label floating behavior (always floats on focus) */
    readonly FLOAT_LABEL: true;
    /** Default animation duration in milliseconds */
    readonly ANIMATION_DURATION: 150;
};
/** CSS class names used by the text field component */
declare const TEXT_FIELD_CLASSES: {
    /** Root element class */
    readonly ROOT: "text-field";
    /** Input element class */
    readonly INPUT: "text-field__input";
    /** Label element class */
    readonly LABEL: "text-field__label";
    /** Reserved slot; the current component has no separate container element. */
    readonly CONTAINER: "text-field__container";
    /** Filled variant class */
    readonly FILLED: "text-field--filled";
    /** Outlined variant class */
    readonly OUTLINED: "text-field--outlined";
    /** Focused state class */
    readonly FOCUSED: "text-field--focused";
    /** Disabled state class */
    readonly DISABLED: "text-field--disabled";
    /** Error state class */
    readonly ERROR: "text-field--error";
    /** Required indicator class */
    readonly REQUIRED: "text-field--required";
    /** Supporting text class */
    readonly SUPPORTING_TEXT: "text-field__helper";
    /** Supporting text error class */
    readonly SUPPORTING_TEXT_ERROR: "text-field__helper--error";
    /** Leading icon class */
    readonly LEADING_ICON: "text-field__leading-icon";
    /** Trailing icon class */
    readonly TRAILING_ICON: "text-field__trailing-icon";
    /** Prefix text class */
    readonly PREFIX_TEXT: "text-field__prefix";
    /** Suffix text class */
    readonly SUFFIX_TEXT: "text-field__suffix";
    /** Outline of the outlined variant, drawn in three segments */
    readonly OUTLINE: "text-field__outline";
    /** Outline segment before the label (start corner) */
    readonly OUTLINE_LEADING: "text-field__outline-leading";
    /** Outline segment the floating label sits in */
    readonly OUTLINE_NOTCH: "text-field__outline-notch";
    /** Outline segment after the label */
    readonly OUTLINE_TRAILING: "text-field__outline-trailing";
    /** Outline whose notch is open around the floating label */
    readonly OUTLINE_NOTCHED: "text-field__outline--notched";
    /** Outlined field laid out right to left, from its computed direction */
    readonly RTL: "text-field--rtl";
    /** Multiline class */
    readonly MULTILINE: "text-field--multiline";
};
export { TEXT_FIELD_VARIANTS, TEXT_FIELD_STATES, TEXT_FIELD_TYPES, TEXT_FIELD_EVENTS, TEXT_FIELD_DENSITY, TEXT_FIELD_DEFAULTS, TEXT_FIELD_CLASSES, };
