import { createComponentConfig } from "../../core/config/component.js";
import { SELECT_DEFAULTS } from "./constants.js";
import { MENU } from "../menu/inner.js";
export const defaultConfig = {
    options: [],
    variant: SELECT_DEFAULTS.VARIANT,
    placement: SELECT_DEFAULTS.PLACEMENT,
};
export const createBaseConfig = (config = { options: [] }) => createComponentConfig(defaultConfig, config, "select");
export const getApiConfig = (comp) => ({
    select: {
        getValue: comp.select?.getValue || (() => null),
        setValue: comp.select?.setValue || (() => comp),
        clear: comp.select?.clear || (() => comp),
        getText: comp.select?.getText || (() => ""),
        getSelectedOption: comp.select?.getSelectedOption || (() => null),
        getOptions: comp.select?.getOptions || (() => []),
        setOptions: comp.select?.setOptions || (() => comp),
        open: comp.select?.open || (() => comp),
        close: comp.select?.close || (() => comp),
        isOpen: comp.select?.isOpen || (() => false),
    },
    events: {
        on: comp.on || (() => comp),
        off: comp.off || (() => comp),
    },
    disabled: {
        enable: () => {
            if (comp.textField?.enable) {
                comp.textField.enable();
            }
            return comp;
        },
        disable: () => {
            if (comp.textField?.disable) {
                comp.textField.disable();
            }
            return comp;
        },
    },
    lifecycle: {
        destroy: () => {
            if (comp.textField?.destroy) {
                comp.textField.destroy();
            }
            if (comp[MENU]?.destroy) {
                comp[MENU].destroy();
            }
            if (comp.lifecycle?.destroy) {
                comp.lifecycle.destroy();
            }
        },
    },
});
export default defaultConfig;
