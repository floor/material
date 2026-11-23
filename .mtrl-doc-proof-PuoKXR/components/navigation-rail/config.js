import { createComponentConfig } from "../../core/config/component.js";
import { getIcon } from "../../core/icons/registry.js";
import { NAVIGATION_RAIL_DEFAULTS as defaults, NAVIGATION_RAIL_ICONS as icons } from "./constants.js";
export const createBaseConfig = (config) => {
    const result = createComponentConfig({
        expanded: defaults.EXPANDED, expandedWidth: defaults.EXPANDED_WIDTH,
        showToggle: defaults.SHOW_TOGGLE, ripple: true, items: [],
        expandLabel: 'Expand navigation', collapseLabel: 'Collapse navigation',
        expandIcon: getIcon('menu', icons.EXPAND), collapseIcon: getIcon('menu-open', icons.COLLAPSE),
    }, config, 'navigation-rail');
    const width = result.expandedWidth;
    result.expandedWidth = Number.isFinite(width)
        ? Math.min(defaults.MAX_EXPANDED_WIDTH, Math.max(defaults.MIN_EXPANDED_WIDTH, width))
        : defaults.EXPANDED_WIDTH;
    return result;
};
