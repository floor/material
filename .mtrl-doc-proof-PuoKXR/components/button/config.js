import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { BUTTON_VARIANTS, BUTTON_TYPES, DEFAULT_RIPPLE_CONFIG, BUTTON_SIZES, BUTTON_SHAPES, } from "./constants.js";
export const defaultConfig = {
    variant: BUTTON_VARIANTS.FILLED,
    size: BUTTON_SIZES.S,
    shape: BUTTON_SHAPES.ROUND,
    disabled: false,
    type: BUTTON_TYPES.BUTTON,
    ripple: true,
    rippleConfig: {
        duration: DEFAULT_RIPPLE_CONFIG.DURATION,
    },
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "button");
export const getElementConfig = (config) => {
    const attributes = {
        type: config.type || "button",
    };
    if (config.disabled === true) {
        attributes.disabled = true;
    }
    if (config.value !== undefined) {
        attributes.value = config.value;
    }
    if (config.ariaLabel) {
        attributes["aria-label"] = config.ariaLabel;
    }
    return createElementConfig(config, {
        tag: "button",
        attributes,
        className: config.class,
        forwardEvents: {
            click: (component) => !component.element.disabled,
            focus: true,
            blur: true,
        },
    });
};
export const getApiConfig = (comp) => ({
    disabled: {
        enable: () => comp.disabled.enable(),
        disable: () => comp.disabled.disable(),
        isDisabled: () => comp.disabled.isDisabled(),
    },
    lifecycle: {
        destroy: () => comp.lifecycle.destroy(),
    },
});
export default defaultConfig;
