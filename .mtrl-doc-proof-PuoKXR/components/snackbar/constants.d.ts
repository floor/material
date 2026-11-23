/** Where the snackbar sits along the bottom edge */
export declare const SNACKBAR_POSITIONS: {
    /** Centred (default) */
    readonly CENTER: "center";
    /** Against the leading edge */
    readonly START: "start";
    /** Against the trailing edge */
    readonly END: "end";
};
/** Duration presets (Compose Material 3 `SnackbarDuration`) */
export declare const SNACKBAR_DURATIONS: {
    /** 4 seconds, the default without an action */
    readonly SHORT: "short";
    /** 10 seconds */
    readonly LONG: "long";
    /** Stays until acted on or dismissed, the default with an action */
    readonly INDEFINITE: "indefinite";
};
/** Milliseconds behind the presets; 0 means no auto-dismiss */
export declare const SNACKBAR_DURATION_MS: {
    readonly short: 4000;
    readonly long: 10000;
    readonly indefinite: 0;
};
/** Snackbar visibility states */
export declare const SNACKBAR_STATES: {
    readonly VISIBLE: "visible";
    readonly HIDDEN: "hidden";
};
/** Snackbar queue behaviors Controls how a newly shown snackbar interacts with the one currently on screen and any still waiting in the queue. */
export declare const SNACKBAR_QUEUE_BEHAVIORS: {
    /** Wait in line: shown one at a time, in order (default) */
    readonly QUEUE: "queue";
    /** Replace: dismiss the current snackbar, drop any pending ones, and show */
    readonly REPLACE: "replace";
};
/** Snackbar event types */
export declare const SNACKBAR_EVENTS: {
    /** The snackbar is on screen */
    readonly OPEN: "open";
    /** The snackbar is leaving; the event carries the reason */
    readonly CLOSE: "close";
    /** The action button was clicked */
    readonly ACTION: "action";
    /** Fired with `close`; the queue listens to it */
    readonly DISMISS: "dismiss";
    /** The keyboard shortcut moved focus to the action button */
    readonly FOCUS: "focus";
};
/** Why a snackbar closed */
export declare const SNACKBAR_CLOSE_REASONS: {
    /** The duration ran out */
    readonly TIMEOUT: "timeout";
    /** The action was clicked */
    readonly ACTION: "action";
    /** The close icon was clicked */
    readonly CLOSE_BUTTON: "close-button";
    /** Escape was pressed while focus was inside */
    readonly ESCAPE: "escape";
    /** `hide()` was called */
    readonly API: "api";
    /** The queue replaced or cleared it */
    readonly QUEUE: "queue";
};
/** Default configuration values for snackbar */
export declare const SNACKBAR_DEFAULTS: {
    /** Default display position */
    readonly POSITION: "center";
    /** Default queue behavior */
    readonly QUEUE_BEHAVIOR: "queue";
    /** Delay in milliseconds between a dismissed snackbar and the next one */
    readonly QUEUE_GAP: 200;
    /** Accessible name of the close icon */
    readonly CLOSE_LABEL: "Dismiss";
    /** The key that moves focus to an actionable snackbar's action */
    readonly FOCUS_SHORTCUT: "F8";
    /** The longest of the exit transitions, after which the element is */
    readonly ANIMATION_DURATION: 425;
    /** An action wider than this moves below the text */
    readonly ACTION_INLINE_MAX_WIDTH: 128;
};
/** CSS class names used by the snackbar component, without the prefix */
export declare const SNACKBAR_CLASSES: {
    readonly ROOT: "snackbar";
    readonly CENTER: "snackbar--center";
    readonly START: "snackbar--start";
    readonly END: "snackbar--end";
    readonly VISIBLE: "snackbar--visible";
    /** An action is present */
    readonly WITH_ACTION: "snackbar--with-action";
    /** A close icon is present */
    readonly DISMISSIBLE: "snackbar--dismissible";
    /** The action is too wide to sit beside the text */
    readonly ACTION_BELOW: "snackbar--action-below";
    readonly TEXT: "snackbar__text";
    readonly ACTION: "snackbar__action";
    readonly CLOSE: "snackbar__close";
};
/** The close icon (Material Symbols "close") */
export declare const SNACKBAR_CLOSE_ICON: string;
