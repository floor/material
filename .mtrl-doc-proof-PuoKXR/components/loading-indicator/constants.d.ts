import type { MaterialShapeName } from "../../core/shapes/index.js";
/** Loading indicator measurements and timing (Compose Material 3 */
export declare const LOADING_INDICATOR_DEFAULTS: {
    /** Container width and height */
    readonly SIZE: 48;
    /** The active indicator's diameter within a 48dp container */
    readonly INDICATOR_SIZE: 38;
    /** Smallest size the guidelines allow */
    readonly MIN_SIZE: 24;
    /** Largest size the guidelines allow */
    readonly MAX_SIZE: 240;
    /** Milliseconds between two shape morphs */
    readonly MORPH_INTERVAL: 650;
    /** Milliseconds for one full turn of the slow global rotation */
    readonly ROTATION_DURATION: 4666;
    /** Degrees each morph turns the shape */
    readonly MORPH_ROTATION: 90;
    /** Accessible name when none is given */
    readonly LABEL: "Loading";
    /** Outline samples per shape */
    readonly SAMPLES: 360;
};
/** The morph spring (Compose: `spring(dampingRatio = 0.6f, stiffness = 200f, */
export declare const LOADING_INDICATOR_SPRING: {
    readonly DAMPING: 0.6;
    readonly STIFFNESS: 200;
    readonly THRESHOLD: 0.1;
};
/** The shapes the indeterminate indicator morphs through, in order */
export declare const LOADING_INDICATOR_SHAPES: readonly MaterialShapeName[];
/** The shapes the determinate indicator morphs between as the value grows */
export declare const LOADING_INDICATOR_DETERMINATE_SHAPES: readonly MaterialShapeName[];
/** CSS class names used by the loading indicator, without the prefix */
export declare const LOADING_INDICATOR_CLASSES: {
    readonly ROOT: "loading-indicator";
    /** Drawn on a primary-container circle */
    readonly CONTAINED: "loading-indicator--contained";
    /** Shows a value rather than looping */
    readonly DETERMINATE: "loading-indicator--determinate";
    readonly CANVAS: "loading-indicator__canvas";
};
