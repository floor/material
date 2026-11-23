/** Button variants */
export declare const BUTTON_VARIANTS: {
    /** Primary action button with solid background (high emphasis) */
    readonly FILLED: "filled";
    /** Secondary action button with medium emphasis */
    readonly TONAL: "tonal";
    /** Button with outline border and transparent background */
    readonly OUTLINED: "outlined";
    /** Button with slight elevation/shadow */
    readonly ELEVATED: "elevated";
    /** Button that appears as text without background or border (low emphasis) */
    readonly TEXT: "text";
};
/** Available button size variants matching MD3 specifications */
export declare const BUTTON_SIZES: {
    /** Extra small size - 32px height */
    readonly XS: "xs";
    /** Small size - 40px height (default) */
    readonly S: "s";
    /** Medium size - 56px height */
    readonly M: "m";
    /** Large size - 96px height */
    readonly L: "l";
    /** Extra large size - 136px height */
    readonly XL: "xl";
};
/** Button size type */
export type ButtonSize = keyof typeof BUTTON_SIZES;
/** Available button shape variants */
export declare const BUTTON_SHAPES: {
    /** Round shape - pill-shaped buttons (default) */
    readonly ROUND: "round";
    /** Square shape - buttons with size-specific corner radius */
    readonly SQUARE: "square";
};
/** Button shape type */
export type ButtonShape = keyof typeof BUTTON_SHAPES;
/** Default button types */
export declare const BUTTON_TYPES: {
    readonly BUTTON: "button";
    readonly SUBMIT: "submit";
    readonly RESET: "reset";
};
/** CSS classes used by the button component */
export declare const BUTTON_CLASSES: {
    readonly ROOT: "button";
    readonly ICON: "button__icon";
    readonly TEXT: "button__text";
    readonly ACTIVE: "button--active";
    readonly DISABLED: "button--disabled";
};
/** Default ripple effect configuration */
export declare const DEFAULT_RIPPLE_CONFIG: {
    readonly DURATION: 450;
};
