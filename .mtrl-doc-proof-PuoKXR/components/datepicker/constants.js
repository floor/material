export const DATEPICKER_VARIANTS = {
    DOCKED: 'docked',
    MODAL: 'modal',
    MODAL_INPUT: 'modal-input'
};
export const DATEPICKER_VIEWS = {
    DAY: 'day',
    MONTH: 'month',
    YEAR: 'year'
};
export const DATEPICKER_SELECTION_MODES = {
    SINGLE: 'single',
    RANGE: 'range'
};
export const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const MONTH_NAMES = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
];
export const MONTH_NAMES_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr',
    'May', 'Jun', 'Jul', 'Aug',
    'Sep', 'Oct', 'Nov', 'Dec'
];
export const DEFAULT_DATE_FORMAT = 'MM/DD/YYYY';
export const DATEPICKER_CLASSES = {
    ROOT: 'datepicker',
    INPUT: 'datepicker__input',
    CALENDAR: 'datepicker__calendar',
    HEADER: 'datepicker__header',
    NAVIGATION: 'datepicker__navigation',
    WEEKDAYS: 'datepicker__weekdays',
    DAYS: 'datepicker__days',
    DAY: 'datepicker__day',
    TODAY: 'datepicker__day--today',
    SELECTED: 'datepicker__day--selected',
    DISABLED: 'datepicker__day--disabled',
    OUTSIDE_MONTH: 'datepicker__day--outside',
    RANGE_START: 'datepicker__cell--range-start',
    RANGE_END: 'datepicker__cell--range-end',
    RANGE_MIDDLE: 'datepicker__cell--range'
};
export const DATEPICKER_EVENTS = {
    CHANGE: 'change',
    OPEN: 'open',
    CLOSE: 'close',
    SELECT: 'select',
    VIEW_CHANGE: 'viewChange'
};
export const DATEPICKER_ICONS = {
    calendar: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2ZM5 10h14v10H5V10Zm0-4h14v2H5V6Zm2 6h4v4H7v-4Z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="m3 17.25 11.06-11.06 3.75 3.75L6.75 21H3v-3.75ZM20.71 7.04l-1.83 1.83-3.75-3.75 1.83-1.83a1 1 0 0 1 1.41 0l2.34 2.34a1 1 0 0 1 0 1.41Z"/></svg>',
    previous: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="m15.4 7.4-1.4-1.4-6 6 6 6 1.4-1.4-4.6-4.6Z"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="m8.6 7.4 1.4-1.4 6 6-6 6-1.4-1.4 4.6-4.6Z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12Z"/></svg>',
};
