import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { SIDE_SHEET_DEFAULTS, SIDE_SHEET_VARIANTS } from "./constants.js";
import { supportsTopLayer } from "../../core/dom/layer.js";
export const defaultConfig = {
    variant: SIDE_SHEET_DEFAULTS.VARIANT,
    position: SIDE_SHEET_DEFAULTS.POSITION,
    width: SIDE_SHEET_DEFAULTS.WIDTH,
    maxWidth: SIDE_SHEET_DEFAULTS.MAX_WIDTH,
    closeButton: SIDE_SHEET_DEFAULTS.CLOSE_BUTTON,
    closeOnScrimClick: SIDE_SHEET_DEFAULTS.CLOSE_ON_SCRIM_CLICK,
    closeOnEscape: SIDE_SHEET_DEFAULTS.CLOSE_ON_ESCAPE,
    open: false,
};
export const createBaseConfig = (config = {}) => {
    const merged = createComponentConfig(defaultConfig, config, "side-sheet");
    if (merged.layer === "top" &&
        (merged.variant !== SIDE_SHEET_VARIANTS.MODAL || !supportsTopLayer("modal"))) {
        merged.layer = undefined;
    }
    return merged;
};
export const getElementConfig = (config) => createElementConfig({ ...config, title: undefined, ariaLabel: undefined }, {
    tag: config.layer === "top" ? "dialog" : "div",
    className: [config.class].filter(Boolean),
    attributes: {
        "aria-hidden": "true",
    },
});
