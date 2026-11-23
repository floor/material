export const LOADING_INDICATOR_DEFAULTS = {
    SIZE: 48,
    INDICATOR_SIZE: 38,
    MIN_SIZE: 24,
    MAX_SIZE: 240,
    MORPH_INTERVAL: 650,
    ROTATION_DURATION: 4666,
    MORPH_ROTATION: 90,
    LABEL: 'Loading',
    SAMPLES: 360
};
export const LOADING_INDICATOR_SPRING = {
    DAMPING: 0.6,
    STIFFNESS: 200,
    THRESHOLD: 0.1
};
export const LOADING_INDICATOR_SHAPES = [
    'softBurst',
    'cookie9Sided',
    'pentagon',
    'pill',
    'sunny',
    'cookie4Sided',
    'oval'
];
export const LOADING_INDICATOR_DETERMINATE_SHAPES = ['circle', 'softBurst'];
export const LOADING_INDICATOR_CLASSES = {
    ROOT: 'loading-indicator',
    CONTAINED: 'loading-indicator--contained',
    DETERMINATE: 'loading-indicator--determinate',
    CANVAS: 'loading-indicator__canvas'
};
