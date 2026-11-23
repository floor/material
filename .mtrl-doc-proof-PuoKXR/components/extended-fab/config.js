import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { EXTENDED_FAB_CLASSES } from "./constants.js";
export const defaultConfig = {
    variant: "primary-container",
    type: "button",
    ripple: true,
    iconPosition: "start",
    width: "fixed",
    size: "small",
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "extended-fab");
export const getElementConfig = (config) => {
    const attributes = {
        type: config.type || "button",
        "aria-label": config.ariaLabel,
    };
    if (config.value !== undefined) {
        attributes.value = config.value;
    }
    const classNames = [`${config.prefix}-extended-fab`];
    if (config.variant) {
        classNames.push(`${config.prefix}-extended-fab--${config.variant}`);
    }
    classNames.push(`${config.prefix}-extended-fab--${config.size || "small"}`);
    if (config.iconPosition === "end") {
        classNames.push(`${config.prefix}-${EXTENDED_FAB_CLASSES.ICON_END}`);
    }
    if (config.width) {
        classNames.push(`${config.prefix}-extended-fab--${config.width}`);
    }
    if (config.animate) {
        classNames.push(`${config.prefix}-extended-fab--animate-enter`);
    }
    const position = config.placement === undefined ? config.position : config.placement === "none" ? undefined : config.placement;
    if (position) {
        classNames.push(`${config.prefix}-extended-fab--${position}`);
    }
    if (config.collapseOnScroll) {
        classNames.push(`${config.prefix}-extended-fab--collapsible`);
    }
    if (config.class) {
        classNames.push(config.class);
    }
    if (config.disabled === true) {
        attributes.disabled = true;
        classNames.push(`${config.prefix}-extended-fab--disabled`);
    }
    return createElementConfig(config, {
        tag: "button",
        attributes,
        className: classNames,
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
    className: comp.getClass("extended-fab"),
    text: {
        setText: (text) => comp.text.setText(text),
        getText: () => comp.text.getText(),
    },
});
export default defaultConfig;
