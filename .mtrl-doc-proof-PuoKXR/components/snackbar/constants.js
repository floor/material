export const SNACKBAR_POSITIONS = {
    CENTER: 'center',
    START: 'start',
    END: 'end'
};
export const SNACKBAR_DURATIONS = {
    SHORT: 'short',
    LONG: 'long',
    INDEFINITE: 'indefinite'
};
export const SNACKBAR_DURATION_MS = {
    short: 4000,
    long: 10000,
    indefinite: 0
};
export const SNACKBAR_STATES = {
    VISIBLE: 'visible',
    HIDDEN: 'hidden'
};
export const SNACKBAR_QUEUE_BEHAVIORS = {
    QUEUE: 'queue',
    REPLACE: 'replace'
};
export const SNACKBAR_EVENTS = {
    OPEN: 'open',
    CLOSE: 'close',
    ACTION: 'action',
    DISMISS: 'dismiss',
    FOCUS: 'focus'
};
export const SNACKBAR_CLOSE_REASONS = {
    TIMEOUT: 'timeout',
    ACTION: 'action',
    CLOSE_BUTTON: 'close-button',
    ESCAPE: 'escape',
    API: 'api',
    QUEUE: 'queue'
};
export const SNACKBAR_DEFAULTS = {
    POSITION: SNACKBAR_POSITIONS.CENTER,
    QUEUE_BEHAVIOR: SNACKBAR_QUEUE_BEHAVIORS.QUEUE,
    QUEUE_GAP: 200,
    CLOSE_LABEL: 'Dismiss',
    FOCUS_SHORTCUT: 'F8',
    ANIMATION_DURATION: 425,
    ACTION_INLINE_MAX_WIDTH: 128
};
export const SNACKBAR_CLASSES = {
    ROOT: 'snackbar',
    CENTER: 'snackbar--center',
    START: 'snackbar--start',
    END: 'snackbar--end',
    VISIBLE: 'snackbar--visible',
    WITH_ACTION: 'snackbar--with-action',
    DISMISSIBLE: 'snackbar--dismissible',
    ACTION_BELOW: 'snackbar--action-below',
    TEXT: 'snackbar__text',
    ACTION: 'snackbar__action',
    CLOSE: 'snackbar__close'
};
export const SNACKBAR_CLOSE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="24" height="24" fill="currentColor" aria-hidden="true">' +
    '<path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>';
