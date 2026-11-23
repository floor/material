import { PREFIX } from "../../core/config.js";
import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { ICON_BUTTON_VARIANTS, ICON_BUTTON_SIZES, ICON_BUTTON_SHAPES, ICON_BUTTON_WIDTHS, ICON_BUTTON_TYPES, DEFAULT_RIPPLE_CONFIG, } from "./constants.js";
export const defaultConfig = {
    variant: ICON_BUTTON_VARIANTS.STANDARD,
    size: ICON_BUTTON_SIZES.S,
    shape: ICON_BUTTON_SHAPES.ROUND,
    width: ICON_BUTTON_WIDTHS.DEFAULT,
    disabled: false,
    type: ICON_BUTTON_TYPES.BUTTON,
    toggle: false,
    selected: false,
    ripple: true,
    tooltip: true,
    rippleConfig: {
        duration: DEFAULT_RIPPLE_CONFIG.DURATION,
    },
};
export const createBaseConfig = (config) => createComponentConfig(defaultConfig, config, "icon-button");
export const getElementConfig = (config) => {
    const attributes = {
        type: config.type || "button",
    };
    if (config.ariaLabel) {
        attributes["aria-label"] = config.ariaLabel;
    }
    if (config.toggle) {
        attributes["aria-pressed"] = config.selected ? "true" : "false";
    }
    if (config.disabled === true) {
        attributes.disabled = true;
    }
    if (config.value !== undefined) {
        attributes.value = config.value;
    }
    const componentClasses = [];
    if (config.size && config.size !== "s") {
        componentClasses.push(`${PREFIX}-icon-button--${config.size}`);
    }
    if (config.shape) {
        componentClasses.push(`${PREFIX}-icon-button--${config.shape}`);
    }
    if (config.width && config.width !== "default") {
        componentClasses.push(`${PREFIX}-icon-button--${config.width}`);
    }
    if (config.toggle) {
        componentClasses.push(`${PREFIX}-icon-button--toggle`);
    }
    if (config.toggle && config.selected) {
        componentClasses.push(`${PREFIX}-icon-button--selected`);
    }
    if (config.disabled === true) {
        componentClasses.push(`${PREFIX}-icon-button--disabled`);
    }
    const userClasses = config.className || config.class;
    const mergedClasses = [
        ...componentClasses,
        ...(Array.isArray(userClasses)
            ? userClasses
            : userClasses
                ? [userClasses]
                : []),
    ];
    const enhancedConfig = {
        ...config,
        className: mergedClasses,
    };
    return createElementConfig(enhancedConfig, {
        tag: "button",
        attributes,
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
    toggleState: comp.toggleState,
});
export default defaultConfig;
