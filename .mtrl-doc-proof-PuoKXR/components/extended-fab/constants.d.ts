/** Extended FAB variants following Material Design 3 guidelines */
export declare const EXTENDED_FAB_VARIANTS: {
    /** Primary container colour (default) */
    readonly PRIMARY_CONTAINER: "primary-container";
    /** Secondary container colour */
    readonly SECONDARY_CONTAINER: "secondary-container";
    /** Tertiary container colour */
    readonly TERTIARY_CONTAINER: "tertiary-container";
    /** Primary tone colour */
    readonly PRIMARY: "primary";
    /** Secondary tone colour */
    readonly SECONDARY: "secondary";
    /** Tertiary tone colour */
    readonly TERTIARY: "tertiary";
};
/** Expressive extended FAB sizes. */
export declare const EXTENDED_FAB_SIZES: {
    readonly SMALL: "small";
    readonly MEDIUM: "medium";
    readonly LARGE: "large";
};
/** Extended FAB width behavior */
export declare const EXTENDED_FAB_WIDTH: {
    /** Maintains a constant width regardless of content (default) */
    readonly FIXED: "fixed";
    /** Adjusts width based on content length */
    readonly FLUID: "fluid";
};
/** Extended FAB position on the screen */
export declare const EXTENDED_FAB_POSITIONS: {
    /** Position in the top-right corner */
    readonly TOP_RIGHT: "top-right";
    /** Position in the top-left corner */
    readonly TOP_LEFT: "top-left";
    /** Position in the bottom-right corner (most common for primary actions) */
    readonly BOTTOM_RIGHT: "bottom-right";
    /** Position in the bottom-left corner */
    readonly BOTTOM_LEFT: "bottom-left";
};
/** Icon position options */
export declare const EXTENDED_FAB_ICON_POSITIONS: {
    /** Icon appears before the text (default) */
    readonly START: "start";
    /** Icon appears after the text */
    readonly END: "end";
};
/** Extended FAB CSS classes */
export declare const EXTENDED_FAB_CLASSES: {
    /** Root element class */
    readonly ROOT: "extended-fab";
    /** Class for the icon container */
    readonly ICON: "extended-fab__icon";
    /** Class for the text container */
    readonly TEXT: "extended-fab__text";
    /** Applied to fixed width FABs */
    readonly FIXED: "extended-fab--fixed";
    /** Applied to fluid width FABs */
    readonly FLUID: "extended-fab--fluid";
    /** Applied when FAB is lowered (pressed state) */
    readonly LOWERED: "extended-fab--lowered";
    /** Applied when FAB is collapsed to a regular FAB */
    readonly COLLAPSED: "extended-fab--collapsed";
    /** Applied when icon is positioned at the end */
    readonly ICON_END: "extended-fab--icon-end";
};
/** Button types for Extended FAB */
export declare const EXTENDED_FAB_TYPES: {
    readonly BUTTON: "button";
    readonly SUBMIT: "submit";
    readonly RESET: "reset";
};
/** Default animations for Extended FAB */
export declare const EXTENDED_FAB_ANIMATIONS: {
    /** Entrance animation duration in milliseconds */
    readonly ENTRANCE_DURATION: 250;
    /** Collapse/expand animation duration in milliseconds */
    readonly COLLAPSE_DURATION: 200;
};
