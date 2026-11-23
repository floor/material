import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { BOTTOM_SHEET_DEFAULTS, BOTTOM_SHEET_STATES, BOTTOM_SHEET_VARIANTS, } from "./constants.js";
import { supportsTopLayer } from "../../core/dom/layer.js";
export const defaultConfig = {
    variant: BOTTOM_SHEET_DEFAULTS.VARIANT,
    dragHandle: BOTTOM_SHEET_DEFAULTS.DRAG_HANDLE,
    maxWidth: BOTTOM_SHEET_DEFAULTS.MAX_WIDTH,
    initialState: BOTTOM_SHEET_STATES.HIDDEN,
    closeOnScrimClick: BOTTOM_SHEET_DEFAULTS.CLOSE_ON_SCRIM_CLICK,
    closeOnEscape: BOTTOM_SHEET_DEFAULTS.CLOSE_ON_ESCAPE,
};
export const createBaseConfig = (config = {}) => {
    const merged = createComponentConfig(defaultConfig, config, "bottom-sheet");
    if (merged.layer === "top" &&
        (merged.variant !== BOTTOM_SHEET_VARIANTS.MODAL || !supportsTopLayer("modal"))) {
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
