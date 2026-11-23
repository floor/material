export const withAPI = ({ state, structure, drag, lifecycle }) => (component) => {
    const api = {
        element: component.element,
        getClass: component.getClass,
        open() {
            state.open();
            return this;
        },
        close() {
            state.close();
            return this;
        },
        expand() {
            state.expand();
            return this;
        },
        collapse() {
            state.collapse();
            return this;
        },
        isOpen: () => state.isOpen(),
        getState: () => state.getState(),
        setContent(content) {
            structure.setContent(content);
            return this;
        },
        setTitle(title) {
            structure.setTitle(title);
            return this;
        },
        on(event, handler) {
            component.on(event, handler);
            return this;
        },
        off(event, handler) {
            component.off(event, handler);
            return this;
        },
        destroy() {
            drag.release();
            state.release();
            lifecycle.destroy();
            component.element.remove();
        },
    };
    return api;
};
export const applyEventHandlers = (component, handlers) => {
    if (!handlers)
        return;
    for (const [event, handler] of Object.entries(handlers)) {
        if (typeof handler === "function") {
            component.on(event, handler);
        }
    }
};
