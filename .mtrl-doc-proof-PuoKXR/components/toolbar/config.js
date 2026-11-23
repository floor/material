import { createComponentConfig } from "../../core/config/component.js";
import { TOOLBAR_VARIANTS, TOOLBAR_COLORS, TOOLBAR_ORIENTATIONS, TOOLBAR_PLACEMENTS, TOOLBAR_ARRANGEMENTS, TOOLBAR_SCROLL_BEHAVIORS, TOOLBAR_SCROLL_THRESHOLD, } from "./constants.js";
export const OVERFLOW_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>';
export const defaultConfig = {
    variant: TOOLBAR_VARIANTS.DOCKED,
    color: TOOLBAR_COLORS.STANDARD,
    orientation: TOOLBAR_ORIENTATIONS.HORIZONTAL,
    placement: TOOLBAR_PLACEMENTS.NONE,
    arrangement: TOOLBAR_ARRANGEMENTS.SPREAD,
    fabPosition: "end",
    scrollBehavior: TOOLBAR_SCROLL_BEHAVIORS.NONE,
    scrollThreshold: TOOLBAR_SCROLL_THRESHOLD,
    overflowLabel: "More options",
    ariaLabel: "Toolbar",
};
const oneOf = (values, value, fallback) => Object.values(values).includes(value) ? value : fallback;
export const resolveColor = (color) => oneOf(TOOLBAR_COLORS, color, TOOLBAR_COLORS.STANDARD);
const resolvePlacement = (placement, variant, orientation) => {
    if (placement === TOOLBAR_PLACEMENTS.NONE)
        return placement;
    if (variant === TOOLBAR_VARIANTS.DOCKED)
        return TOOLBAR_PLACEMENTS.BOTTOM;
    if (orientation === TOOLBAR_ORIENTATIONS.VERTICAL)
        return placement === TOOLBAR_PLACEMENTS.START ? placement : TOOLBAR_PLACEMENTS.END;
    return placement === TOOLBAR_PLACEMENTS.TOP ? placement : TOOLBAR_PLACEMENTS.BOTTOM;
};
export const createConfig = (config = {}) => {
    const merged = createComponentConfig(defaultConfig, config, "toolbar");
    const variant = oneOf(TOOLBAR_VARIANTS, merged.variant, TOOLBAR_VARIANTS.DOCKED);
    const floating = variant === TOOLBAR_VARIANTS.FLOATING;
    const orientation = floating
        ? oneOf(TOOLBAR_ORIENTATIONS, merged.orientation, TOOLBAR_ORIENTATIONS.HORIZONTAL)
        : TOOLBAR_ORIENTATIONS.HORIZONTAL;
    return {
        ...merged,
        variant,
        orientation,
        color: resolveColor(merged.color),
        placement: resolvePlacement(oneOf(TOOLBAR_PLACEMENTS, merged.placement, TOOLBAR_PLACEMENTS.NONE), variant, orientation),
        arrangement: oneOf(TOOLBAR_ARRANGEMENTS, merged.arrangement, TOOLBAR_ARRANGEMENTS.SPREAD),
        fabPosition: merged.fabPosition === "start" ? "start" : "end",
        elevated: floating && merged.elevated !== false,
        exit: merged.scrollBehavior === TOOLBAR_SCROLL_BEHAVIORS.EXIT,
        collapse: !floating && merged.scrollBehavior === TOOLBAR_SCROLL_BEHAVIORS.COLLAPSE,
        scrollThreshold: Math.max(0, Number(merged.scrollThreshold) || 0),
    };
};
