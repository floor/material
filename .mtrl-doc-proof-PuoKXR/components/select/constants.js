export const SELECT_VARIANTS = {
    FILLED: 'filled',
    OUTLINED: 'outlined'
};
export const SELECT_PLACEMENT = {
    BOTTOM_START: 'bottom-start',
    BOTTOM: 'bottom',
    BOTTOM_END: 'bottom-end',
    TOP_START: 'top-start',
    TOP: 'top',
    TOP_END: 'top-end'
};
export const SELECT_INTERACTION = {
    MOUSE: 'mouse',
    KEYBOARD: 'keyboard'
};
export const SELECT_EVENTS = {
    CHANGE: 'change',
    OPEN: 'open',
    CLOSE: 'close'
};
export const SELECT_ICONS = {
    DROPDOWN: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M7 10l5 5 5-5z"/></svg>',
    CHECKMARK: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
};
export const SELECT_DEFAULTS = {
    VARIANT: SELECT_VARIANTS.FILLED,
    PLACEMENT: SELECT_PLACEMENT.BOTTOM_START,
    LABEL: 'Select',
    VALUE: '',
    REQUIRED: false,
    DISABLED: false,
    SUPPORTING_TEXT: '',
    ERROR: false
};
export const SELECT_CLASSES = {
    CONTAINER: 'select',
    TEXT_FIELD: 'select__text-field',
    DROPDOWN_ICON: 'select__dropdown-icon',
    MENU: 'select__menu',
    MENU_ITEM: 'select__menu-item',
    MENU_ITEM_SELECTED: 'select__menu-item--selected',
    MENU_ITEM_DISABLED: 'select__menu-item--disabled',
    MENU_ITEM_CHECKMARK: 'select__menu-item-checkmark',
    MENU_ITEM_ICON: 'select__menu-item-icon',
    MENU_ITEM_TEXT: 'select__menu-item-text',
    FILLED: 'select--filled',
    OUTLINED: 'select--outlined',
    OPEN: 'select--open',
    DISABLED: 'select--disabled',
    REQUIRED: 'select--required',
    ERROR: 'select--error'
};
