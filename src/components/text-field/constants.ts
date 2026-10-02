// src/components/text-field/constants.ts

/**
 * TextField variant constants
 * @category Components
 */
const TEXT_FIELD_VARIANTS = {
  /** Filled variant with background and animated label */
  FILLED: "filled",
  /** Outlined variant with border and animated label */
  OUTLINED: "outlined",
} as const;

/**
 * TextField state constants
 * @category Components
 */
const TEXT_FIELD_STATES = {
  /** TextField is active (focused) */
  ACTIVE: "active",
  /** TextField is inactive (not focused) */
  INACTIVE: "inactive",
  /** TextField is disabled */
  DISABLED: "disabled",
} as const;

/**
 * TextField type constants
 * @category Components
 */
const TEXT_FIELD_TYPES = {
  /** Standard text input */
  TEXT: "text",
  /** Password input with obscured characters */
  PASSWORD: "password",
  /** Email input with email validation */
  EMAIL: "email",
  /** Numeric input */
  NUMBER: "number",
  /** Telephone number input */
  TEL: "tel",
  /** URL input with URL validation */
  URL: "url",
  /** Search input */
  SEARCH: "search",
  /** Multiline text input (textarea) */
  MULTILINE: "multiline",
} as const;

/**
 * TextField event constants
 * @category Components
 */
const TEXT_FIELD_EVENTS = {
  /** Emitted on native input change; setValue() is silent */
  CHANGE: "change",
  /** Fired during input */
  INPUT: "input",
  /** Fired when text field receives focus */
  FOCUS: "focus",
  /** Fired when text field loses focus */
  BLUR: "blur",
  /** Fired when the trailing icon button is activated (`trailingIconLabel`; FLO-301) */
  TRAILING: "trailing",
  /** Legacy name, not emitted; listen for keydown on the input and check key === "Enter" */
  ENTER: "enter",
  /** Native input event only; not emitted through on() */
  KEYDOWN: "keydown",
  /** Native input event only; not emitted through on() */
  KEYUP: "keyup",
} as const;

/**
 * TextField density constants
 * @category Components
 */
const TEXT_FIELD_DENSITY = {
  /** Default density (56px height) */
  DEFAULT: "default",
  /** Compact density (40px height) */
  COMPACT: "compact",
} as const;

/**
 * Default text field configuration values
 * @category Components
 */
const TEXT_FIELD_DEFAULTS = {
  /** Default input type */
  TYPE: TEXT_FIELD_TYPES.TEXT,
  /** Default visual variant */
  VARIANT: TEXT_FIELD_VARIANTS.FILLED,
  /** Default density level */
  DENSITY: TEXT_FIELD_DENSITY.DEFAULT,
  /** Default disabled state */
  DISABLED: false,
  /** Default required state */
  REQUIRED: false,
  /** Default error state */
  ERROR: false,
  /** Default label floating behavior (always floats on focus) */
  FLOAT_LABEL: true,
  /** Default animation duration in milliseconds */
  ANIMATION_DURATION: 150,
} as const;

/**
 * CSS class names used by the text field component
 * @category Components
 */
const TEXT_FIELD_CLASSES = {
  /** Root element class */
  ROOT: "text-field",
  /** Input element class */
  INPUT: "text-field__input",
  /** Label element class */
  LABEL: "text-field__label",
  /** Reserved slot; the current component has no separate container element. */
  CONTAINER: "text-field__container",
  /** Filled variant class */
  FILLED: "text-field--filled",
  /** Outlined variant class */
  OUTLINED: "text-field--outlined",
  /** Focused state class */
  FOCUSED: "text-field--focused",
  /** Disabled state class */
  DISABLED: "text-field--disabled",
  /** Error state class */
  ERROR: "text-field--error",
  /** Required indicator class */
  REQUIRED: "text-field--required",
  /** Supporting text class */
  SUPPORTING_TEXT: "text-field__helper",
  /** Supporting text error class */
  SUPPORTING_TEXT_ERROR: "text-field__helper--error",
  /** Leading icon class */
  LEADING_ICON: "text-field__leading-icon",
  /** Trailing icon class */
  TRAILING_ICON: "text-field__trailing-icon",
  /** Prefix text class */
  PREFIX_TEXT: "text-field__prefix",
  /** Suffix text class */
  SUFFIX_TEXT: "text-field__suffix",
  /** Outline of the outlined variant, drawn in three segments */
  OUTLINE: "text-field__outline",
  /** Outline segment before the label (start corner) */
  OUTLINE_LEADING: "text-field__outline-leading",
  /** Outline segment the floating label sits in */
  OUTLINE_NOTCH: "text-field__outline-notch",
  /** Outline segment after the label */
  OUTLINE_TRAILING: "text-field__outline-trailing",
  /** Outline whose notch is open around the floating label */
  OUTLINE_NOTCHED: "text-field__outline--notched",
  /** Outlined field laid out right to left, from its computed direction */
  RTL: "text-field--rtl",
  /** Multiline class */
  MULTILINE: "text-field--multiline",
} as const;

// Every exported identifier writes "text field" as two words (FLO-383); the
// values (class names, event strings) are unchanged.
export {
  TEXT_FIELD_VARIANTS,
  TEXT_FIELD_STATES,
  TEXT_FIELD_TYPES,
  TEXT_FIELD_EVENTS,
  TEXT_FIELD_DENSITY,
  TEXT_FIELD_DEFAULTS,
  TEXT_FIELD_CLASSES,
};
