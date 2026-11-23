/**
 * Easing function for smooth animations (Material Design standard)
 * @param t
 */
export declare const easeOutCubic: (t: number) => number;
/** Standard Material Design animation durations */
export declare const ANIMATION_DURATIONS: {
    SHORT: number;
    MEDIUM: number;
    LONG: number;
    EXTRA_LONG: number;
};
/** Common easing functions */
export declare const EASING_FUNCTIONS: {
    linear: (t: number) => number;
    easeIn: (t: number) => number;
    easeOut: (t: number) => number;
    easeInOut: (t: number) => number;
    materialStandard: (t: number) => number;
};
