export const withAPI = ({ lifecycle }) => (component) => {
    const radiosComponent = {
        element: component.element,
        radios: component.radios,
        lifecycle: {
            destroy: lifecycle.destroy,
        },
        getClass: component.getClass,
        getValue: () => component.getValue(),
        setValue(value) {
            component.setValue(value);
            return this;
        },
        getSelected: () => component.getSelected(),
        addOption(option) {
            component.addOption(option);
            return this;
        },
        removeOption(value) {
            component.removeOption(value);
            return this;
        },
        enable() {
            component.enable();
            return this;
        },
        isDisabled() {
            return component.isDisabled();
        },
        disable() {
            component.disable();
            return this;
        },
        enableOption(value) {
            component.enableOption(value);
            return this;
        },
        disableOption(value) {
            component.disableOption(value);
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
            component.radios.forEach((radio) => radio.destroy());
            lifecycle.destroy();
        },
    };
    return radiosComponent;
};
