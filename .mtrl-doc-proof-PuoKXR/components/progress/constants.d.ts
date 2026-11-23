export declare const PROGRESS_VARIANTS: {
    readonly LINEAR: "linear";
    readonly CIRCULAR: "circular";
};
export declare const PROGRESS_SHAPES: {
    readonly FLAT: "flat";
    readonly WAVY: "wavy";
};
export declare const PROGRESS_EVENTS: {
    readonly CHANGE: "change";
    readonly COMPLETE: "complete";
};
export declare const PROGRESS_DEFAULTS: {
    readonly VARIANT: "linear";
    readonly VALUE: 0;
    readonly MAX: 100;
    readonly BUFFER: 0;
    readonly SHAPE: "flat";
    readonly SHOW_LABEL: false;
    readonly INDETERMINATE: false;
    /** Accessible name when none is given */
    readonly LABEL: "Loading";
};
export declare const PROGRESS_CLASSES: {
    readonly CONTAINER: "progress";
    readonly LINEAR: "progress--linear";
    readonly CIRCULAR: "progress--circular";
    readonly TRACK: "progress__track";
    readonly INDICATOR: "progress__indicator";
    readonly BUFFER: "progress__buffer";
    readonly LABEL: "progress__label";
    readonly INDETERMINATE: "progress--indeterminate";
    readonly DISABLED: "progress--disabled";
    readonly TEST: "progress--test";
    readonly TRANSITION: "progress--transition";
};
/** Colour roles (ProgressIndicatorTokens): the active indicator and the stop indicator take primary, the track secondary-container. */
export declare const PROGRESS_COLORS: {
    readonly INDICATOR: "sys-color-primary";
    readonly TRACK: "sys-color-secondary-container";
    readonly STOP: "sys-color-primary";
    /** Not an M3 role: the buffer is this library's own extension */
    readonly BUFFER: "sys-color-primary-container";
};
export declare const PROGRESS_MEASUREMENTS: {
    readonly LINEAR: {
        /** Track and active indicator thickness (LinearProgressIndicatorTokens.Height) */
        readonly HEIGHT: 4;
        /** Space between the active indicator and the track (TrackActiveSpace) */
        readonly GAP: 4;
        /** The dot that marks the end of the track (StopSize) */
        readonly STOP_INDICATOR: 4;
        /** How far the stop indicator sits from the trailing edge, at most */
        readonly STOP_TRAILING_SPACE: 6;
        /** Container height of a wavy linear indicator (WaveHeight) */
        readonly WAVE_HEIGHT: 10;
        /** Inset from the edge of the element (m3.material.io: 4dp minimum) */
        readonly EDGE_INSET: 4;
        readonly MIN_HEIGHT: 4;
    };
    readonly CIRCULAR: {
        /** Flat container size (CircularProgressIndicatorTokens.Size) */
        readonly SIZE: 40;
        /** Wavy container size (CircularProgressIndicatorTokens.WaveSize) */
        readonly WAVE_SIZE: 48;
        /** Space between the active indicator and the track (TrackActiveSpace) */
        readonly GAP: 4;
        /** The guidelines' range for a circular indicator */
        readonly MIN_SIZE: 24;
        readonly MAX_SIZE: 240;
    };
    readonly COMMON: {
        readonly STROKE_WIDTH: 4;
    };
};
export declare const PROGRESS_THICKNESS: {
    readonly THIN: 4;
    readonly THICK: 8;
};
/** Wave geometry (LinearProgressIndicatorTokens, CircularProgressIndicatorTokens). */
export declare const PROGRESS_WAVE: {
    readonly LINEAR: {
        /** ActiveWaveWavelength */
        readonly WAVELENGTH: 40;
        /** IndeterminateActiveWaveWavelength */
        readonly INDETERMINATE_WAVELENGTH: 20;
        /** ActiveWaveAmplitude */
        readonly AMPLITUDE: 3;
    };
    readonly CIRCULAR: {
        /** ActiveWaveWavelength */
        readonly WAVELENGTH: 15;
        /** ActiveWaveAmplitude */
        readonly AMPLITUDE: 1.6;
    };
    /** The wave travels one wavelength per second (WavyProgressIndicatorDefaults) */
    readonly SPEED: 1;
    /** The wave flattens at both ends of the range */
    readonly AMPLITUDE_START: 0.1;
    readonly AMPLITUDE_END: 0.95;
    /** How long the amplitude takes to appear or go (MotionTokens.DurationLong2) */
    readonly AMPLITUDE_DURATION: 500;
};
/** Indeterminate motion (ProgressIndicator.kt) */
export declare const PROGRESS_MOTION: {
    readonly LINEAR: {
        /** LinearAnimationDuration */
        readonly DURATION: 1750;
        readonly FIRST_HEAD_DELAY: 0;
        readonly FIRST_HEAD_DURATION: 1000;
        readonly FIRST_TAIL_DELAY: 250;
        readonly FIRST_TAIL_DURATION: 1000;
        readonly SECOND_HEAD_DELAY: 650;
        readonly SECOND_HEAD_DURATION: 850;
        readonly SECOND_TAIL_DELAY: 900;
        readonly SECOND_TAIL_DURATION: 850;
    };
    readonly CIRCULAR: {
        /** CircularAnimationProgressDuration */
        readonly DURATION: 6000;
        /** CircularAnimationAdditionalRotationDuration */
        readonly ROTATION_DURATION: 300;
        /** CircularAnimationAdditionalRotationDelay */
        readonly ROTATION_DELAY: 1500;
        /** CircularGlobalRotationDegreesTarget */
        readonly GLOBAL_ROTATION: 1080;
        /** CircularAdditionalRotationDegreesTarget */
        readonly ADDITIONAL_ROTATION: 360;
        /** CircularIndeterminateMinProgress */
        readonly MIN_PROGRESS: 0.1;
        /** CircularIndeterminateMaxProgress */
        readonly MAX_PROGRESS: 0.87;
    };
    /** How long a value change takes to animate (MotionTokens.DurationLong2) */
    readonly VALUE_DURATION: 500;
};
/** Easing curves (MotionTokens), as cubic Bézier control points */
export declare const PROGRESS_EASING: {
    /** EasingEmphasizedAccelerateCubicBezier */
    readonly EMPHASIZED_ACCELERATE: readonly [
        0.3,
        0,
        0.8,
        0.15
    ];
    /** EasingEmphasizedDecelerateCubicBezier */
    readonly EMPHASIZED_DECELERATE: readonly [
        0.05,
        0.7,
        0.1,
        1
    ];
    /** EasingStandardCubicBezier */
    readonly STANDARD: readonly [
        0.2,
        0,
        0,
        1
    ];
    /** EasingLinearCubicBezier */
    readonly LINEAR: readonly [
        0,
        0,
        1,
        1
    ];
};
