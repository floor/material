import { MENU } from "../../menu/inner.js";
import { SPLIT_BUTTON_DEFAULTS } from "../constants.js";
import { createOnDemandMenu } from "../../menu/on-demand.js";
export const makeMenu = (config, trailing, items) => createOnDemandMenu({
    opener: trailing,
    position: "bottom-end",
    offset: SPLIT_BUTTON_DEFAULTS.MENU_OFFSET,
    manualOpen: true,
    ...(config.layer ? { layer: config.layer } : {}),
    prefix: config.prefix,
}, items);
export const withMenu = (config) => (component) => {
    if (!config.items || config.items.length === 0)
        return component;
    return {
        ...component,
        [MENU]: makeMenu(config, component.trailingElement, config.items),
    };
};
