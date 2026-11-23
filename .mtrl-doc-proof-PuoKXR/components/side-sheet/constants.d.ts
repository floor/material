/** Side sheet variants. */
export declare const SIDE_SHEET_VARIANTS: {
    readonly STANDARD: "standard";
    readonly MODAL: "modal";
};
/** Which edge the sheet is docked to. */
export declare const SIDE_SHEET_POSITIONS: {
    readonly START: "start";
    readonly END: "end";
};
/** Defaults, from the M3 side sheet specs and the Android implementation. */
export declare const SIDE_SHEET_DEFAULTS: {
    readonly VARIANT: "modal";
    /** Side sheets dock to the trailing edge unless told otherwise */
    readonly POSITION: "end";
    /** The width the Android implementation uses for a standard sheet */
    readonly WIDTH: 256;
    /** m3.material.io side sheet specs, container maximum width */
    readonly MAX_WIDTH: 400;
    /** A modal sheet offers a way out of itself */
    readonly CLOSE_BUTTON: true;
    readonly CLOSE_ON_SCRIM_CLICK: true;
    readonly CLOSE_ON_ESCAPE: true;
};
/** Class names, without the prefix. */
export declare const SIDE_SHEET_CLASSES: {
    readonly ROOT: "side-sheet";
    readonly SCRIM: "side-sheet__scrim";
    readonly CONTAINER: "side-sheet__container";
    readonly HEADER: "side-sheet__header";
    readonly TITLE: "side-sheet__title";
    readonly CLOSE: "side-sheet__close";
    readonly DIVIDER: "side-sheet__divider";
    readonly CONTENT: "side-sheet__content";
    readonly ACTIONS: "side-sheet__actions";
};
/** Events the sheet emits. */
export declare const SIDE_SHEET_EVENTS: {
    readonly OPEN: "open";
    readonly CLOSE: "close";
};
