export const SPLIT_BUTTON_VARIANTS = {
    FILLED: "filled",
    TONAL: "tonal",
    OUTLINED: "outlined",
    ELEVATED: "elevated",
};
export const SPLIT_BUTTON_SIZES = {
    XS: "xs",
    S: "s",
    M: "m",
    L: "l",
    XL: "xl",
};
export const SPLIT_BUTTON_EVENTS = {
    CLICK: "click",
    EXPAND: "expand",
    COLLAPSE: "collapse",
    CHANGE: "change",
    SELECT: "select",
};
export const SPLIT_BUTTON_DEFAULTS = {
    VARIANT: SPLIT_BUTTON_VARIANTS.FILLED,
    SIZE: SPLIT_BUTTON_SIZES.S,
    TRAILING_LABEL: "More options",
    MENU_OFFSET: 4,
};
export const SPLIT_BUTTON_CLASSES = {
    ROOT: "split-button",
    LEADING: "split-button__leading",
    TRAILING: "split-button__trailing",
    CHEVRON: "split-button__chevron",
    EXPANDED: "split-button--expanded",
};
export const SPLIT_BUTTON_CHEVRON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">' +
    '<path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>';
