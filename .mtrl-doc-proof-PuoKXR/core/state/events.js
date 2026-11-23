export const createEventManager = (element) => {
    const handlers = new Map();
    return {
        on(event, handler) {
            element.addEventListener(event, handler);
            let callbacks = handlers.get(event);
            if (!callbacks)
                handlers.set(event, callbacks = new Set());
            callbacks.add(handler);
            return this;
        },
        off(event, handler) {
            element.removeEventListener(event, handler);
            const callbacks = handlers.get(event);
            callbacks?.delete(handler);
            if (!callbacks?.size)
                handlers.delete(event);
            return this;
        },
        destroy() {
            handlers.forEach((callbacks, event) => {
                callbacks.forEach(handler => element.removeEventListener(event, handler));
            });
            handlers.clear();
        },
        getHandlers() {
            const snapshot = new Map();
            handlers.forEach((callbacks, event) => callbacks.forEach(handler => snapshot.set(handler, event)));
            return snapshot;
        }
    };
};
