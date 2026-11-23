import { createComponentConfig, processClassNames } from "../../core/config/component.js";
import { withElement } from "../../core/compose/component.js";
import { TAB_STATES, TABS_DEFAULTS } from "./constants.js";
export const defaultTabConfig = {
    state: TAB_STATES.INACTIVE,
    componentName: "tab",
    ripple: TABS_DEFAULTS.RIPPLE,
};
export const defaultTabsConfig = {
    variant: TABS_DEFAULTS.VARIANT,
    scrollable: TABS_DEFAULTS.SCROLLABLE,
    showDivider: TABS_DEFAULTS.SHOW_DIVIDER,
    componentName: "tabs",
};
export const createTabsConfig = (config = {}) => createComponentConfig(defaultTabsConfig, config, "tabs");
export const createTabConfig = (config = {}) => createComponentConfig(defaultTabConfig, config, "tab");
export const getTabsElementConfig = (config) => {
    const elementConfig = {
        tag: "div",
        attributes: {
            role: "tablist",
            "aria-orientation": "horizontal",
            "aria-label": config.ariaLabel,
        },
        className: [
            `${config.prefix}-tabs`,
            `${config.prefix}-tabs--${config.variant || "primary"}`,
            processClassNames(config.className || ""),
        ].filter((name) => Boolean(name)),
    };
    return (component) => withElement(elementConfig)(component);
};
