export const BOTTOM_SHEET_VARIANTS = {
    STANDARD: "standard",
    MODAL: "modal",
};
export const BOTTOM_SHEET_STATES = {
    HIDDEN: "hidden",
    PARTIAL: "partial",
    EXPANDED: "expanded",
};
export const BOTTOM_SHEET_DEFAULTS = {
    VARIANT: BOTTOM_SHEET_VARIANTS.MODAL,
    MAX_WIDTH: 640,
    DRAG_HANDLE: true,
    CLOSE_ON_SCRIM_CLICK: true,
    CLOSE_ON_ESCAPE: true,
    POSITIONAL_THRESHOLD: 56,
    VELOCITY_THRESHOLD: 125,
};
export const BOTTOM_SHEET_CLASSES = {
    ROOT: "bottom-sheet",
    SCRIM: "bottom-sheet__scrim",
    CONTAINER: "bottom-sheet__container",
    HANDLE: "bottom-sheet__handle",
    HEADER: "bottom-sheet__header",
    TITLE: "bottom-sheet__title",
    CONTENT: "bottom-sheet__content",
};
export const BOTTOM_SHEET_EVENTS = {
    OPEN: "open",
    CLOSE: "close",
    STATE_CHANGE: "stateChange",
    DRAG_START: "dragStart",
    DRAG_END: "dragEnd",
};
