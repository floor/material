export const createEmitter = () => {
    const events = new Map();
    return {
        on: (event, callback) => {
            const callbacks = events.get(event) || [];
            events.set(event, [...callbacks, callback]);
            return () => {
                const callbacks = events.get(event) || [];
                events.set(event, callbacks.filter(cb => cb !== callback));
            };
        },
        off(event, callback) {
            const callbacks = events.get(event) || [];
            events.set(event, callbacks.filter(cb => cb !== callback));
        },
        emit: (event, ...args) => {
            const callbacks = events.get(event) || [];
            callbacks.forEach(cb => {
                try {
                    cb(...args);
                }
                catch (error) {
                    console.error(`A listener for "${event}" threw:`, error);
                }
            });
        },
        clear: () => {
            events.clear();
        }
    };
};
