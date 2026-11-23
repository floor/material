import { createComponentConfig } from "../../core/config/component.js";
import { FAB_POSITIONS, DEFAULT_TRANSITION_DURATION } from "./constants.js";
export const defaultConfig = {
    tag: "div",
    hasFab: false,
    fabPosition: FAB_POSITIONS.END,
    autoHide: false,
    transitionDuration: DEFAULT_TRANSITION_DURATION,
};
export const createConfig = (config = {}) => createComponentConfig(defaultConfig, config, "bottom-app-bar");
