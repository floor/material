// src/components/radios/constants.ts

/**
 * Radio states for styling and behavior
 */
export const RADIO_STATES = {
  /** Radio is selected */
  CHECKED: 'checked',
  /** Radio is not selected */
  UNCHECKED: 'unchecked',
  /** Radio is disabled */
  DISABLED: 'disabled',
  /** Radio has keyboard focus */
  FOCUSED: 'focused'
} as const;

/**
 * Radio layout directions
 */
export const RADIO_DIRECTIONS = {
  /** Radios stacked vertically */
  VERTICAL: 'vertical',
  /** Radios arranged horizontally */
  HORIZONTAL: 'horizontal'
} as const;




/**
 * Radio events
 */
export const RADIO_EVENTS = {
  /** Fired when a radio button is selected */
  CHANGE: 'change',
  /** Native input focus event; listen on the input, not the group emitter. */
  FOCUS: 'focus',
  /** Native input blur event; listen on the input, not the group emitter. */
  BLUR: 'blur'
} as const;

/**
 * Default configuration values
 */
export const RADIO_DEFAULTS = {
  /** Default radio variant */
  VARIANT: 'standard',
  /** Default radio direction */
  DIRECTION: RADIO_DIRECTIONS.VERTICAL,
  /** Default label position */
  LABEL_POSITION: 'right',
  /** Default radio size */
  SIZE: 'medium'
} as const;

