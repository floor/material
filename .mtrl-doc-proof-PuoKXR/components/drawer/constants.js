export const DRAWER_VARIANTS = {
    STANDARD: "standard",
    MODAL: "modal",
};
export const DRAWER_POSITIONS = {
    START: "start",
    END: "end",
};
export const DRAWER_ITEM_TYPES = {
    ITEM: "item",
    DIVIDER: "divider",
    SECTION: "section",
};
export const DRAWER_EVENTS = {
    OPEN: "open",
    CLOSE: "close",
    SELECT: "select",
    EXPAND: "expand",
    COLLAPSE: "collapse",
};
export const DRAWER_CLASSES = {
    ROOT: "drawer",
    SCRIM: "drawer__scrim",
    SHEET: "drawer__sheet",
    HEADLINE: "drawer__headline",
    ITEMS: "drawer__items",
    ITEM: "drawer__item",
    ITEM_ICON: "drawer__item-icon",
    ITEM_LABEL: "drawer__item-label",
    ITEM_BADGE: "drawer__item-badge",
    GROUP: "drawer__group",
    GROUP_ITEMS: "drawer__group-items",
    GROUP_ITEMS_INNER: "drawer__group-items-inner",
    ITEM_EXPANDABLE: "drawer__item--expandable",
    ITEM_EXPANDED: "drawer__item--expanded",
    ITEM_CHILD: "drawer__item--child",
    ITEM_HAS_ACTIVE: "drawer__item--has-active",
    ITEM_CHEVRON: "drawer__item-chevron",
    ACTIVE_INDICATOR: "drawer__active-indicator",
    DENSE: "drawer--dense",
    DIVIDER: "drawer__divider",
    SECTION_LABEL: "drawer__section-label",
};
export const DRAWER_ANIMATION = {
    DURATION: 300,
    EASING_OPEN: "cubic-bezier(0.0, 0.0, 0.2, 1.0)",
    EASING_CLOSE: "cubic-bezier(0.3, 0.0, 1.0, 1.0)",
};
export const DRAWER_DEFAULTS = {
    VARIANT: DRAWER_VARIANTS.STANDARD,
    POSITION: DRAWER_POSITIONS.START,
    OPEN: false,
    DISMISSIBLE: true,
    WIDTH: 360,
    RIPPLE: true,
};
