import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { CAROUSEL_DEFAULTS, CAROUSEL_VARIANTS } from "./constants.js";
export const defaultConfig = {
    variant: CAROUSEL_DEFAULTS.VARIANT,
    cornerRadius: CAROUSEL_DEFAULTS.CORNER_RADIUS,
    initialSlide: CAROUSEL_DEFAULTS.INITIAL_SLIDE,
    minSmallItemWidth: CAROUSEL_DEFAULTS.MIN_SMALL_ITEM_WIDTH,
    maxSmallItemWidth: CAROUSEL_DEFAULTS.MAX_SMALL_ITEM_WIDTH,
};
export const resolveLayoutDefaults = (config) => {
    const variant = (config.variant || CAROUSEL_DEFAULTS.VARIANT);
    const fullScreen = variant === CAROUSEL_VARIANTS.FULL_SCREEN;
    return {
        variant,
        gap: config.gap ?? (fullScreen ? CAROUSEL_DEFAULTS.GAP_FULL_SCREEN : CAROUSEL_DEFAULTS.GAP),
        padding: config.padding ?? (fullScreen ? 0 : CAROUSEL_DEFAULTS.PADDING),
        snap: config.snap ?? variant !== CAROUSEL_VARIANTS.UNCONTAINED,
    };
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "carousel");
export const getElementConfig = (config) => {
    const { variant } = resolveLayoutDefaults(config);
    return createElementConfig(config, {
        tag: "div",
        attributes: {
            role: "region",
            "aria-roledescription": "carousel",
            "aria-label": config.ariaLabel || "Carousel",
        },
        className: [
            config.class,
            `${config.prefix}-carousel--${variant}`,
            variant === CAROUSEL_VARIANTS.FULL_SCREEN ? `${config.prefix}-carousel--vertical` : null,
        ],
        forwardEvents: {
            focus: true,
            blur: true,
        },
    });
};
