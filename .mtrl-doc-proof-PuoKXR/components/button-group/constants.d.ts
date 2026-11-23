/** Button group variants */
export declare const BUTTON_GROUP_VARIANTS: {
    /** Primary action buttons with solid background */
    readonly FILLED: "filled";
    /** Secondary action buttons with medium emphasis */
    readonly TONAL: "tonal";
    /** Buttons with outline border (default for button groups per MD3) */
    readonly OUTLINED: "outlined";
    /** Buttons with slight elevation/shadow */
    readonly ELEVATED: "elevated";
    /** Text-only buttons without background or border */
    readonly TEXT: "text";
};
/** Button group orientations */
export declare const BUTTON_GROUP_ORIENTATIONS: {
    /** Buttons arranged horizontally (default) */
    readonly HORIZONTAL: "horizontal";
    /** Buttons arranged vertically */
    readonly VERTICAL: "vertical";
};
/** Density levels for button groups */
export declare const BUTTON_GROUP_DENSITY: {
    /** Default size with standard spacing (40px height) */
    readonly DEFAULT: "default";
    /** Reduced size and spacing (36px height) */
    readonly COMFORTABLE: "comfortable";
    /** Minimal size and spacing (32px height) */
    readonly COMPACT: "compact";
};
/** Button group events */
export declare const BUTTON_GROUP_EVENTS: {
    /** Fired when any button in the group is clicked */
    readonly CLICK: "click";
    /** Fired when a button receives focus */
    readonly FOCUS: "focus";
    /** Fired when a button loses focus */
    readonly BLUR: "blur";
    /** Fired when the selection changes (selection groups) */
    readonly CHANGE: "change";
};
/** Material 3 button group kinds */
export declare const BUTTON_GROUP_KINDS: {
    readonly STANDARD: "standard";
    readonly CONNECTED: "connected";
};
/** Selection behaviour of the group */
export declare const BUTTON_GROUP_SELECTION: {
    readonly NONE: "none";
    readonly SINGLE: "single";
    readonly MULTI: "multi";
};
export declare const BUTTON_GROUP_SHAPES: {
    readonly ROUND: "round";
    readonly SQUARE: "square";
};
export declare const BUTTON_GROUP_SIZES: {
    readonly XS: "xs";
    readonly S: "s";
    readonly M: "m";
    readonly L: "l";
    readonly XL: "xl";
};
/** Material 3 button group tokens per size (dp): container height, button */
export declare const BUTTON_GROUP_SIZE_TOKENS: {
    readonly xs: {
        readonly height: 32;
        readonly icon: 20;
        readonly standardGap: 18;
        readonly connectedCorner: 4;
        readonly connectedStep: "extra-small";
    };
    readonly s: {
        readonly height: 40;
        readonly icon: 20;
        readonly standardGap: 12;
        readonly connectedCorner: 8;
        readonly connectedStep: "small";
    };
    readonly m: {
        readonly height: 56;
        readonly icon: 24;
        readonly standardGap: 8;
        readonly connectedCorner: 8;
        readonly connectedStep: "small";
    };
    readonly l: {
        readonly height: 96;
        readonly icon: 32;
        readonly standardGap: 8;
        readonly connectedCorner: 16;
        readonly connectedStep: "large";
    };
    readonly xl: {
        readonly height: 136;
        readonly icon: 40;
        readonly standardGap: 8;
        readonly connectedCorner: 20;
        readonly connectedStep: "large-increased";
    };
};
/** Connected groups use 2dp between buttons at every size */
export declare const BUTTON_GROUP_CONNECTED_GAP = 2;
/** Connected pressed inner corner: extra-small (ConnectedButtonGroupSmallTokens.PressedInnerCornerCornerSize) */
export declare const BUTTON_GROUP_CONNECTED_PRESSED_CORNER = 4;
/** Connected xs and s groups keep a 48dp minimum width per button */
export declare const BUTTON_GROUP_CONNECTED_MIN_WIDTH = 48;
/** Standard groups: a pressed button widens by this share of its width and */
export declare const BUTTON_GROUP_EXPANDED_RATIO = 0.15;
/** The most a neighbour gives up when a button in a standard group is pressed: the trailing content padding of a button (Compose ButtonGroup compression limit, ButtonDefaults.ContentPadding end, BaselineButtonTokens.TrailingSpace). */
export declare const BUTTON_GROUP_COMPRESSION_LIMIT = 24;
/** Density reduces the container height by 4dp per step */
export declare const BUTTON_GROUP_DENSITY_STEP = 4;
/** Default configuration values */
/** Label display in selection groups */
export declare const BUTTON_GROUP_LABELS: {
    readonly ALWAYS: "always";
    readonly SELECTED: "selected";
};
export declare const BUTTON_GROUP_DEFAULTS: {
    readonly KIND: "standard";
    readonly SELECTION: "none";
    readonly SHAPE: "round";
    readonly SIZE: "s";
    readonly LABELS: "always";
    /** Default variant (outlined per MD3 button group specs) */
    readonly VARIANT: "outlined";
    /** Default orientation */
    readonly ORIENTATION: "horizontal";
    /** Default density level */
    readonly DENSITY: "default";
    /** Whether ripple effect is enabled by default */
    readonly RIPPLE: true;
    /** Whether buttons have equal width by default */
    readonly EQUAL_WIDTH: false;
    /** Default ripple animation duration in milliseconds */
    readonly RIPPLE_DURATION: 300;
};
/** CSS classes for button group elements */
export declare const BUTTON_GROUP_CLASSES: {
    /** Container element */
    readonly ROOT: "button-group";
    /** Individual button within group */
    readonly BUTTON: "button-group__button";
    /** First button in group */
    readonly FIRST: "button-group__button--first";
    /** Last button in group */
    readonly LAST: "button-group__button--last";
    /** Middle buttons (neither first nor last) */
    readonly MIDDLE: "button-group__button--middle";
    /** Single button (only one in group) */
    readonly SINGLE: "button-group__button--single";
    /** Disabled state */
    readonly DISABLED: "button-group--disabled";
    /** Horizontal orientation */
    readonly HORIZONTAL: "button-group--horizontal";
    /** Vertical orientation */
    readonly VERTICAL: "button-group--vertical";
    /** Equal width buttons */
    readonly EQUAL_WIDTH: "button-group--equal-width";
    /** Filled variant */
    readonly FILLED: "button-group--filled";
    /** Tonal variant */
    readonly TONAL: "button-group--tonal";
    /** Outlined variant */
    readonly OUTLINED: "button-group--outlined";
    /** Elevated variant */
    readonly ELEVATED: "button-group--elevated";
    /** Text variant */
    readonly TEXT: "button-group--text";
    /** Default density */
    readonly DENSITY_DEFAULT: "button-group--density-default";
    /** Comfortable density */
    readonly DENSITY_COMFORTABLE: "button-group--density-comfortable";
    /** Compact density */
    readonly DENSITY_COMPACT: "button-group--density-compact";
};
