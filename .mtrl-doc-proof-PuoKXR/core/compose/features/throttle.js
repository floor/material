import { getCleanup } from "../cleanup.js";
import { throttle } from "../../utils/performance.js";
export const withThrottle = (config = {}) => (component) => {
    const throttledHandlers = {};
    const addThrottledEvent = (event, handler, wait, options = {}) => {
        if (resources.destroyed)
            return enhancedComponent;
        if (throttledHandlers[event]) {
            removeThrottledEvent(event);
        }
        const throttled = throttle(handler, wait, options);
        component.element.addEventListener(event, throttled);
        throttledHandlers[event] = {
            original: handler,
            throttled: throttled,
        };
        return enhancedComponent;
    };
    const removeThrottledEvent = (event) => {
        const handler = throttledHandlers[event];
        if (handler) {
            handler.throttled.cancel();
            component.element.removeEventListener(event, handler.throttled);
            delete throttledHandlers[event];
        }
        return enhancedComponent;
    };
    const resources = getCleanup(component);
    resources.add(() => {
        Object.keys(throttledHandlers).forEach(event => removeThrottledEvent(event));
    });
    const enhancedComponent = {
        ...component,
        addThrottledEvent,
        removeThrottledEvent,
    };
    if (config.throttledEvents) {
        Object.entries(config.throttledEvents).forEach(([event, settings]) => {
            addThrottledEvent(event, settings.handler, settings.wait, settings.options);
        });
    }
    return enhancedComponent;
};
export default withThrottle;
