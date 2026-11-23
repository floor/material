/** Menu position options for alignment relative to opener element */
/** Menu variants The baseline menu is the original M3 design: square-ish corners, a surface-container container, and items that fill the width. */
export declare const MENU_VARIANTS: {
    /** The original M3 baseline menu */
    readonly BASELINE: "baseline";
    /** The M3 expressive vertical menu (default) */
    readonly VERTICAL: "vertical";
};
/** Colour mappings for the vertical menu Standard is surface-based and carries lower emphasis; vibrant is tertiary-based, is more prominent, and should be used sparingly (m3.material.io menu guidelines, "Color options"). */
export declare const MENU_COLORS: {
    readonly STANDARD: "standard";
    readonly VIBRANT: "vibrant";
};
export declare const MENU_POSITION: {
    /** Places menu below the opener, aligned to left edge */
    readonly BOTTOM_START: "bottom-start";
    /** Places menu below the opener, centered */
    readonly BOTTOM: "bottom";
    /** Places menu below the opener, aligned to right edge */
    readonly BOTTOM_END: "bottom-end";
    /** Places menu above the opener, aligned to left edge */
    readonly TOP_START: "top-start";
    /** Places menu above the opener, centered */
    readonly TOP: "top";
    /** Places menu above the opener, aligned to right edge */
    readonly TOP_END: "top-end";
    /** Places menu to the right of the opener, aligned to top edge */
    readonly RIGHT_START: "right-start";
    /** Places menu to the right of the opener, centered */
    readonly RIGHT: "right";
    /** Places menu to the right of the opener, aligned to bottom edge */
    readonly RIGHT_END: "right-end";
    /** Places menu to the left of the opener, aligned to top edge */
    readonly LEFT_START: "left-start";
    /** Places menu to the left of the opener, centered */
    readonly LEFT: "left";
    /** Places menu to the left of the opener, aligned to bottom edge */
    readonly LEFT_END: "left-end";
};
/** Default configuration values for menus */
export declare const MENU_DEFAULTS: {
    /** Default variant; the M3 expressive vertical menu */
    readonly VARIANT: "vertical";
    /** Default colour mapping for the vertical variant */
    readonly COLOR: "standard";
    /** Default menu position */
    readonly POSITION: "bottom-start";
    /** Default offset from the opener (in pixels) */
    readonly OFFSET: 0;
    /** Close menu when an item is selected */
    readonly CLOSE_ON_SELECT: true;
    /** Close menu when clicking outside */
    readonly CLOSE_ON_CLICK_OUTSIDE: true;
    /** Close menu when escape key is pressed */
    readonly CLOSE_ON_ESCAPE: true;
    /** Open submenus on hover */
    readonly OPEN_SUBMENU_ON_HOVER: true;
    /** Automatically flip menu position to stay in viewport */
    readonly AUTO_FLIP: true;
};
/** Interaction types for menu opening/closing */
export declare const MENU_INTERACTION_TYPES: {
    /** Interaction via mouse or touch */
    readonly MOUSE: "mouse";
    /** Interaction via keyboard */
    readonly KEYBOARD: "keyboard";
};
/** Menu item types */
export declare const MENU_ITEM_TYPES: {
    /** Standard interactive menu item */
    readonly ITEM: "item";
    /** Non-interactive dividing line */
    readonly DIVIDER: "divider";
};
/** Menu event names */
export declare const MENU_EVENTS: {
    /** Fired when the menu is opened */
    readonly OPEN: "open";
    /** Fired when the menu is closed */
    readonly CLOSE: "close";
    /** Fired when a menu item is selected */
    readonly SELECT: "select";
};
/** CSS classes for menu elements */
export declare const MENU_CLASSES: {
    /** Menu container */
    readonly CONTAINER: "menu";
    /** Visible menu */
    readonly VISIBLE: "menu--visible";
    /** Menu inner container */
    readonly INNER: "menu__inner";
    /** Individual menu item */
    readonly ITEM: "menu__item";
    /** Disabled menu item */
    readonly ITEM_DISABLED: "menu__item--disabled";
    /** Selected menu item */
    readonly ITEM_SELECTED: "menu__item--selected";
    /** Menu item with submenu */
    readonly ITEM_HAS_SUBMENU: "menu__item--has-submenu";
    /** Divider */
    readonly DIVIDER: "menu__divider";
    /** Item icon */
    readonly ITEM_ICON: "menu__item-icon";
    /** Item text */
    readonly ITEM_TEXT: "menu__item-text";
    /** Item keyboard shortcut */
    readonly ITEM_SHORTCUT: "menu__item-shortcut";
    /** Submenu indicator */
    readonly SUBMENU_INDICATOR: "menu__submenu-indicator";
    /** Dense/compact variant */
    readonly DENSE: "menu--dense";
};
