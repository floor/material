export const SIDE_SHEET_VARIANTS = {
    STANDARD: "standard",
    MODAL: "modal",
};
export const SIDE_SHEET_POSITIONS = {
    START: "start",
    END: "end",
};
export const SIDE_SHEET_DEFAULTS = {
    VARIANT: SIDE_SHEET_VARIANTS.MODAL,
    POSITION: SIDE_SHEET_POSITIONS.END,
    WIDTH: 256,
    MAX_WIDTH: 400,
    CLOSE_BUTTON: true,
    CLOSE_ON_SCRIM_CLICK: true,
    CLOSE_ON_ESCAPE: true,
};
export const SIDE_SHEET_CLASSES = {
    ROOT: "side-sheet",
    SCRIM: "side-sheet__scrim",
    CONTAINER: "side-sheet__container",
    HEADER: "side-sheet__header",
    TITLE: "side-sheet__title",
    CLOSE: "side-sheet__close",
    DIVIDER: "side-sheet__divider",
    CONTENT: "side-sheet__content",
    ACTIONS: "side-sheet__actions",
};
export const SIDE_SHEET_EVENTS = {
    OPEN: "open",
    CLOSE: "close",
};
