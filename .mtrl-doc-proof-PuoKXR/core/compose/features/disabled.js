const isFormControl = (element) => 'disabled' in element;
function hasDisableableInput(component) {
    return 'input' in component &&
        component.input instanceof HTMLElement &&
        ('disabled' in component.input);
}
export const withDisabled = (config) => (component) => {
    const disabledClass = `${component.getClass(config.componentName || component.componentName || 'component')}--disabled`;
    const disabled = {
        enable() {
            component.element.classList.remove(disabledClass);
            if (hasDisableableInput(component)) {
                component.input.disabled = false;
                component.input.removeAttribute('disabled');
            }
            else if (isFormControl(component.element)) {
                component.element.disabled = false;
                component.element.removeAttribute('disabled');
            }
            else {
                component.element.removeAttribute('aria-disabled');
            }
            return this;
        },
        disable() {
            component.element.classList.add(disabledClass);
            if (hasDisableableInput(component)) {
                component.input.disabled = true;
                component.input.setAttribute('disabled', 'true');
            }
            else if (isFormControl(component.element)) {
                component.element.disabled = true;
                component.element.setAttribute('disabled', 'true');
            }
            else {
                component.element.setAttribute('aria-disabled', 'true');
            }
            return this;
        },
        toggle() {
            if (this.isDisabled()) {
                this.enable();
            }
            else {
                this.disable();
            }
            return this;
        },
        isDisabled() {
            if (hasDisableableInput(component)) {
                return component.input.disabled;
            }
            if (isFormControl(component.element)) {
                return component.element.disabled;
            }
            return component.element.getAttribute('aria-disabled') === 'true';
        }
    };
    if (config.disabled) {
        disabled.disable();
    }
    return {
        ...component,
        disabled
    };
};
