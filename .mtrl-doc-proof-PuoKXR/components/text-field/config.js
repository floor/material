import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { warnDev } from "../../core/utils/warn.js";
export const defaultConfig = {
    type: "text",
    variant: "filled",
};
export const createBaseConfig = (config = {}) => {
    if ( /*#__PURE__*/(() => {
        try {
            return process.env.NODE_ENV !== "production";
        }
        catch {
            return false;
        }
    })() && process.env.NODE_ENV !== "production") {
        const KEY_LIST = "type variant density name label value placeholder required noAsterisk disabled readonly maxLength pattern autocomplete inputMode enterKeyHint leadingIcon trailingIcon trailingIconLabel onTrailingClick supportingText error prefixText suffixText class prefix componentName className parent id title tabIndex style data role ariaLabel ariaDescribedBy ariaLabelledBy ariaHidden multiline controlLabelOnly";
        const _complete = true;
        const _sound = true;
        const CONFIG_KEYS = KEY_LIST.split(" ");
        for (const key of Object.keys(config)) {
            if (!CONFIG_KEYS.includes(key))
                warnDev("text-field", `unknown config key "${key}"`);
        }
    }
    return createComponentConfig(defaultConfig, config, "text-field");
};
export const getElementConfig = (config) => {
    const wrapper = createElementConfig(config, {
        tag: "div",
        className: config.class,
    });
    if (config.controlLabelOnly)
        wrapper.ariaLabel = undefined;
    return wrapper;
};
export const getApiConfig = (comp) => ({
    disabled: {
        enable: comp.disabled.enable,
        disable: comp.disabled.disable,
        isDisabled: comp.disabled.isDisabled,
    },
    lifecycle: {
        destroy: comp.lifecycle.destroy,
    },
});
export default defaultConfig;
