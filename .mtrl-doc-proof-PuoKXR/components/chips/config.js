import { PREFIX } from "../../core/config.js";
import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
export const defaultConfig = {
    chips: [],
    scrollable: false,
    vertical: false,
    multiSelect: true,
    selectionRequired: false,
    onChange: undefined,
    selector: null,
    labelPosition: "start",
};
export const createBaseConfig = (config = {}) => {
    const baseConfig = createComponentConfig(defaultConfig, config, "chips");
    return baseConfig;
};
export const getElementConfig = (config) => {
    const scrollable = config.scrollable === true;
    const vertical = config.vertical === true;
    const hasLabel = config.label && config.label.trim().length > 0;
    const labelPosition = config.labelPosition || "start";
    const classes = [
        "chips",
        config.class,
        scrollable ? `${PREFIX}-chips--scrollable` : "",
        vertical ? `${PREFIX}-chips--vertical` : "",
        hasLabel ? `${PREFIX}-chips--with-label` : "",
        hasLabel && labelPosition === "end" ? `${PREFIX}-chips--label-end` : "",
    ]
        .filter(Boolean)
        .join(" ");
    return createElementConfig(config, {
        tag: "div",
        attributes: {
            role: "grid",
            "aria-multiselectable": config.multiSelect === false ? "false" : "true",
        },
        className: classes,
    });
};
export const getApiConfig = (comp, config) => ({
    config: {
        multiSelect: config?.multiSelect ?? true,
    },
    chips: {
        addChip: function (chipConfig) {
            if (comp.chips && typeof comp.chips.addChip === "function") {
                return comp.chips.addChip(chipConfig);
            }
            return null;
        },
        removeChip: (chipOrIndex) => comp.chips?.removeChip?.(chipOrIndex),
        getChips: () => comp.chips?.getChips?.() ?? [],
        getSelectedChips: () => comp.chips?.getSelectedChips?.() ?? [],
        getSelectedValues: () => comp.chips?.getSelectedValues?.() ?? [],
        selectByValue: (values, triggerEvent) => comp.chips?.selectByValue?.(values, triggerEvent),
        clearSelection: () => comp.chips?.clearSelection?.(),
        scrollToChip: (chipOrIndex) => comp.chips?.scrollToChip?.(chipOrIndex),
    },
    layout: {
        setScrollable: (isScrollable) => comp.layout?.setScrollable?.(isScrollable),
        isScrollable: () => comp.layout?.isScrollable?.() ?? false,
        setVertical: (isVertical) => comp.layout?.setVertical?.(isVertical),
        isVertical: () => comp.layout?.isVertical?.() ?? false,
    },
    label: {
        setText: (t) => comp.labelControl?.setText?.(t),
        getText: () => comp.labelControl?.getText?.() ?? "",
        setPosition: (p) => comp.labelControl?.setPosition?.(p),
        getPosition: () => comp.labelControl?.getPosition?.() ?? "start",
    },
    keyboard: {
        enableKeyboardNavigation: () => comp.keyboard?.enable?.(),
        disableKeyboardNavigation: () => comp.keyboard?.disable?.(),
    },
    events: {
        on: (e, h) => comp.on?.(e, h),
        off: (e, h) => comp.off?.(e, h),
    },
    lifecycle: {
        destroy: () => comp.lifecycle?.destroy?.(),
    },
});
