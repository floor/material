import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { LOADING_INDICATOR_DEFAULTS } from "./constants.js";
export const defaultConfig = {
    size: LOADING_INDICATOR_DEFAULTS.SIZE,
    contained: false,
    ariaLabel: LOADING_INDICATOR_DEFAULTS.LABEL,
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, 'loading-indicator');
export const clampSize = (size) => {
    const value = typeof size === 'number' && Number.isFinite(size) ? size : LOADING_INDICATOR_DEFAULTS.SIZE;
    return Math.min(LOADING_INDICATOR_DEFAULTS.MAX_SIZE, Math.max(LOADING_INDICATOR_DEFAULTS.MIN_SIZE, value));
};
export const clampValue = (value) => {
    if (value === null || value === undefined || !Number.isFinite(value))
        return null;
    return Math.min(1, Math.max(0, value));
};
export const getElementConfig = (config) => createElementConfig(config, {
    tag: 'div',
    attributes: {
        role: 'progressbar',
        'aria-label': config.ariaLabel || LOADING_INDICATOR_DEFAULTS.LABEL,
    },
});
export default defaultConfig;
