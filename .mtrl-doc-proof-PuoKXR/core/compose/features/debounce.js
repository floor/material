import { getCleanup } from "../cleanup.js";
import { debounce } from "../../utils/performance.js";
export const withDebounce = (config = {}) => (component) => {
    const debouncedHandlers = {};
    const addDebouncedEvent = (event, handler, wait, options = {}) => {
        if (resources.destroyed)
            return enhancedComponent;
        if (debouncedHandlers[event]) {
            removeDebouncedEvent(event);
        }
        const debounced = debounce(handler, wait, options);
        component.element.addEventListener(event, debounced);
        debouncedHandlers[event] = {
            original: handler,
            debounced: debounced
        };
        return enhancedComponent;
    };
    const removeDebouncedEvent = (event) => {
        const handler = debouncedHandlers[event];
        if (handler) {
            handler.debounced.cancel();
            component.element.removeEventListener(event, handler.debounced);
            delete debouncedHandlers[event];
        }
        return enhancedComponent;
    };
    const resources = getCleanup(component);
    resources.add(() => {
        Object.keys(debouncedHandlers).forEach(event => removeDebouncedEvent(event));
    });
    const enhancedComponent = {
        ...component,
        addDebouncedEvent,
        removeDebouncedEvent
    };
    if (config.debouncedEvents) {
        Object.entries(config.debouncedEvents).forEach(([event, settings]) => {
            addDebouncedEvent(event, settings.handler, settings.wait, settings.options);
        });
    }
    return enhancedComponent;
};
export default withDebounce;
