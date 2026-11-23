import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { DRAWER_DEFAULTS } from "./constants.js";
import { supportsTopLayer } from "../../core/dom/layer.js";
export const defaultConfig = {
    variant: DRAWER_DEFAULTS.VARIANT,
    position: DRAWER_DEFAULTS.POSITION,
    open: DRAWER_DEFAULTS.OPEN,
    dismissible: DRAWER_DEFAULTS.DISMISSIBLE,
    width: DRAWER_DEFAULTS.WIDTH,
    ripple: DRAWER_DEFAULTS.RIPPLE,
    items: [],
};
export const createBaseConfig = (config = {}) => {
    const merged = createComponentConfig(defaultConfig, config, "drawer");
    if (merged.layer === "top" && (merged.variant !== "modal" || !supportsTopLayer("modal"))) {
        merged.layer = undefined;
    }
    return merged;
};
export const getElementConfig = (config) => {
    const isModal = config.variant === "modal";
    const attributes = {};
    if (isModal) {
        attributes.role = "dialog";
        attributes["aria-modal"] = "true";
    }
    else {
        attributes.role = "navigation";
    }
    attributes["aria-label"] = config.ariaLabel || config.headline || "Navigation";
    attributes.tabindex = "-1";
    return createElementConfig(config, {
        tag: config.layer === "top" ? "dialog" : "aside",
        attributes,
        className: [
            config.dense ? `${config.prefix}-drawer--dense` : null,
            config.class,
        ].filter(Boolean),
        forwardEvents: {
            click: true,
            keydown: true,
        },
    });
};
export const getApiConfig = (comp) => ({
    state: {
        open: () => comp.drawerState.open(),
        close: () => comp.drawerState.close(),
        toggle: () => comp.drawerState.toggle(),
        isOpen: () => comp.drawerState.isOpen(),
    },
    items: {
        setActive: (id) => comp.drawerItems.setActive(id),
        getActive: () => comp.drawerItems.getActive(),
        setItems: (items) => comp.drawerItems.setItems(items || []),
        getItems: () => comp.drawerItems.getItems(),
        setBadge: (id, badge) => comp.drawerItems.setBadge(id, badge),
        expandSection: comp.drawerItems.expandSection,
        collapseSection: comp.drawerItems.collapseSection,
        toggleSection: comp.drawerItems.toggleSection,
        isSectionExpanded: comp.drawerItems.isSectionExpanded,
        getExpandedSections: comp.drawerItems.getExpandedSections,
    },
    headline: {
        setHeadline: (text) => comp.drawerHeadline.setHeadline(text),
        getHeadline: () => comp.drawerHeadline.getHeadline(),
    },
    lifecycle: {
        destroy: () => {
            if (comp._stateCleanup) {
                comp._stateCleanup();
            }
            comp.drawerItems.destroy();
            comp.lifecycle.destroy();
        },
    },
});
export default defaultConfig;
