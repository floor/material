/** Mobile device detection and capability checks */
/** Interface for normalized event properties */
export interface NormalizedEvent {
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
    target: EventTarget;
    preventDefault: () => void;
    stopPropagation: () => void;
    type: string;
}
/** Horizontal gesture emitted by an interactive root. */
export interface SwipePayload {
    direction: "left" | "right";
    deltaX: number;
    deltaY: number;
}
/** Touch gestures emitted by touch-enabled interactive roots. */
export interface TouchEvents {
    tap: (payload: NormalizedEvent) => void;
    swipe: (payload: SwipePayload) => void;
}
/** Detects if the current device is likely a mobile device */
export declare const isMobileDevice: () => boolean;
/** Options for passive event listeners */
export declare const PASSIVE_EVENTS: AddEventListenerOptions;
/** Configuration constants for mobile interactions */
export declare const TOUCH_CONFIG: {
    TARGET_SIZE: number;
    FEEDBACK_DURATION: number;
    TAP_THRESHOLD: number;
    SWIPE_THRESHOLD: number;
};
/** Accessibility-minded touch target sizes */
export declare const TOUCH_TARGETS: {
    MINIMUM: number;
    COMFORTABLE: number;
    LARGE: number;
};
/** Detects if the current device supports touch events */
export declare const hasTouchSupport: () => boolean;
/** Normalizes both mouse and touch events into a consistent format */
export declare const normalizeEvent: (event: Event) => NormalizedEvent;
