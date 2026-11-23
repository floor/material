/** FAB variants following Material Design 3 guidelines */
export declare const FAB_VARIANTS: {
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
/** FAB size variants */
export declare const FAB_SIZES: {
    /** 56px diameter, for standard primary actions (default) */
    readonly DEFAULT: "default";
    /** 80px diameter with a 28px icon */
    readonly MEDIUM: "medium";
    /** 96px diameter, for emphasis or touch-focused interfaces */
    readonly LARGE: "large";
};
/** FAB position options */
export declare const FAB_POSITIONS: {
    /** Position in the top-right corner */
    readonly TOP_RIGHT: "top-right";
    /** Position in the top-left corner */
    readonly TOP_LEFT: "top-left";
    /** Position in the bottom-right corner (most common for primary actions) */
    readonly BOTTOM_RIGHT: "bottom-right";
    /** Position in the bottom-left corner */
    readonly BOTTOM_LEFT: "bottom-left";
};
/** FAB CSS classes */
export declare const FAB_CLASSES: {
    /** Root element class */
    readonly ROOT: "fab";
    /** Class for the icon container */
    readonly ICON: "fab__icon";
    /** Applied when FAB is lowered (pressed state) */
    readonly LOWERED: "fab--lowered";
    /** Applied to medium FABs */
    readonly MEDIUM: "fab--medium";
    /** Applied to large FABs */
    readonly LARGE: "fab--large";
};
/** Button types for FAB */
export declare const FAB_TYPES: {
    readonly BUTTON: "button";
    readonly SUBMIT: "submit";
    readonly RESET: "reset";
};
/** Default icon sizes based on FAB size */
export declare const FAB_ICON_SIZES: {
    readonly DEFAULT: "24px";
    readonly MEDIUM: "28px";
    readonly LARGE: "32px";
};
/** Default animations for FAB */
export declare const FAB_ANIMATIONS: {
    /** Entrance animation duration in milliseconds */
    readonly ENTRANCE_DURATION: 250;
};
