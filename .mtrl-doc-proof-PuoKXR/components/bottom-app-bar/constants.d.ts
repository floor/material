/**
 * FAB position constants for Bottom App Bar
 * @deprecated Material Design 3 Expressive replaces the bottom app bar with
 * the docked toolbar. Use the toolbar's fabPosition: 'start' or 'end'. A
 * centred FAB is not yet available on the docked toolbar.
 */
export declare const FAB_POSITIONS: {
    readonly CENTER: "center";
    readonly END: "end";
};
/**
 * Default transition duration for show/hide animations
 * @deprecated The docked toolbar transitions with the motion tokens; a custom
 * transition duration is not yet available on the docked toolbar.
 */
export declare const DEFAULT_TRANSITION_DURATION = 300;
/**
 * CSS class names used in the bottom app bar component
 * @deprecated The docked toolbar applies its own classes; style it with its
 * parts (toolbar, bar, fab, overflow) instead.
 */
export declare const BOTTOM_APP_BAR_CLASSES: {
    readonly ROOT: "bottom-app-bar";
    readonly ACTIONS: "bottom-app-bar__actions";
    readonly FAB_CONTAINER: "bottom-app-bar__fab-container";
    readonly HIDDEN: "bottom-app-bar--hidden";
    readonly FAB_CENTER: "bottom-app-bar--fab-center";
    readonly FAB_END: "bottom-app-bar--fab-end";
};
