export const withAPI = ({ disabled, lifecycle, checkable }) => (component) => ({
    ...component,
    element: component.element,
    input: component.input,
    getValue() {
        return checkable.isChecked();
    },
    setValue(value) {
        if (typeof value === "boolean") {
            if (value) {
                checkable.check();
            }
            else {
                checkable.uncheck();
            }
        }
        else if (typeof value === "string") {
            const shouldCheck = value === "true" || value === "1";
            if (shouldCheck) {
                checkable.check();
            }
            else {
                checkable.uncheck();
            }
        }
        return this;
    },
    getValueAttribute() {
        return component.input?.value || "";
    },
    setValueAttribute(value) {
        if (component.input) {
            component.input.value = value;
        }
        return this;
    },
    check() {
        checkable.check();
        return this;
    },
    uncheck() {
        checkable.uncheck();
        return this;
    },
    toggle() {
        checkable.toggle();
        return this;
    },
    isChecked() {
        return checkable.isChecked();
    },
    setIndeterminate(state) {
        component.setIndeterminate?.(state);
        return this;
    },
    setError(error) {
        component.setError?.(error);
        return this;
    },
    setLabel(text) {
        component.label?.setText(text);
        return this;
    },
    getLabel() {
        return component.label?.getText() || "";
    },
    on(event, handler) {
        component.on?.(event, handler);
        return this;
    },
    off(event, handler) {
        component.off?.(event, handler);
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
    destroy() {
        lifecycle.destroy();
    },
});
