export const createEventManager = (element) => {
    const handlers = new Map();
    const identities = new WeakMap();
    let nextIdentity = 0;
    const createHandlerId = (event, handler, capture = false) => {
        let id = identities.get(handler);
        if (id === undefined)
            identities.set(handler, id = ++nextIdentity);
        return `${event}_${id}_${capture}`;
    };
    const enhanceHandler = (handler, event) => (e) => {
        try {
            handler(e);
        }
        catch (error) {
            console.error(`Error in ${event} handler:`, error);
        }
    };
    const safeRemoveListener = (event, handler, capture = false) => {
        try {
            if (capture)
                element.removeEventListener(event, handler, true);
            else
                element.removeEventListener(event, handler);
        }
        catch (error) {
            console.warn(`Failed to remove ${event} listener:`, error);
        }
    };
    return {
        on(event, handler, options = {}) {
            const id = createHandlerId(event, handler, !!options.capture);
            if (handlers.has(id))
                return this;
            const enhanced = enhanceHandler(handler, event);
            handlers.set(id, {
                original: handler,
                enhanced,
                event,
                options: { ...options }
            });
            element.addEventListener(event, enhanced, options);
            return this;
        },
        off(event, handler) {
            for (const capture of [false, true]) {
                const id = createHandlerId(event, handler, capture);
                const stored = handlers.get(id);
                if (stored) {
                    safeRemoveListener(event, stored.enhanced, capture);
                    handlers.delete(id);
                }
            }
            return this;
        },
        pause() {
            handlers.forEach(({ enhanced, event, options }) => {
                safeRemoveListener(event, enhanced, !!options.capture);
            });
            return this;
        },
        resume() {
            handlers.forEach(({ enhanced, event, options }) => {
                element.addEventListener(event, enhanced, options);
            });
            return this;
        },
        destroy() {
            handlers.forEach(({ enhanced, event, options }) => {
                safeRemoveListener(event, enhanced, !!options.capture);
            });
            handlers.clear();
        },
        getHandlers() {
            return new Map(handlers);
        },
        hasHandler(event, handler) {
            const id = createHandlerId(event, handler);
            return handlers.has(id) || handlers.has(createHandlerId(event, handler, true));
        }
    };
};
