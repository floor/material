export const PROGRESS_VARIANTS = {
    LINEAR: "linear",
    CIRCULAR: "circular",
};
export const PROGRESS_SHAPES = {
    FLAT: "flat",
    WAVY: "wavy",
};
export const PROGRESS_EVENTS = {
    CHANGE: "change",
    COMPLETE: "complete",
};
export const PROGRESS_DEFAULTS = {
    VARIANT: "linear",
    VALUE: 0,
    MAX: 100,
    BUFFER: 0,
    SHAPE: "flat",
    SHOW_LABEL: false,
    INDETERMINATE: false,
    LABEL: "Loading",
};
export const PROGRESS_CLASSES = {
    CONTAINER: "progress",
    LINEAR: "progress--linear",
    CIRCULAR: "progress--circular",
    TRACK: "progress__track",
    INDICATOR: "progress__indicator",
    BUFFER: "progress__buffer",
    LABEL: "progress__label",
    INDETERMINATE: "progress--indeterminate",
    DISABLED: "progress--disabled",
    TEST: "progress--test",
    TRANSITION: "progress--transition",
};
export const PROGRESS_COLORS = {
    INDICATOR: "sys-color-primary",
    TRACK: "sys-color-secondary-container",
    STOP: "sys-color-primary",
    BUFFER: "sys-color-primary-container",
};
export const PROGRESS_MEASUREMENTS = {
    LINEAR: {
        HEIGHT: 4,
        GAP: 4,
        STOP_INDICATOR: 4,
        STOP_TRAILING_SPACE: 6,
        WAVE_HEIGHT: 10,
        EDGE_INSET: 4,
        MIN_HEIGHT: 4,
    },
    CIRCULAR: {
        SIZE: 40,
        WAVE_SIZE: 48,
        GAP: 4,
        MIN_SIZE: 24,
        MAX_SIZE: 240,
    },
    COMMON: {
        STROKE_WIDTH: 4,
    },
};
export const PROGRESS_THICKNESS = {
    THIN: 4,
    THICK: 8,
};
export const PROGRESS_WAVE = {
    LINEAR: {
        WAVELENGTH: 40,
        INDETERMINATE_WAVELENGTH: 20,
        AMPLITUDE: 3,
    },
    CIRCULAR: {
        WAVELENGTH: 15,
        AMPLITUDE: 1.6,
    },
    SPEED: 1,
    AMPLITUDE_START: 0.1,
    AMPLITUDE_END: 0.95,
    AMPLITUDE_DURATION: 500,
};
export const PROGRESS_MOTION = {
    LINEAR: {
        DURATION: 1750,
        FIRST_HEAD_DELAY: 0,
        FIRST_HEAD_DURATION: 1000,
        FIRST_TAIL_DELAY: 250,
        FIRST_TAIL_DURATION: 1000,
        SECOND_HEAD_DELAY: 650,
        SECOND_HEAD_DURATION: 850,
        SECOND_TAIL_DELAY: 900,
        SECOND_TAIL_DURATION: 850,
    },
    CIRCULAR: {
        DURATION: 6000,
        ROTATION_DURATION: 300,
        ROTATION_DELAY: 1500,
        GLOBAL_ROTATION: 1080,
        ADDITIONAL_ROTATION: 360,
        MIN_PROGRESS: 0.1,
        MAX_PROGRESS: 0.87,
    },
    VALUE_DURATION: 500,
};
export const PROGRESS_EASING = {
    EMPHASIZED_ACCELERATE: [0.3, 0.0, 0.8, 0.15],
    EMPHASIZED_DECELERATE: [0.05, 0.7, 0.1, 1.0],
    STANDARD: [0.2, 0.0, 0.0, 1.0],
    LINEAR: [0.0, 0.0, 1.0, 1.0],
};
