/** Search component states (bar = collapsed, view = expanded) */
export declare const SEARCH_STATES: {
    /** Collapsed search bar state */
    readonly BAR: "bar";
    /** Expanded search view state */
    readonly VIEW: "view";
};
/** Search view display modes */
export declare const SEARCH_VARIANTS: {
    /** M3 Expressive: a filled bar, results in their own container */
    readonly CONTAINED: "contained";
    /** Baseline: a divider between the bar and its results */
    readonly DIVIDED: "divided";
};
export declare const SEARCH_VIEW_MODES: {
    /** Inline docked view (360-720dp width, max 2/3 screen height) */
    readonly DOCKED: "docked";
    /** Full-screen overlay view */
    readonly FULLSCREEN: "fullscreen";
};
/** MD3 Search component measurements */
export declare const SEARCH_MEASUREMENTS: {
    readonly BAR_HEIGHT: 56;
    readonly BAR_MIN_WIDTH: 360;
    readonly BAR_MAX_WIDTH: 720;
    readonly VIEW_DOCKED_HEADER_HEIGHT: 56;
    readonly VIEW_DOCKED_MIN_WIDTH: 360;
    readonly VIEW_DOCKED_MAX_WIDTH: 720;
    readonly VIEW_DOCKED_MIN_HEIGHT: 240;
    readonly VIEW_FULLSCREEN_HEADER_HEIGHT: 72;
    readonly PADDING_HORIZONTAL: 16;
    readonly ICON_SIZE: 24;
    readonly AVATAR_SIZE: 30;
    readonly ICON_SPACING: 16;
};
/** Search component event types */
export declare const SEARCH_EVENTS: {
    /** Fired when search input receives focus */
    readonly FOCUS: "focus";
    /** Fired when search input loses focus */
    readonly BLUR: "blur";
    /** Fired when input value changes */
    readonly INPUT: "input";
    /** Fired when search is submitted (Enter key or submit action) */
    readonly SUBMIT: "submit";
    /** Fired when search input is cleared */
    readonly CLEAR: "clear";
    /** Fired when search bar expands to view */
    readonly EXPAND: "expand";
    /** Fired when search view collapses to bar */
    readonly COLLAPSE: "collapse";
    /** Fired when a suggestion is selected */
    readonly SUGGESTION_SELECT: "suggestionSelect";
};
/** Default search icons (MD3 standard) */
export declare const SEARCH_ICONS: {
    /** Search/magnifying glass icon */
    readonly SEARCH: "<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"M0 0h24v24H0z\" fill=\"none\"/><path d=\"M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z\"/></svg>";
    /** Back/arrow left icon (for view state) */
    readonly BACK: "<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"M0 0h24v24H0z\" fill=\"none\"/><path d=\"M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z\"/></svg>";
    /** Clear/close icon */
    readonly CLEAR: "<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"M0 0h24v24H0z\" fill=\"none\"/><path d=\"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\"/></svg>";
    /** Microphone icon (voice search) */
    readonly MIC: "<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"M0 0h24v24H0z\" fill=\"none\"/><path d=\"M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z\"/></svg>";
    /** History/clock icon (for recent searches) */
    readonly HISTORY: "<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\"><path d=\"M0 0h24v24H0z\" fill=\"none\"/><path d=\"M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z\"/></svg>";
};
/** Default configuration values */
export declare const SEARCH_DEFAULTS: {
    /** Default state (collapsed bar) */
    readonly STATE: "bar";
    /** Default view mode when expanded */
    readonly VIEW_MODE: "docked";
    /** Default placeholder/supporting text */
    readonly PLACEHOLDER: "Search";
    /** Default value */
    readonly VALUE: "";
    /** Whether to show clear button when input has value */
    readonly SHOW_CLEAR_BUTTON: true;
    /** Default disabled state */
    readonly DISABLED: false;
    /** Default full-width state */
    readonly FULL_WIDTH: false;
};
/** CSS class names used by the search component */
export declare const SEARCH_CLASSES: {
    readonly ROOT: "search";
    readonly STATE_BAR: "search--bar";
    readonly STATE_VIEW: "search--view";
    readonly VIEW_DOCKED: "search--docked";
    readonly VIEW_FULLSCREEN: "search--fullscreen";
    readonly VARIANT_CONTAINED: "search--contained";
    readonly VARIANT_DIVIDED: "search--divided";
    readonly FOCUSED: "search--focused";
    readonly DISABLED: "search--disabled";
    readonly POPULATED: "search--populated";
    readonly FULL_WIDTH: "search--full-width";
    readonly SURFACE: "search__surface";
    readonly CONTAINER: "search__container";
    readonly HEADER: "search__header";
    readonly INPUT_WRAPPER: "search__input-wrapper";
    readonly INPUT: "search__input";
    readonly DIVIDER: "search__divider";
    readonly CONTENT: "search__content";
    readonly LEADING_ICON: "search__leading-icon";
    readonly TRAILING_ICON: "search__trailing-icon";
    readonly CLEAR_BUTTON: "search__clear-button";
    readonly CLEAR_BUTTON_HIDDEN: "search__clear-button--hidden";
    readonly AVATAR: "search__avatar";
    readonly SUGGESTIONS: "search__suggestions";
    readonly SUGGESTION_LIST: "search__suggestion-list";
    readonly SUGGESTION_ITEM: "search__suggestion-item";
    readonly SUGGESTION_ITEM_SELECTED: "search__suggestion-item--selected";
    readonly SUGGESTION_ICON: "search__suggestion-icon";
    readonly SUGGESTION_TEXT: "search__suggestion-text";
    readonly SUGGESTION_SUPPORTING: "search__suggestion-supporting";
    readonly SUGGESTION_DIVIDER: "search__suggestion-divider";
    readonly STATUS: "search__status";
};
/** Keyboard keys for search interaction */
export declare const SEARCH_KEYS: {
    readonly ENTER: "Enter";
    readonly ESCAPE: "Escape";
    readonly ARROW_DOWN: "ArrowDown";
    readonly ARROW_UP: "ArrowUp";
    readonly TAB: "Tab";
};
