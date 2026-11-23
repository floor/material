import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { SPLIT_BUTTON_DEFAULTS } from "./constants.js";
export const defaultConfig = {
    variant: SPLIT_BUTTON_DEFAULTS.VARIANT,
    size: SPLIT_BUTTON_DEFAULTS.SIZE,
    disabled: false,
    trailingLabel: SPLIT_BUTTON_DEFAULTS.TRAILING_LABEL,
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "split-button");
export const getElementConfig = (config) => {
    const attributes = { role: "group" };
    if (config.groupLabel)
        attributes["aria-label"] = config.groupLabel;
    return createElementConfig({ ...config, ariaLabel: undefined }, {
        tag: "div",
        attributes,
    });
};
export default defaultConfig;
