/** Bottom sheet variants. */
export declare const BOTTOM_SHEET_VARIANTS: {
    readonly STANDARD: "standard";
    readonly MODAL: "modal";
};
/** How far the sheet is open. */
export declare const BOTTOM_SHEET_STATES: {
    readonly HIDDEN: "hidden";
    readonly PARTIAL: "partial";
    readonly EXPANDED: "expanded";
};
/** Defaults, from Compose BottomSheetDefaults and SheetBottomTokens. */
export declare const BOTTOM_SHEET_DEFAULTS: {
    readonly VARIANT: "modal";
    /** BottomSheetDefaults.SheetMaxWidth; wider viewports centre the sheet */
    readonly MAX_WIDTH: 640;
    /** A drag handle is part of the anatomy, so it is on unless asked otherwise */
    readonly DRAG_HANDLE: true;
    readonly CLOSE_ON_SCRIM_CLICK: true;
    readonly CLOSE_ON_ESCAPE: true;
    /** BottomSheetDefaults.PositionalThreshold: how far the sheet must be dragged before it settles at the next anchor rather than springing back. */
    readonly POSITIONAL_THRESHOLD: 56;
    /** BottomSheetDefaults.VelocityThreshold, in dp per second */
    readonly VELOCITY_THRESHOLD: 125;
};
/** Class names, without the prefix. */
export declare const BOTTOM_SHEET_CLASSES: {
    readonly ROOT: "bottom-sheet";
    readonly SCRIM: "bottom-sheet__scrim";
    readonly CONTAINER: "bottom-sheet__container";
    readonly HANDLE: "bottom-sheet__handle";
    readonly HEADER: "bottom-sheet__header";
    readonly TITLE: "bottom-sheet__title";
    readonly CONTENT: "bottom-sheet__content";
};
/** Events the sheet emits. */
export declare const BOTTOM_SHEET_EVENTS: {
    readonly OPEN: "open";
    readonly CLOSE: "close";
    readonly STATE_CHANGE: "stateChange";
    readonly DRAG_START: "dragStart";
    readonly DRAG_END: "dragEnd";
};
