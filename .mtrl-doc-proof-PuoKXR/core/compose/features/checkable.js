export const withCheckable = (config = {}) => (component) => {
    if (!component.input)
        return component;
    const componentName = component.componentName || "component";
    const updateStateClasses = () => {
        component.element.classList.toggle(`${component.getClass(componentName)}--checked`, component.input.checked);
    };
    if (config.checked !== undefined) {
        component.input.checked = config.checked;
    }
    updateStateClasses();
    if (component.emit) {
        component.on?.("change", updateStateClasses);
    }
    const checkable = {
        check() {
            component.input.checked = true;
            updateStateClasses();
            return this;
        },
        uncheck() {
            component.input.checked = false;
            updateStateClasses();
            return this;
        },
        toggle() {
            component.input.checked = !component.input.checked;
            updateStateClasses();
            return this;
        },
        isChecked() {
            return component.input.checked;
        },
    };
    return {
        ...component,
        checkable,
    };
};
