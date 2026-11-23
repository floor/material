/** Select variants */
export declare const SELECT_VARIANTS: {
    /** Filled select field with solid background */
    readonly FILLED: "filled";
    /** Outlined select field with border */
    readonly OUTLINED: "outlined";
};
/** Select menu placement options */
export declare const SELECT_PLACEMENT: {
    /** Menu appears below the select field, aligned to the left edge */
    readonly BOTTOM_START: "bottom-start";
    /** Menu appears below the select field, centered */
    readonly BOTTOM: "bottom";
    /** Menu appears below the select field, aligned to the right edge */
    readonly BOTTOM_END: "bottom-end";
    /** Menu appears above the select field, aligned to the left edge */
    readonly TOP_START: "top-start";
    /** Menu appears above the select field, centered */
    readonly TOP: "top";
    /** Menu appears above the select field, aligned to the right edge */
    readonly TOP_END: "top-end";
};
/** Select interaction types */
export declare const SELECT_INTERACTION: {
    /** Interaction via mouse or touch */
    readonly MOUSE: "mouse";
    /** Interaction via keyboard */
    readonly KEYBOARD: "keyboard";
};
/** Select event names */
export declare const SELECT_EVENTS: {
    /** Fired when selected option changes */
    readonly CHANGE: "change";
    /** Fired when options menu opens */
    readonly OPEN: "open";
    /** Fired when options menu closes */
    readonly CLOSE: "close";
};
/** Default icons for select */
export declare const SELECT_ICONS: {
    /** Dropdown arrow icon */
    readonly DROPDOWN: "<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"M0 0h24v24H0z\" fill=\"none\"/><path d=\"M7 10l5 5 5-5z\"/></svg>";
    /** Checkmark icon for selected item */
    readonly CHECKMARK: "<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"M0 0h24v24H0z\" fill=\"none\"/><path d=\"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z\"/></svg>";
};
/** Default configuration values */
export declare const SELECT_DEFAULTS: {
    /** Default variant */
    readonly VARIANT: "filled";
    /** Default menu placement */
    readonly PLACEMENT: "bottom-start";
    /** Default label */
    readonly LABEL: "Select";
    /** Default value */
    readonly VALUE: "";
    /** Whether the select is required by default */
    readonly REQUIRED: false;
    /** Whether the select is disabled by default */
    readonly DISABLED: false;
    /** Default supporting text */
    readonly SUPPORTING_TEXT: "";
    /** Whether in error state by default */
    readonly ERROR: false;
};
/** CSS classes for select elements */
export declare const SELECT_CLASSES: {
    /** Container element */
    readonly CONTAINER: "select";
    /** The text field (the key is two words; the value is select__text-field) */
    readonly TEXT_FIELD: "select__text-field";
    /** Dropdown icon */
    readonly DROPDOWN_ICON: "select__dropdown-icon";
    /** Menu container */
    readonly MENU: "select__menu";
    /** Menu item */
    readonly MENU_ITEM: "select__menu-item";
    /** Selected menu item */
    readonly MENU_ITEM_SELECTED: "select__menu-item--selected";
    /** Disabled menu item */
    readonly MENU_ITEM_DISABLED: "select__menu-item--disabled";
    /** Menu item checkmark */
    readonly MENU_ITEM_CHECKMARK: "select__menu-item-checkmark";
    /** Menu item icon */
    readonly MENU_ITEM_ICON: "select__menu-item-icon";
    /** Menu item text */
    readonly MENU_ITEM_TEXT: "select__menu-item-text";
    /** Filled variant */
    readonly FILLED: "select--filled";
    /** Outlined variant */
    readonly OUTLINED: "select--outlined";
    /** Open state */
    readonly OPEN: "select--open";
    /** Disabled state */
    readonly DISABLED: "select--disabled";
    /** Required state */
    readonly REQUIRED: "select--required";
    /** Error state */
    readonly ERROR: "select--error";
};
