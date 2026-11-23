/** Tab component variants */
export declare const TAB_VARIANTS: {
    /** Primary tabs */
    readonly PRIMARY: "primary";
    /** Secondary tabs */
    readonly SECONDARY: "secondary";
};
/** Tab states */
export declare const TAB_STATES: {
    /** Tab is currently active */
    readonly ACTIVE: "active";
    /** Tab is not currently active */
    readonly INACTIVE: "inactive";
    /** Tab is disabled */
    readonly DISABLED: "disabled";
};
/** Tab indicator width strategies */
export declare const TAB_INDICATOR_WIDTH_STRATEGIES: {
    /** Fixed width defined by fixedWidth */
    readonly FIXED: "fixed";
    /** Half the tab width */
    readonly DYNAMIC: "dynamic";
    /** Match the text content width */
    readonly CONTENT: "content";
    /** Adapts based on variant (primary: text width, secondary: full tab width) */
    readonly AUTO: "auto";
};
/** Tab events */
export declare const TAB_EVENTS: {
    /** Fired when a tab is clicked */
    readonly CLICK: "click";
    /** Fired when a tab receives focus */
    readonly FOCUS: "focus";
    /** Fired when a tab loses focus */
    readonly BLUR: "blur";
};
/** Tabs component events */
export declare const TABS_EVENTS: {
    /** Fired when the active tab changes */
    readonly CHANGE: "change";
};
/** Default values for tabs component */
export declare const TABS_DEFAULTS: {
    /** Default tab variant */
    readonly VARIANT: "primary";
    /** Whether tabs are horizontally scrollable */
    readonly SCROLLABLE: true;
    /** Whether to show a divider below the tabs */
    readonly SHOW_DIVIDER: true;
    /** Default indicator width strategy */
    readonly INDICATOR_WIDTH_STRATEGY: "auto";
    /** Default fixed width for fixed indicator in pixels */
    readonly INDICATOR_FIXED_WIDTH: 40;
    /** Whether to enable ripple effect on tabs */
    readonly RIPPLE: true;
};
/** Tab layout types */
export declare const TAB_LAYOUT: {
    /** Icon-only tab layout */
    readonly ICON_ONLY: "icon-only";
    /** Text-only tab layout */
    readonly TEXT_ONLY: "text-only";
    /** Icon and text layout */
    readonly ICON_AND_TEXT: "icon-and-text";
};
/** CSS class names used by the tabs component */
export declare const TABS_CLASSES: {
    /** Root element class */
    readonly ROOT: "tabs";
    /** Root element with primary variant */
    readonly PRIMARY: "tabs--primary";
    /** Root element with secondary variant */
    readonly SECONDARY: "tabs--secondary";
    /** Root element with scrollable tabs */
    readonly SCROLLABLE: "tabs--scrollable";
    /** Scroll container element */
    readonly SCROLL: "tabs__scroll";
    /** Divider element */
    readonly DIVIDER: "tabs__divider";
    /** Indicator element */
    readonly INDICATOR: "tabs__indicator";
};
/** CSS class names used by the tab component */
export declare const TAB_CLASSES: {
    /** Root element class */
    readonly ROOT: "tab";
    /** Active state class */
    readonly ACTIVE: "tab--active";
    /** Inactive state class */
    readonly INACTIVE: "tab--inactive";
    /** Disabled state class */
    readonly DISABLED: "tab--disabled";
    /** Text content container */
    readonly TEXT: "button__text";
    /** Icon container */
    readonly ICON: "button__icon";
    /** Ripple effect container */
    readonly RIPPLE: "ripple";
    /** Root element with primary variant */
    readonly PRIMARY: "tab--primary";
    /** Root element with secondary variant */
    readonly SECONDARY: "tab--secondary";
    /** Container for text and icon */
    readonly CONTAINER: "tab__container";
    /** Badge container */
    readonly BADGE: "badge";
};
