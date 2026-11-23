/** Default list item configuration */
export declare const LIST_DEFAULTS: {
    /** Default collection name for API-connected lists */
    readonly COLLECTION: "items";
    /** Default API base URL */
    readonly BASE_URL: "http://localhost:4000/api";
    /** Default number of items per page */
    readonly PAGE_SIZE: 20;
    /** Default number of extra items to render above/below viewport */
    readonly RENDER_BUFFER_SIZE: 5;
    /** Default item height in pixels */
    readonly ITEM_HEIGHT: 56;
};
/** List variants (m3.material.io lists) */
export declare const LIST_VARIANTS: {
    readonly STANDARD: "standard";
    readonly SEGMENTED: "segmented";
};
/** List types for rendering and behavior */
export declare const LIST_TYPES: {
    /** Standard list with no selection */
    readonly DEFAULT: "default";
    /** List with single-select behavior */
    readonly SINGLE_SELECT: "single-select";
    /** List with multi-select behavior */
    readonly MULTI_SELECT: "multi-select";
};
/** List selection modes */
export declare const LIST_SELECTION_MODES: {
    /** No selection allowed */
    readonly NONE: "none";
    /** Only one item can be selected at a time */
    readonly SINGLE: "single";
    /** Multiple items can be selected */
    readonly MULTIPLE: "multiple";
};
/** List events */
export declare const LIST_EVENTS: {
    /** Fired when an item is selected */
    readonly SELECT: "select";
    /** Fired when items are loaded */
    readonly LOAD: "load";
    /** Fired when the list is scrolled */
    readonly SCROLL: "scroll";
};
/** Scroll position options for scrollToItem method */
export declare const LIST_SCROLL_POSITIONS: {
    /** Align item at the top of viewport */
    readonly START: "start";
    /** Center item in the viewport */
    readonly CENTER: "center";
    /** Align item at the bottom of viewport */
    readonly END: "end";
};
/** CSS classes used in the list component */
export declare const LIST_CLASSES: {
    /** Container element */
    readonly CONTAINER: "list";
    /** List element */
    readonly LIST: "list";
    /** List item */
    readonly ITEM: "list__item";
    /** Selected list item */
    readonly SELECTED: "list__item--selected";
    /** Loading indicator */
    readonly LOADING: "list--loading";
    /** Empty state */
    readonly EMPTY: "list--empty";
};
