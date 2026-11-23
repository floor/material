import { createComponentConfig, createElementConfig as coreCreateElementConfig, } from "../../core/config/component.js";
import { LIST_VARIANTS } from "./constants.js";
export const defaultConfig = {
    variant: LIST_VARIANTS.STANDARD,
    items: [],
    trackSelection: true,
    multiSelect: false,
    animate: false,
};
export const createBaseConfig = (config = {}) => {
    if (config.items !== undefined && !Array.isArray(config.items)) {
        throw new TypeError("List items must be an array");
    }
    const merged = createComponentConfig(defaultConfig, config, "list");
    const variant = Object.values(LIST_VARIANTS).includes(merged.variant)
        ? merged.variant
        : LIST_VARIANTS.STANDARD;
    return { ...merged, variant, items: merged.items ?? [] };
};
export const getElementConfig = (config) => {
    const attributes = {
        role: "list",
    };
    if (config.ariaLabel) {
        attributes["aria-label"] = config.ariaLabel;
    }
    return coreCreateElementConfig(config, {
        tag: "div",
        attributes: attributes,
        forwardEvents: {
            scroll: true,
            keydown: true,
        },
    });
};
export const getApiConfig = (component, config) => ({
    list: {
        refresh: component.list?.refresh,
        getItems: component.list?.getItems,
        getAllItems: component.list?.getAllItems,
        getVisibleItems: component.list?.getVisibleItems,
        scrollToItem: component.list?.scrollToItem,
        scrollToIndex: component.list?.scrollToIndex,
        isLoading: () => false,
        hasNextPage: () => false,
    },
    selection: {
        getSelectedItems: component.getSelectedItems,
        getSelectedItemIds: component.getSelectedItemIds,
        isItemSelected: component.isItemSelected,
        selectItem: component.selectItem,
        deselectItem: component.deselectItem,
        clearSelection: component.clearSelection,
        setSelection: component.setSelection,
    },
    events: {
        on: component.on,
        off: component.off,
    },
    lifecycle: {
        destroy: component.lifecycle.destroy,
    },
    config: {
        animate: config?.animate,
    },
});
export default defaultConfig;
