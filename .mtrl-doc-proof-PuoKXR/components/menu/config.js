import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { MENU_DEFAULTS, MENU_CLASSES } from "./constants.js";
import { supportsTopLayer } from "../../core/dom/layer.js";
export const defaultConfig = {
    items: [],
    position: MENU_DEFAULTS.POSITION,
    closeOnSelect: MENU_DEFAULTS.CLOSE_ON_SELECT,
    closeOnClickOutside: MENU_DEFAULTS.CLOSE_ON_CLICK_OUTSIDE,
    closeOnEscape: MENU_DEFAULTS.CLOSE_ON_ESCAPE,
    openSubmenuOnHover: MENU_DEFAULTS.OPEN_SUBMENU_ON_HOVER,
    offset: MENU_DEFAULTS.OFFSET,
    autoFlip: MENU_DEFAULTS.AUTO_FLIP,
    visible: false,
};
export const createBaseConfig = (config) => {
    if (!config.opener) {
        throw new Error("Menu component requires an opener element or selector");
    }
    const merged = createComponentConfig(defaultConfig, config, "menu");
    if (merged.layer === "top" && !supportsTopLayer("popover-manual")) {
        merged.layer = undefined;
    }
    return merged;
};
export const getElementConfig = (config) => {
    const styles = {};
    if (config.width) {
        styles.width = config.width;
    }
    if (config.maxHeight) {
        styles.maxHeight = config.maxHeight;
    }
    const attributes = {
        role: config.listbox ? "presentation" : "menu",
        ...(config.listbox ? {} : { tabindex: "-1" }),
        "aria-hidden": (!config.visible).toString(),
    };
    return createElementConfig(config, {
        tag: "div",
        style: styles,
        attributes,
        className: [
            config.visible ? MENU_CLASSES.VISIBLE : null,
            config.dense ? `${config.prefix}-menu--dense` : null,
            config.variant !== "baseline" ? `${config.prefix}-menu--vertical` : null,
            config.variant !== "baseline" && config.color === "vibrant"
                ? `${config.prefix}-menu--vibrant`
                : null,
            config.class,
        ].filter(Boolean),
        forwardEvents: {
            keydown: true,
        },
    });
};
export const getApiConfig = (component) => ({
    menu: {
        open: (event, interactionType) => component.menu?.open(event, interactionType),
        close: (event, restoreFocus, skipAnimation) => component.menu?.close(event, restoreFocus, skipAnimation),
        toggle: (event, interactionType) => component.menu?.toggle(event, interactionType),
        isOpen: () => component.menu?.isOpen() || false,
        setItems: (items) => component.menu.setItems(items),
        getItems: () => component.menu.getItems(),
        setPosition: (position) => component.menu.setPosition(position),
        getPosition: () => component.menu.getPosition(),
        setSelected: (itemId) => component.menu.setSelected(itemId),
        getSelected: () => component.menu.getSelected(),
    },
    opener: {
        setOpener: (opener) => component.opener.setOpener(opener),
        getOpener: () => component.opener.getOpener(),
    },
    submenu: {
        hasOpenSubmenu: () => component.submenu?.hasOpenSubmenu() || false,
        closeAllSubmenus: () => component.submenu?.closeAllSubmenus(),
    },
    events: {
        on: (event, handler) => component.on?.(event, handler),
        off: (event, handler) => component.off?.(event, handler),
    },
    lifecycle: {
        destroy: () => component.lifecycle?.destroy(),
    },
});
export default defaultConfig;
