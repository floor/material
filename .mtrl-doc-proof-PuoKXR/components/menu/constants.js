export const MENU_VARIANTS = {
    BASELINE: "baseline",
    VERTICAL: "vertical",
};
export const MENU_COLORS = {
    STANDARD: "standard",
    VIBRANT: "vibrant",
};
export const MENU_POSITION = {
    BOTTOM_START: "bottom-start",
    BOTTOM: "bottom",
    BOTTOM_END: "bottom-end",
    TOP_START: "top-start",
    TOP: "top",
    TOP_END: "top-end",
    RIGHT_START: "right-start",
    RIGHT: "right",
    RIGHT_END: "right-end",
    LEFT_START: "left-start",
    LEFT: "left",
    LEFT_END: "left-end",
};
export const MENU_DEFAULTS = {
    VARIANT: MENU_VARIANTS.VERTICAL,
    COLOR: MENU_COLORS.STANDARD,
    POSITION: MENU_POSITION.BOTTOM_START,
    OFFSET: 0,
    CLOSE_ON_SELECT: true,
    CLOSE_ON_CLICK_OUTSIDE: true,
    CLOSE_ON_ESCAPE: true,
    OPEN_SUBMENU_ON_HOVER: true,
    AUTO_FLIP: true,
};
export const MENU_INTERACTION_TYPES = {
    MOUSE: "mouse",
    KEYBOARD: "keyboard",
};
export const MENU_ITEM_TYPES = {
    ITEM: "item",
    DIVIDER: "divider",
};
export const MENU_EVENTS = {
    OPEN: "open",
    CLOSE: "close",
    SELECT: "select",
};
export const MENU_CLASSES = {
    CONTAINER: "menu",
    VISIBLE: "menu--visible",
    INNER: "menu__inner",
    ITEM: "menu__item",
    ITEM_DISABLED: "menu__item--disabled",
    ITEM_SELECTED: "menu__item--selected",
    ITEM_HAS_SUBMENU: "menu__item--has-submenu",
    DIVIDER: "menu__divider",
    ITEM_ICON: "menu__item-icon",
    ITEM_TEXT: "menu__item-text",
    ITEM_SHORTCUT: "menu__item-shortcut",
    SUBMENU_INDICATOR: "menu__submenu-indicator",
    DENSE: "menu--dense",
};
