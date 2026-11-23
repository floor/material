/** IconButton variants following Material Design 3 guidelines */
export declare const ICON_BUTTON_VARIANTS: {
    /** Primary action button with solid background (highest emphasis) */
    readonly FILLED: "filled";
    /** Secondary action button with tonal background (high emphasis) */
    readonly TONAL: "tonal";
    /** Button with outline border and transparent background (medium emphasis) */
    readonly OUTLINED: "outlined";
    /** Button with no background, just icon (lowest emphasis) */
    readonly STANDARD: "standard";
};
/** IconButton variant type */
export type IconButtonVariant = typeof ICON_BUTTON_VARIANTS[keyof typeof ICON_BUTTON_VARIANTS];
/** IconButton sizes following Material Design 3 specifications */
export declare const ICON_BUTTON_SIZES: {
    /** Extra small - 32px container, 20px icon */
    readonly XS: "xs";
    /** Small - 40px container, 24px icon (default) */
    readonly S: "s";
    /** Medium - 56px container, 24px icon */
    readonly M: "m";
    /** Large - 96px container, 32px icon */
    readonly L: "l";
    /** Extra large - 136px container, 40px icon */
    readonly XL: "xl";
};
/** IconButton size type */
export type IconButtonSize = typeof ICON_BUTTON_SIZES[keyof typeof ICON_BUTTON_SIZES];
/** IconButton shapes following Material Design 3 specifications */
export declare const ICON_BUTTON_SHAPES: {
    /** Round shape - full corner radius (default) */
    readonly ROUND: "round";
    /** Square shape - fixed corner radius based on size */
    readonly SQUARE: "square";
};
/** IconButton shape type */
export type IconButtonShape = typeof ICON_BUTTON_SHAPES[keyof typeof ICON_BUTTON_SHAPES];
/** IconButton width variants following Material Design 3 specifications */
export declare const ICON_BUTTON_WIDTHS: {
    /** Narrow width */
    readonly NARROW: "narrow";
    /** Default width */
    readonly DEFAULT: "default";
    /** Wide width */
    readonly WIDE: "wide";
};
/** IconButton width type */
export type IconButtonWidth = typeof ICON_BUTTON_WIDTHS[keyof typeof ICON_BUTTON_WIDTHS];
/** Button types for IconButton */
export declare const ICON_BUTTON_TYPES: {
    readonly BUTTON: "button";
    readonly SUBMIT: "submit";
    readonly RESET: "reset";
};
/** CSS classes used by the IconButton component */
export declare const ICON_BUTTON_CLASSES: {
    /** Root element class */
    readonly ROOT: "icon-button";
    /** Class for the icon container */
    readonly ICON: "icon-button__icon";
    /** Applied when button is selected (toggle state) */
    readonly SELECTED: "icon-button--selected";
    /** Applied when button is disabled */
    readonly DISABLED: "icon-button--disabled";
    /** Applied when button is pressed (for shape morph) */
    readonly PRESSED: "icon-button--pressed";
};
/** Default ripple effect configuration for IconButton */
export declare const DEFAULT_RIPPLE_CONFIG: {
    readonly DURATION: 450;
};
/** Corner radius values for square shape per size (in dp) */
export declare const ICON_BUTTON_CORNER_RADIUS: {
    readonly XS: {
        readonly square: 12;
        readonly pressed: 8;
    };
    readonly S: {
        readonly square: 12;
        readonly pressed: 8;
    };
    readonly M: {
        readonly square: 16;
        readonly pressed: 12;
    };
    readonly L: {
        readonly square: 28;
        readonly pressed: 16;
    };
    readonly XL: {
        readonly square: 28;
        readonly pressed: 16;
    };
};
/** Icon sizes per button size (in dp) */
export declare const ICON_BUTTON_ICON_SIZES: {
    readonly XS: 20;
    readonly S: 24;
    readonly M: 24;
    readonly L: 32;
    readonly XL: 40;
};
/** Container sizes per button size (in dp) */
export declare const ICON_BUTTON_CONTAINER_SIZES: {
    readonly XS: 32;
    readonly S: 40;
    readonly M: 56;
    readonly L: 96;
    readonly XL: 136;
};
/** Width values per size and width variant (in dp) */
export declare const ICON_BUTTON_WIDTH_VALUES: {
    readonly XS: {
        readonly narrow: 28;
        readonly default: 32;
        readonly wide: 40;
    };
    readonly S: {
        readonly narrow: 32;
        readonly default: 40;
        readonly wide: 52;
    };
    readonly M: {
        readonly narrow: 48;
        readonly default: 56;
        readonly wide: 72;
    };
    readonly L: {
        readonly narrow: 64;
        readonly default: 96;
        readonly wide: 128;
    };
    readonly XL: {
        readonly narrow: 104;
        readonly default: 136;
        readonly wide: 184;
    };
};
