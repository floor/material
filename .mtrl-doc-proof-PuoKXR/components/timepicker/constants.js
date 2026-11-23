export const TIMEPICKER_TYPES = {
    DIAL: 'dial',
    INPUT: 'input'
};
export const TIMEPICKER_ORIENTATIONS = {
    VERTICAL: 'vertical',
    HORIZONTAL: 'horizontal'
};
export const TIMEPICKER_FORMATS = {
    AMPM: '12h',
    MILITARY: '24h'
};
export const TIMEPICKER_PERIODS = {
    AM: 'AM',
    PM: 'PM'
};
export const TIMEPICKER_EVENTS = {
    CHANGE: 'change',
    INPUT: 'input',
    OPEN: 'open',
    CLOSE: 'close',
    CONFIRM: 'confirm',
    CANCEL: 'cancel'
};
export const TIMEPICKER_VALUES = {
    HOURS_12: Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i)),
    HOURS_24: Array.from({ length: 24 }, (_, i) => i),
    MINUTES: Array.from({ length: 60 }, (_, i) => i),
    SECONDS: Array.from({ length: 60 }, (_, i) => i)
};
export const TIMEPICKER_SELECTORS = {
    CONTAINER: '.mtrl-time-picker',
    DIALOG: '.mtrl-time-picker__dialog',
    TITLE: '.mtrl-time-picker__title',
    CONTENT: '.mtrl-time-picker__content',
    DIAL: '.mtrl-time-picker__dial',
    DIAL_FACE: '.mtrl-time-picker__dial-face',
    DIAL_CENTER: '.mtrl-time-picker__dial-centre',
    DIAL_NUMBERS: '.mtrl-time-picker__dial-numbers',
    DIAL_NUMBER: '.mtrl-time-picker__dial-number',
    INPUT_CONTAINER: '.mtrl-time-picker__input-container',
    HOURS_INPUT: '.mtrl-time-picker__hours',
    MINUTES_INPUT: '.mtrl-time-picker__minutes',
    SECONDS_INPUT: '.mtrl-time-picker__seconds',
    SEPARATOR: '.mtrl-time-picker__separator',
    PERIOD_CONTAINER: '.mtrl-time-picker__period',
    PERIOD_AM: '.mtrl-time-picker__period-am',
    PERIOD_PM: '.mtrl-time-picker__period-pm',
    ACTIONS: '.mtrl-time-picker__actions',
    TOGGLE_TYPE_BUTTON: '.mtrl-time-picker__toggle-type',
    CANCEL_BUTTON: '.mtrl-time-picker__cancel',
    CONFIRM_BUTTON: '.mtrl-time-picker__confirm'
};
export const TIMEPICKER_ICONS = {
    CLOCK: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>`,
    KEYBOARD: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
    <line x1="6" y1="8" x2="6" y2="8"></line>
    <line x1="10" y1="8" x2="10" y2="8"></line>
    <line x1="14" y1="8" x2="14" y2="8"></line>
    <line x1="18" y1="8" x2="18" y2="8"></line>
    <line x1="6" y1="12" x2="6" y2="12"></line>
    <line x1="10" y1="12" x2="10" y2="12"></line>
    <line x1="14" y1="12" x2="14" y2="12"></line>
    <line x1="18" y1="12" x2="18" y2="12"></line>
    <line x1="6" y1="16" x2="18" y2="16"></line>
  </svg>`
};
export const TIMEPICKER_DEFAULTS = {
    TYPE: TIMEPICKER_TYPES.DIAL,
    FORMAT: TIMEPICKER_FORMATS.AMPM,
    ORIENTATION: TIMEPICKER_ORIENTATIONS.VERTICAL,
    SHOW_SECONDS: false,
    MINUTE_STEP: 1,
    SECOND_STEP: 1,
    CANCEL_TEXT: 'Cancel',
    CONFIRM_TEXT: 'OK',
    OPEN: false,
    CLOCK_ICON: TIMEPICKER_ICONS.CLOCK,
    KEYBOARD_ICON: TIMEPICKER_ICONS.KEYBOARD
};
