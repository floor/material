import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { TOOLTIP_DEFAULTS } from "./constants.js";
import { supportsTopLayer } from "../../core/dom/layer.js";
export const defaultConfig = {
    position: TOOLTIP_DEFAULTS.POSITION,
    variant: TOOLTIP_DEFAULTS.VARIANT,
    visible: TOOLTIP_DEFAULTS.VISIBLE,
    showDelay: TOOLTIP_DEFAULTS.SHOW_DELAY,
    hideDelay: TOOLTIP_DEFAULTS.HIDE_DELAY,
    showOnFocus: TOOLTIP_DEFAULTS.SHOW_ON_FOCUS,
    showOnHover: TOOLTIP_DEFAULTS.SHOW_ON_HOVER,
};
export const createBaseConfig = (config = {}) => {
    const merged = createComponentConfig(defaultConfig, config, "tooltip");
    if (merged.layer === "top" && !supportsTopLayer("popover-manual")) {
        merged.layer = undefined;
    }
    return merged;
};
export const getElementConfig = (config) => {
    const attributes = {
        role: "tooltip",
        "aria-hidden": "true",
    };
    if (config.zIndex !== undefined) {
        attributes["style"] = `z-index: ${config.zIndex};`;
    }
    return createElementConfig(config, {
        tag: "div",
        attributes,
        className: [
            config.class,
            `${config.prefix}-tooltip--${config.position}`,
            `${config.prefix}-tooltip--${config.variant}`,
        ],
        text: config.text || "",
    });
};
export const getApiConfig = (comp) => ({
    lifecycle: {
        destroy: () => comp.lifecycle.destroy(),
    },
});
export default defaultConfig;
