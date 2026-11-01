// src/core/utils/mobile.ts

/**
 * Mobile device detection and capability checks
 * This provides a centralized way to handle mobile-specific features and behaviors
 */

/**
 * Interface for normalized event properties
 */
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

/**
 * Detects if the current device is likely a mobile device
 * Uses a combination of user agent and screen size checks for reliability
 */
export const isMobileDevice = (): boolean => {
  const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const screenSize = window.innerWidth <= 768;
  return userAgent || screenSize;
};

/**
 * Options for passive event listeners
 */
export const PASSIVE_EVENTS: AddEventListenerOptions = { passive: true };

/**
 * Configuration constants for mobile interactions
 * Following WCAG guidelines and touch interaction best practices
 */
export const TOUCH_CONFIG = {
  TARGET_SIZE: 44, // Minimum touch target size in pixels (WCAG standard)
  FEEDBACK_DURATION: 200, // Duration of touch feedback animation in ms
  TAP_THRESHOLD: 250, // Maximum duration for a touch to be considered a tap
  SWIPE_THRESHOLD: 50 // Minimum distance for a touch to be considered a swipe
};

/**
 * Accessibility-minded touch target sizes
 * Based on WCAG guidelines for touch targets
 */
export const TOUCH_TARGETS = {
  MINIMUM: 44, // Minimum recommended size in pixels
  COMFORTABLE: 48, // Comfortable touch target size
  LARGE: 56 // Large touch target for primary actions
};

/**
 * Detects if the current device supports touch events
 */
export const hasTouchSupport = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Type guard for TouchEvent
 */
function isTouchEvent(event: Event): event is TouchEvent {
  return 'touches' in event;
}

/**
 * Type guard for MouseEvent
 */
function isMouseEvent(event: Event): event is MouseEvent {
  return 'clientX' in event && 'clientY' in event;
}

/**
 * Normalizes both mouse and touch events into a consistent format
 * This allows components to handle interactions uniformly
 */
export const normalizeEvent = (event: Event): NormalizedEvent => {
  // A touch event with a point reads the point; a mouse event reads itself.
  // Anything else has no coordinates and reports zero.
  const point = isTouchEvent(event) && event.touches.length > 0
    ? event.touches[0]
    : isMouseEvent(event)
      ? event
      : undefined;

  return {
    clientX: point ? point.clientX : 0,
    clientY: point ? point.clientY : 0,
    pageX: point ? point.pageX : 0,
    pageY: point ? point.pageY : 0,
    target: event.target as EventTarget,
    preventDefault: () => event.preventDefault(),
    stopPropagation: () => event.stopPropagation(),
    type: event.type
  };
};
