/** Visual styles, the same set the button offers */
export declare const SPLIT_BUTTON_VARIANTS: {
    readonly FILLED: "filled";
    readonly TONAL: "tonal";
    readonly OUTLINED: "outlined";
    readonly ELEVATED: "elevated";
};
/** Sizes, matching the button and icon button scale */
export declare const SPLIT_BUTTON_SIZES: {
    readonly XS: "xs";
    readonly S: "s";
    readonly M: "m";
    readonly L: "l";
    readonly XL: "xl";
};
/** Events the component emits */
export declare const SPLIT_BUTTON_EVENTS: {
    /** The leading button was activated */
    readonly CLICK: "click";
    /** The trailing button opened whatever it opens */
    readonly EXPAND: "expand";
    /** The trailing button closed it */
    readonly COLLAPSE: "collapse";
    /** Either of the two, carrying the new state */
    readonly CHANGE: "change";
    /** A menu item was chosen, when the component owns a menu */
    readonly SELECT: "select";
};
/** Defaults */
export declare const SPLIT_BUTTON_DEFAULTS: {
    readonly VARIANT: "filled";
    readonly SIZE: "s";
    /** Accessible name of the trailing button when none is given */
    readonly TRAILING_LABEL: "More options";
    /** How far the menu sits from the button (M3 split button guidelines) */
    readonly MENU_OFFSET: 4;
};
/** CSS class names, without the prefix */
export declare const SPLIT_BUTTON_CLASSES: {
    readonly ROOT: "split-button";
    readonly LEADING: "split-button__leading";
    readonly TRAILING: "split-button__trailing";
    readonly CHEVRON: "split-button__chevron";
    readonly EXPANDED: "split-button--expanded";
};
/** The trailing button's icon. */
export declare const SPLIT_BUTTON_CHEVRON: string;
