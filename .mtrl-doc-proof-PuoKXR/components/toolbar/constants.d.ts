/** Toolbar variants (m3.material.io toolbars) */
export declare const TOOLBAR_VARIANTS: {
    readonly DOCKED: "docked";
    readonly FLOATING: "floating";
};
export type ToolbarVariant = (typeof TOOLBAR_VARIANTS)[keyof typeof TOOLBAR_VARIANTS];
/** Toolbar colours - standard: surface container, low emphasis - vibrant: primary container, high emphasis (e.g. */
export declare const TOOLBAR_COLORS: {
    readonly STANDARD: "standard";
    readonly VIBRANT: "vibrant";
};
export type ToolbarColor = (typeof TOOLBAR_COLORS)[keyof typeof TOOLBAR_COLORS];
/** Floating toolbar layouts. */
export declare const TOOLBAR_ORIENTATIONS: {
    readonly HORIZONTAL: "horizontal";
    readonly VERTICAL: "vertical";
};
export type ToolbarOrientation = (typeof TOOLBAR_ORIENTATIONS)[keyof typeof TOOLBAR_ORIENTATIONS];
/** Where the toolbar sits in its positioned container. */
export declare const TOOLBAR_PLACEMENTS: {
    readonly NONE: "none";
    readonly BOTTOM: "bottom";
    readonly TOP: "top";
    readonly START: "start";
    readonly END: "end";
};
export type ToolbarPlacement = (typeof TOOLBAR_PLACEMENTS)[keyof typeof TOOLBAR_PLACEMENTS];
/** How a docked toolbar lays out its items: spread evenly across the width (compact windows), or centred 32dp apart (medium windows and up). */
export declare const TOOLBAR_ARRANGEMENTS: {
    readonly SPREAD: "spread";
    readonly CENTER: "center";
};
export type ToolbarArrangement = (typeof TOOLBAR_ARRANGEMENTS)[keyof typeof TOOLBAR_ARRANGEMENTS];
/** Scroll behaviours: stay on screen, leave it while scrolling forward, or — docked only — shrink while the content scrolls forward and restore when it scrolls back. */
export declare const TOOLBAR_SCROLL_BEHAVIORS: {
    readonly NONE: "none";
    readonly EXIT: "exit";
    readonly COLLAPSE: "collapse";
};
export type ToolbarScrollBehavior = (typeof TOOLBAR_SCROLL_BEHAVIORS)[keyof typeof TOOLBAR_SCROLL_BEHAVIORS];
/** Which side of a floating toolbar its FAB sits on, along the toolbar. */
export type ToolbarFabPosition = "start" | "end";
/** The scroll distance, in px, that hides or shows the toolbar (Compose FloatingToolbarDefaults.ScrollDistanceThreshold, 40dp). */
export declare const TOOLBAR_SCROLL_THRESHOLD = 40;
export declare const TOOLBAR_EVENTS: {
    readonly SHOW: "show";
    readonly HIDE: "hide";
    readonly COLLAPSE: "collapse";
    readonly EXPAND: "expand";
};
