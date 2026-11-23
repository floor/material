export function withAPI(component, events) {
    const api = {
        ...component,
        on(event, handler) { events.on(event, handler); return api; },
        off(event, handler) { events.off(event, handler); return api; },
    };
    return api;
}
