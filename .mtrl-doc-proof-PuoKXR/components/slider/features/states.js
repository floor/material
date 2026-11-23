import { SLIDER_COLORS } from "../types.js";
export const withStates = (config) => (component) => {
    const handle = component.handle;
    const secondHandle = component.secondHandle;
    const setFieldsDisabled = (disabled) => {
        for (const field of component.formFields ?? []) {
            if (field)
                field.disabled = disabled;
        }
    };
    function disableComponent() {
        component.element.classList.add(`${component.getClass("slider")}--disabled`);
        component.element.setAttribute("aria-disabled", "true");
        if (handle) {
            handle.tabIndex = -1;
            handle.setAttribute("aria-disabled", "true");
        }
        if (config.range && secondHandle) {
            secondHandle.tabIndex = -1;
            secondHandle.setAttribute("aria-disabled", "true");
        }
        setFieldsDisabled(true);
        if (component.renderTracks) {
            component.renderTracks();
        }
    }
    function enableComponent() {
        component.element.classList.remove(`${component.getClass("slider")}--disabled`);
        component.element.setAttribute("aria-disabled", "false");
        if (handle) {
            handle.tabIndex = 0;
            handle.setAttribute("aria-disabled", "false");
        }
        if (config.range && secondHandle) {
            secondHandle.tabIndex = 0;
            secondHandle.setAttribute("aria-disabled", "false");
        }
        setFieldsDisabled(false);
        if (component.renderTracks) {
            component.renderTracks();
        }
    }
    function getActiveColor() {
        return (Object.values(SLIDER_COLORS).find((colorName) => component.element.classList.contains(`${component.getClass("slider")}--${colorName}`)) || SLIDER_COLORS.PRIMARY);
    }
    if (config.disabled === true)
        disableComponent();
    return Object.assign(component, {
        disabled: {
            enable() {
                enableComponent();
                return this;
            },
            disable() {
                disableComponent();
                return this;
            },
            isDisabled() {
                return component.element.classList.contains(`${component.getClass("slider")}--disabled`);
            },
        },
        appearance: {
            setColor(color) {
                Object.values(SLIDER_COLORS).forEach((colorName) => {
                    component.element.classList.remove(`${component.getClass("slider")}--${colorName}`);
                });
                if (color !== SLIDER_COLORS.PRIMARY) {
                    component.element.classList.add(`${component.getClass("slider")}--${color}`);
                }
                return this;
            },
            getColor() {
                return getActiveColor();
            },
            showTicks(show) {
                config.ticks = show;
                component.renderTracks?.();
                return this;
            },
            showCurrentValue(show) {
                config.showValue = show;
                return this;
            },
        },
    });
};
