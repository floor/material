export const isMobileDevice = () => {
    const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const screenSize = window.innerWidth <= 768;
    return userAgent || screenSize;
};
export const PASSIVE_EVENTS = { passive: true };
export const TOUCH_CONFIG = {
    TARGET_SIZE: 44,
    FEEDBACK_DURATION: 200,
    TAP_THRESHOLD: 250,
    SWIPE_THRESHOLD: 50
};
export const TOUCH_TARGETS = {
    MINIMUM: 44,
    COMFORTABLE: 48,
    LARGE: 56
};
export const hasTouchSupport = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};
function isTouchEvent(event) {
    return 'touches' in event;
}
function isMouseEvent(event) {
    return 'clientX' in event && 'clientY' in event;
}
export const normalizeEvent = (event) => {
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
        target: event.target,
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation(),
        type: event.type
    };
};
