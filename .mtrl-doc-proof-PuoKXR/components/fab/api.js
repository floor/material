export const withAPI = ({ disabled, lifecycle, className }) => (component) => ({
    ...component,
    element: component.element,
    getValue: () => component.element.value,
    setValue(value) {
        component.element.value = value;
        return this;
    },
    enable() {
        disabled.enable();
        return this;
    },
    isDisabled() {
        return disabled.isDisabled();
    },
    disable() {
        disabled.disable();
        return this;
    },
    setIcon(icon) {
        component.icon.setIcon(icon);
        return this;
    },
    getIcon() {
        return component.icon.getIcon();
    },
    setPosition(position) {
        const positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
        positions.forEach(pos => {
            component.element.classList.remove(`${className}--${pos}`);
        });
        component.element.classList.add(`${className}--${position}`);
        return this;
    },
    getPosition() {
        const positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
        for (const pos of positions) {
            if (component.element.classList.contains(`${className}--${pos}`)) {
                return pos;
            }
        }
        return null;
    },
    lower() {
        component.element.classList.add(`${className}--lowered`);
        return this;
    },
    raise() {
        component.element.classList.remove(`${className}--lowered`);
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
    addClass(...classes) {
        component.addClass(...classes);
        return this;
    },
    destroy() {
        lifecycle.destroy();
    }
});
