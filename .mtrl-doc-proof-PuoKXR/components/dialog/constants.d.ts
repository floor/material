/** Dialog sizes */
export declare const DIALOG_SIZES: {
    /** 320px width, for simple messages or choices */
    readonly SMALL: "small";
    /** 560px width, for standard forms or content (default) */
    readonly MEDIUM: "medium";
    /** 800px width, for complex forms or rich content */
    readonly LARGE: "large";
    /** Spans the full width of the viewport with margins */
    readonly FULLWIDTH: "fullwidth";
    /** Takes up the entire viewport (similar to a new page) */
    readonly FULLSCREEN: "fullscreen";
};
/** Dialog animation types */
export declare const DIALOG_ANIMATIONS: {
    /** Scale up/down animation from center (default) */
    readonly SCALE: "scale";
    /** Slide in from bottom, slide out to bottom */
    readonly SLIDE_UP: "slide-up";
    /** Slide in from top, slide out to top */
    readonly SLIDE_DOWN: "slide-down";
    /** Simple fade in/out animation */
    readonly FADE: "fade";
};
/** Footer alignment options */
export declare const DIALOG_FOOTER_ALIGNMENTS: {
    /** Align buttons to the right (default, follows Material Design guidelines) */
    readonly RIGHT: "right";
    /** Align buttons to the left */
    readonly LEFT: "left";
    /** Center buttons in footer */
    readonly CENTER: "center";
    /** Space buttons evenly, with first button at left, last at right */
    readonly SPACE_BETWEEN: "space-between";
};
/** Dialog events */
export declare const DIALOG_EVENTS: {
    /** Fired when the dialog begins opening */
    readonly OPEN: "open";
    /** Fired when the dialog begins closing */
    readonly CLOSE: "close";
    /** Fired before the dialog starts opening (can be prevented) */
    readonly BEFORE_OPEN: "beforeopen";
    /** Fired before the dialog starts closing (can be prevented) */
    readonly BEFORE_CLOSE: "beforeclose";
    /** Fired after the dialog has fully opened (animation complete) */
    readonly AFTER_OPEN: "afteropen";
    /** Fired after the dialog has fully closed (animation complete) */
    readonly AFTER_CLOSE: "afterclose";
};
/** Dialog CSS classes */
export declare const DIALOG_CLASSES: {
    /** Root dialog element */
    readonly ROOT: "dialog";
    /** Overlay background */
    readonly OVERLAY: "dialog__overlay";
    /** Dialog container */
    readonly CONTAINER: "dialog__container";
    /** Dialog header */
    readonly HEADER: "dialog__header";
    /** Dialog title */
    readonly TITLE: "dialog__title";
    /** Dialog subtitle */
    readonly SUBTITLE: "dialog__subtitle";
    /** Close button */
    readonly CLOSE_BUTTON: "dialog__close-button";
    /** Dialog content */
    readonly CONTENT: "dialog__content";
    /** Dialog footer */
    readonly FOOTER: "dialog__footer";
    /** Dialog divider */
    readonly DIVIDER: "dialog__divider";
    /** Added when dialog is open */
    readonly OPEN: "dialog--open";
    /** Added when dialog is animating */
    readonly ANIMATING: "dialog--animating";
};
/** Default animation duration in milliseconds */
export declare const DEFAULT_ANIMATION_DURATION = 300;
/** Default z-index for dialogs */
export declare const DEFAULT_Z_INDEX = 1000;
/** Button variants for dialog buttons following Material Design 3 */
export declare const DIALOG_BUTTON_VARIANTS: {
    /** Text button (low emphasis) */
    readonly TEXT: "text";
    /** Filled button (high emphasis) */
    readonly FILLED: "filled";
    /** Outlined button (medium emphasis) */
    readonly OUTLINED: "outlined";
    /** Tonal button (medium emphasis) */
    readonly TONAL: "tonal";
};
/** Default button text for confirmation dialogs */
export declare const DEFAULT_CONFIRM_BUTTON_TEXT = "Yes";
/** Default button text for cancellation in dialogs */
export declare const DEFAULT_CANCEL_BUTTON_TEXT = "No";
