import { MENU } from "../menu/inner.js";
export const withAPI = (options) => (component) => ({
    ...component,
    element: component.element,
    textField: component.textField,
    getValue: options.select.getValue,
    setValue(value) {
        options.select.setValue(value);
        return this;
    },
    clear() {
        options.select.clear();
        return this;
    },
    getText: options.select.getText,
    getSelectedOption: options.select.getSelectedOption,
    getOptions: options.select.getOptions,
    setOptions(newOptions) {
        options.select.setOptions(newOptions);
        return this;
    },
    open(interactionType = "mouse") {
        if (component.textField?.input?.disabled)
            return this;
        const menu = component[MENU];
        if (menu && typeof menu.open === "function") {
            menu.open(undefined, interactionType);
        }
        else {
            options.select.open();
        }
        return this;
    },
    close() {
        options.select.close();
        return this;
    },
    isOpen: options.select.isOpen,
    setDensity(density) {
        if (component.textField?.setDensity) {
            component.textField.setDensity(density);
        }
        return this;
    },
    getDensity() {
        if (component.textField?.getDensity) {
            return component.textField.getDensity();
        }
        return "default";
    },
    on(event, handler) {
        if (options.events?.on) {
            options.events.on(event, handler);
        }
        else if (component.on) {
            component.on(event, handler);
        }
        return this;
    },
    off(event, handler) {
        if (options.events?.off) {
            options.events.off(event, handler);
        }
        else if (component.off) {
            component.off(event, handler);
        }
        return this;
    },
    enable() {
        options.disabled.enable();
        return this;
    },
    disable() {
        options.disabled.disable();
        return this;
    },
    isDisabled() {
        return component.textField?.input?.disabled === true;
    },
    setError(error, message) {
        if (component.textField?.setError) {
            component.textField.setError(error, message);
        }
        return this;
    },
    clearError() {
        if (component.textField?.setError) {
            component.textField.setError(false);
        }
        return this;
    },
    destroy() {
        options.lifecycle.destroy();
    },
});
