import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { SEARCH_STATES, SEARCH_VIEW_MODES, SEARCH_VARIANTS, SEARCH_DEFAULTS, SEARCH_MEASUREMENTS, } from "./constants.js";
export const defaultConfig = {
    initialState: SEARCH_STATES.BAR,
    viewMode: SEARCH_VIEW_MODES.DOCKED,
    variant: SEARCH_VARIANTS.CONTAINED,
    disabled: SEARCH_DEFAULTS.DISABLED,
    placeholder: SEARCH_DEFAULTS.PLACEHOLDER,
    value: SEARCH_DEFAULTS.VALUE,
    leadingIcon: undefined,
    trailingItems: undefined,
    suggestions: undefined,
    showClearButton: SEARCH_DEFAULTS.SHOW_CLEAR_BUTTON,
    expandOnFocus: true,
    collapseOnBlur: true,
    collapseDelay: 150,
    minWidth: SEARCH_MEASUREMENTS.BAR_MIN_WIDTH,
    maxWidth: SEARCH_MEASUREMENTS.BAR_MAX_WIDTH,
    fullWidth: SEARCH_DEFAULTS.FULL_WIDTH,
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "search");
export const getElementConfig = (config) => createElementConfig(config, {
    tag: "div",
    attributes: {
        role: "search",
        "aria-disabled": config.disabled === true ? "true" : "false",
    },
    className: config.class,
});
export const getApiConfig = (comp) => ({
    value: {
        setValue: (v, t) => comp.input?.setValue?.(v, t),
        getValue: () => comp.input?.getValue?.() ?? "",
        setPlaceholder: (p) => comp.input?.setPlaceholder?.(p),
        getPlaceholder: () => comp.input?.getPlaceholder?.() ?? "",
        clear: (t) => comp.input?.clear?.(t),
        submit: () => comp.input?.submit?.(),
        focus: () => comp.input?.focus?.(),
        blur: () => comp.input?.blur?.(),
    },
    state: {
        expand: () => comp.states?.expand?.(),
        collapse: () => comp.states?.collapse?.(),
        getState: () => comp.states?.getState?.() ?? "bar",
        isExpanded: () => comp.states?.isExpanded?.() ?? false,
        setViewMode: (m) => comp.states?.setViewMode?.(m),
        getViewMode: () => comp.states?.getViewMode?.() ?? "docked",
        setVariant: (variant) => comp.states?.setVariant?.(variant),
        getVariant: () => comp.states?.getVariant?.() ?? "contained",
    },
    disabled: {
        enable: () => comp.disabled?.enable?.(),
        disable: () => comp.disabled?.disable?.(),
        isDisabled: () => comp.disabled?.isDisabled?.() ?? false,
    },
    content: {
        setLeadingIcon: (html) => comp.setLeadingIcon?.(html),
        setTrailingItems: (items) => comp.trailing?.set?.(items),
        addTrailingItem: (item) => comp.trailing?.add?.(item),
        removeTrailingItem: (id) => comp.trailing?.remove?.(id),
    },
    suggestions: {
        set: (s) => comp.input?.setSuggestions?.(s),
        get: () => comp.input?.getSuggestions?.() ?? [],
        clear: () => comp.input?.clearSuggestions?.(),
        render: () => comp.suggestions?.render?.(),
    },
    events: {
        on: (e, h) => comp.on?.(e, h),
        off: (e, h) => comp.off?.(e, h),
    },
    lifecycle: {
        destroy: () => comp.lifecycle?.destroy?.(),
    },
});
