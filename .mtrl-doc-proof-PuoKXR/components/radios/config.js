import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
export const defaultConfig = {
    name: "",
    direction: "vertical",
    disabled: false,
    ripple: true,
    options: [],
};
export const createBaseConfig = (config) => createComponentConfig(defaultConfig, config, "radios");
export const getElementConfig = (config) => {
    return createElementConfig(config, {
        tag: "div",
        attributes: {
            role: "radiogroup",
            ...(config.required ? { "aria-required": "true" } : {}),
        },
        className: config.class,
    });
};
export const getApiConfig = (comp) => ({
    disabled: {
        enable: () => comp.disabled.enable(),
        disable: () => comp.disabled.disable(),
    },
    lifecycle: {
        destroy: () => comp.lifecycle.destroy(),
    },
});
export default defaultConfig;
