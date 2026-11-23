export const BUTTON_GROUP_VARIANTS = {
    FILLED: 'filled',
    TONAL: 'tonal',
    OUTLINED: 'outlined',
    ELEVATED: 'elevated',
    TEXT: 'text'
};
export const BUTTON_GROUP_ORIENTATIONS = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
};
export const BUTTON_GROUP_DENSITY = {
    DEFAULT: 'default',
    COMFORTABLE: 'comfortable',
    COMPACT: 'compact'
};
export const BUTTON_GROUP_EVENTS = {
    CLICK: 'click',
    FOCUS: 'focus',
    BLUR: 'blur',
    CHANGE: 'change'
};
export const BUTTON_GROUP_KINDS = {
    STANDARD: 'standard',
    CONNECTED: 'connected'
};
export const BUTTON_GROUP_SELECTION = {
    NONE: 'none',
    SINGLE: 'single',
    MULTI: 'multi'
};
export const BUTTON_GROUP_SHAPES = {
    ROUND: 'round',
    SQUARE: 'square'
};
export const BUTTON_GROUP_SIZES = {
    XS: 'xs',
    S: 's',
    M: 'm',
    L: 'l',
    XL: 'xl'
};
export const BUTTON_GROUP_SIZE_TOKENS = {
    xs: { height: 32, icon: 20, standardGap: 18, connectedCorner: 4, connectedStep: "extra-small" },
    s: { height: 40, icon: 20, standardGap: 12, connectedCorner: 8, connectedStep: "small" },
    m: { height: 56, icon: 24, standardGap: 8, connectedCorner: 8, connectedStep: "small" },
    l: { height: 96, icon: 32, standardGap: 8, connectedCorner: 16, connectedStep: "large" },
    xl: { height: 136, icon: 40, standardGap: 8, connectedCorner: 20, connectedStep: "large-increased" }
};
export const BUTTON_GROUP_CONNECTED_GAP = 2;
export const BUTTON_GROUP_CONNECTED_PRESSED_CORNER = 4;
export const BUTTON_GROUP_CONNECTED_MIN_WIDTH = 48;
export const BUTTON_GROUP_EXPANDED_RATIO = 0.15;
export const BUTTON_GROUP_COMPRESSION_LIMIT = 24;
export const BUTTON_GROUP_DENSITY_STEP = 4;
export const BUTTON_GROUP_LABELS = {
    ALWAYS: 'always',
    SELECTED: 'selected'
};
export const BUTTON_GROUP_DEFAULTS = {
    KIND: BUTTON_GROUP_KINDS.STANDARD,
    SELECTION: BUTTON_GROUP_SELECTION.NONE,
    SHAPE: BUTTON_GROUP_SHAPES.ROUND,
    SIZE: BUTTON_GROUP_SIZES.S,
    LABELS: BUTTON_GROUP_LABELS.ALWAYS,
    VARIANT: BUTTON_GROUP_VARIANTS.OUTLINED,
    ORIENTATION: BUTTON_GROUP_ORIENTATIONS.HORIZONTAL,
    DENSITY: BUTTON_GROUP_DENSITY.DEFAULT,
    RIPPLE: true,
    EQUAL_WIDTH: false,
    RIPPLE_DURATION: 300
};
export const BUTTON_GROUP_CLASSES = {
    ROOT: 'button-group',
    BUTTON: 'button-group__button',
    FIRST: 'button-group__button--first',
    LAST: 'button-group__button--last',
    MIDDLE: 'button-group__button--middle',
    SINGLE: 'button-group__button--single',
    DISABLED: 'button-group--disabled',
    HORIZONTAL: 'button-group--horizontal',
    VERTICAL: 'button-group--vertical',
    EQUAL_WIDTH: 'button-group--equal-width',
    FILLED: 'button-group--filled',
    TONAL: 'button-group--tonal',
    OUTLINED: 'button-group--outlined',
    ELEVATED: 'button-group--elevated',
    TEXT: 'button-group--text',
    DENSITY_DEFAULT: 'button-group--density-default',
    DENSITY_COMFORTABLE: 'button-group--density-comfortable',
    DENSITY_COMPACT: 'button-group--density-compact'
};
