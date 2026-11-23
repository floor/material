import { createEventManager } from "../../state/events.js";
import { getCleanup } from "../cleanup.js";
export const withEvents = (target) => (component) => {
    const events = createEventManager(target || component.element);
    const enhancedEvents = {
        addListeners(listeners) {
            Object.entries(listeners).forEach(([event, handler]) => {
                events.on(event, handler);
            });
            return this;
        },
        removeListeners(listeners) {
            Object.entries(listeners).forEach(([event, handler]) => {
                events.off(event, handler);
            });
            return this;
        },
        once(event, handler) {
            const wrappedHandler = (e) => {
                handler(e);
                events.off(event, wrappedHandler);
            };
            events.on(event, wrappedHandler);
            return this;
        },
        on(event, handler) {
            events.on(event, handler);
            return this;
        },
        off(event, handler) {
            events.off(event, handler);
            return this;
        },
        destroy() {
            events.destroy();
        },
    };
    const resources = getCleanup(component);
    resources.add(() => events.destroy());
    return {
        ...component,
        events: enhancedEvents,
        on(event, handler) {
            enhancedEvents.on(event, handler);
            return this;
        },
        off(event, handler) {
            enhancedEvents.off(event, handler);
            return this;
        },
    };
};
