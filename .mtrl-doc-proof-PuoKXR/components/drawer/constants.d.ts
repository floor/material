/** Drawer variants matching MD3 navigation drawer specification */
export declare const DRAWER_VARIANTS: {
    /** Standard drawer — inline, can be permanently visible or toggled */
    readonly STANDARD: "standard";
    /** Modal drawer — overlays content with scrim, for compact/medium screens */
    readonly MODAL: "modal";
};
/** Drawer positions (anchor edge) */
export declare const DRAWER_POSITIONS: {
    /** Start edge (left in LTR, right in RTL) — default per MD3 */
    readonly START: "start";
    /** End edge (right in LTR, left in RTL) */
    readonly END: "end";
};
/** Drawer item types for the items configuration array */
export declare const DRAWER_ITEM_TYPES: {
    /** Navigation destination item */
    readonly ITEM: "item";
    /** Visual separator between groups */
    readonly DIVIDER: "divider";
    /** Section label / subhead for grouping */
    readonly SECTION: "section";
};
/** Drawer events */
export declare const DRAWER_EVENTS: {
    /** Fired when the drawer opens */
    readonly OPEN: "open";
    /** Fired when the drawer closes */
    readonly CLOSE: "close";
    /** Fired when a navigation item is selected */
    readonly SELECT: "select";
    readonly EXPAND: "expand";
    readonly COLLAPSE: "collapse";
};
/** CSS classes used by the drawer component */
export declare const DRAWER_CLASSES: {
    /** Root container */
    readonly ROOT: "drawer";
    /** Scrim overlay (modal variant only) */
    readonly SCRIM: "drawer__scrim";
    /** Inner sheet / panel */
    readonly SHEET: "drawer__sheet";
    /** Headline text */
    readonly HEADLINE: "drawer__headline";
    /** Scrollable items container */
    readonly ITEMS: "drawer__items";
    /** Single navigation item */
    readonly ITEM: "drawer__item";
    /** Item icon */
    readonly ITEM_ICON: "drawer__item-icon";
    /** Item label text */
    readonly ITEM_LABEL: "drawer__item-label";
    /** Item badge */
    readonly ITEM_BADGE: "drawer__item-badge";
    readonly GROUP: "drawer__group";
    readonly GROUP_ITEMS: "drawer__group-items";
    readonly GROUP_ITEMS_INNER: "drawer__group-items-inner";
    readonly ITEM_EXPANDABLE: "drawer__item--expandable";
    readonly ITEM_EXPANDED: "drawer__item--expanded";
    readonly ITEM_CHILD: "drawer__item--child";
    readonly ITEM_HAS_ACTIVE: "drawer__item--has-active";
    readonly ITEM_CHEVRON: "drawer__item-chevron";
    /** Active indicator shape */
    readonly ACTIVE_INDICATOR: "drawer__active-indicator";
    /** Dense/compact variant */
    readonly DENSE: "drawer--dense";
    /** Divider separator */
    readonly DIVIDER: "drawer__divider";
    /** Section label */
    readonly SECTION_LABEL: "drawer__section-label";
};
/** Default animation configuration */
export declare const DRAWER_ANIMATION: {
    /** Animation duration in milliseconds */
    readonly DURATION: 300;
    /** Easing for opening */
    readonly EASING_OPEN: "cubic-bezier(0.0, 0.0, 0.2, 1.0)";
    /** Easing for closing */
    readonly EASING_CLOSE: "cubic-bezier(0.3, 0.0, 1.0, 1.0)";
};
/** Drawer default values */
export declare const DRAWER_DEFAULTS: {
    /** Default variant */
    readonly VARIANT: "standard";
    /** Default position */
    readonly POSITION: "start";
    /** Whether drawer is open by default */
    readonly OPEN: false;
    /** Whether modal can be dismissed via scrim */
    readonly DISMISSIBLE: true;
    /** Default drawer width in pixels */
    readonly WIDTH: 360;
    /** Whether items ripple on press */
    readonly RIPPLE: true;
};
