/** Divider orientation options */
export declare const DIVIDER_ORIENTATIONS: {
    /** Horizontal divider (default) */
    readonly HORIZONTAL: "horizontal";
    /** Vertical divider */
    readonly VERTICAL: "vertical";
};
/** Divider variant options */
export declare const DIVIDER_VARIANTS: {
    /** Spans the entire width/height of the container (default) */
    readonly FULL_WIDTH: "full-width";
    /** Adds space at the start (left for horizontal, top for vertical) */
    readonly INSET: "inset";
    /** Adds space at both start and end */
    readonly MIDDLE_INSET: "middle-inset";
};
/** Default divider thickness in pixels */
export declare const DEFAULT_DIVIDER_THICKNESS = 1;
/** Default inset value in pixels */
export declare const DEFAULT_INSET_VALUE = 16;
/** CSS classes used by the divider component */
export declare const DIVIDER_CLASSES: {
    /** Root divider element */
    readonly ROOT: "divider";
    /** Applied to horizontal dividers */
    readonly HORIZONTAL: "divider--horizontal";
    /** Applied to vertical dividers */
    readonly VERTICAL: "divider--vertical";
    /** Applied to inset dividers */
    readonly INSET: "divider--inset";
    /** Applied to middle-inset dividers */
    readonly MIDDLE_INSET: "divider--middle-inset";
};
