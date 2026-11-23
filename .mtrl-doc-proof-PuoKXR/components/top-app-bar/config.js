import { createComponentConfig } from "../../core/config/component.js";
import { TOP_APP_BAR_DEFAULTS } from "./constants.js";
export const defaultConfig = {
    tag: TOP_APP_BAR_DEFAULTS.TAG,
    type: TOP_APP_BAR_DEFAULTS.TYPE,
    scrollable: TOP_APP_BAR_DEFAULTS.SCROLLABLE,
    compressible: TOP_APP_BAR_DEFAULTS.COMPRESSIBLE,
    scrollThreshold: TOP_APP_BAR_DEFAULTS.SCROLL_THRESHOLD
};
export const createConfig = (config = {}) => createComponentConfig(defaultConfig, config, 'top-app-bar');
