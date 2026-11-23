import { PREFIX } from "../../core/config.js";
import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
export const defaultConfig = {
    variant: "primary-container",
    size: "default",
    type: "button",
    ripple: true,
};
export const createBaseConfig = (config) => createComponentConfig(defaultConfig, config, "fab");
export const getElementConfig = (config) => {
    const attributes = {
        type: config.type || "button",
        "aria-label": config.ariaLabel,
    };
    if (config.value !== undefined) {
        attributes.value = config.value;
    }
    if (config.disabled === true) {
        attributes.disabled = true;
    }
    const componentClasses = [];
    componentClasses.push(`${PREFIX}-fab--${config.size || "default"}`);
    if (config.animate) {
        componentClasses.push(`${PREFIX}-fab--animate-enter`);
    }
    const position = config.placement === undefined ? config.position : config.placement === "none" ? undefined : config.placement;
    if (position) {
        componentClasses.push(`${PREFIX}-fab--${position}`);
    }
    if (config.disabled === true) {
        componentClasses.push(`${PREFIX}-fab--disabled`);
    }
    return createElementConfig(config, {
        tag: "button",
        attributes,
        className: componentClasses,
        forwardEvents: {
            click: (component) => !component.element.disabled,
            focus: true,
            blur: true,
        },
        interactive: true,
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
    className: comp.getClass("fab"),
});
export default defaultConfig;
