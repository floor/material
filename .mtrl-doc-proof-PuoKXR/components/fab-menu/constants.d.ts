/** Colour sets (m3.material.io FAB menu specs): the close button takes the role, the items its container role. */
export declare const FAB_MENU_COLORS: {
    readonly PRIMARY: "primary";
    readonly SECONDARY: "secondary";
    readonly TERTIARY: "tertiary";
};
export type FabMenuColor = (typeof FAB_MENU_COLORS)[keyof typeof FAB_MENU_COLORS];
/** The FAB sizes a menu opens from: not small, not extended. */
export declare const FAB_MENU_SIZES: {
    readonly DEFAULT: "default";
    readonly MEDIUM: "medium";
    readonly LARGE: "large";
};
export type FabMenuSize = (typeof FAB_MENU_SIZES)[keyof typeof FAB_MENU_SIZES];
/** How the menu presents its items: */
export declare const FAB_MENU_PRESENTATIONS: {
    readonly AUTO: "auto";
    readonly LIST: "list";
    readonly MENU: "menu";
};
export type FabMenuPresentation = (typeof FAB_MENU_PRESENTATIONS)[keyof typeof FAB_MENU_PRESENTATIONS];
/** Where the menu sits in its positioned container, or in the flow. */
export declare const FAB_MENU_PLACEMENTS: {
    readonly NONE: "none";
    readonly BOTTOM_END: "bottom-end";
    readonly BOTTOM_START: "bottom-start";
};
export type FabMenuPlacement = (typeof FAB_MENU_PLACEMENTS)[keyof typeof FAB_MENU_PLACEMENTS];
/** The window width, in px, from which `auto` presents the baseline menu (medium windows). */
export declare const FAB_MENU_MENU_FROM = 600;
/** The spec's item count: a menu of 2 to 6 related actions. */
export declare const FAB_MENU_ITEMS: {
    readonly MIN: 2;
    readonly MAX: 6;
};
/** The space between the list and the close button (FabMenuBaselineTokens.CloseButtonBetweenSpace). */
export declare const FAB_MENU_LIST_GAP = 8;
/** The gap between the FAB and a baseline menu (m3.material.io FAB menu specs, web). */
export declare const FAB_MENU_MENU_GAP = 4;
/** How long the items take to leave after the last one starts: FastSpatial, the longest of an item's transitions. */
export declare const FAB_MENU_ITEM_EXIT = 425;
export declare const FAB_MENU_EVENTS: {
    readonly OPEN: "open";
    readonly CLOSE: "close";
    readonly SELECT: "select";
};
