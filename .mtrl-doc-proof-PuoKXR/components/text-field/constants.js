const TEXT_FIELD_VARIANTS = {
    FILLED: "filled",
    OUTLINED: "outlined",
};
const TEXT_FIELD_STATES = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    DISABLED: "disabled",
};
const TEXT_FIELD_TYPES = {
    TEXT: "text",
    PASSWORD: "password",
    EMAIL: "email",
    NUMBER: "number",
    TEL: "tel",
    URL: "url",
    SEARCH: "search",
    MULTILINE: "multiline",
};
const TEXT_FIELD_EVENTS = {
    CHANGE: "change",
    INPUT: "input",
    FOCUS: "focus",
    BLUR: "blur",
    TRAILING: "trailing",
    ENTER: "enter",
    KEYDOWN: "keydown",
    KEYUP: "keyup",
};
const TEXT_FIELD_DENSITY = {
    DEFAULT: "default",
    COMPACT: "compact",
};
const TEXT_FIELD_DEFAULTS = {
    TYPE: TEXT_FIELD_TYPES.TEXT,
    VARIANT: TEXT_FIELD_VARIANTS.FILLED,
    DENSITY: TEXT_FIELD_DENSITY.DEFAULT,
    DISABLED: false,
    REQUIRED: false,
    ERROR: false,
    FLOAT_LABEL: true,
    ANIMATION_DURATION: 150,
};
const TEXT_FIELD_CLASSES = {
    ROOT: "text-field",
    INPUT: "text-field__input",
    LABEL: "text-field__label",
    CONTAINER: "text-field__container",
    FILLED: "text-field--filled",
    OUTLINED: "text-field--outlined",
    FOCUSED: "text-field--focused",
    DISABLED: "text-field--disabled",
    ERROR: "text-field--error",
    REQUIRED: "text-field--required",
    SUPPORTING_TEXT: "text-field__helper",
    SUPPORTING_TEXT_ERROR: "text-field__helper--error",
    LEADING_ICON: "text-field__leading-icon",
    TRAILING_ICON: "text-field__trailing-icon",
    PREFIX_TEXT: "text-field__prefix",
    SUFFIX_TEXT: "text-field__suffix",
    OUTLINE: "text-field__outline",
    OUTLINE_LEADING: "text-field__outline-leading",
    OUTLINE_NOTCH: "text-field__outline-notch",
    OUTLINE_TRAILING: "text-field__outline-trailing",
    OUTLINE_NOTCHED: "text-field__outline--notched",
    RTL: "text-field--rtl",
    MULTILINE: "text-field--multiline",
};
export { TEXT_FIELD_VARIANTS, TEXT_FIELD_STATES, TEXT_FIELD_TYPES, TEXT_FIELD_EVENTS, TEXT_FIELD_DENSITY, TEXT_FIELD_DEFAULTS, TEXT_FIELD_CLASSES, };
