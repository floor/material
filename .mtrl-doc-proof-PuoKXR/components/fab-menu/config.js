import { createComponentConfig } from "../../core/config/component.js";
import { FAB_MENU_COLORS, FAB_MENU_SIZES, FAB_MENU_PRESENTATIONS, FAB_MENU_PLACEMENTS, } from "./constants.js";
export const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
const oneOf = (values, value, fallback) => Object.values(values).includes(value) ? value : fallback;
export const createConfig = (config) => {
    const merged = createComponentConfig({}, config, "fab-menu");
    return {
        ...merged,
        items: merged.items ?? [],
        color: oneOf(FAB_MENU_COLORS, merged.color, FAB_MENU_COLORS.PRIMARY),
        size: oneOf(FAB_MENU_SIZES, merged.size, FAB_MENU_SIZES.DEFAULT),
        presentation: oneOf(FAB_MENU_PRESENTATIONS, merged.presentation, FAB_MENU_PRESENTATIONS.AUTO),
        placement: oneOf(FAB_MENU_PLACEMENTS, merged.placement, FAB_MENU_PLACEMENTS.NONE),
    };
};
