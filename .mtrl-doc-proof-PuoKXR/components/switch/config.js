import { controlLabelConfig } from "../../core/config/control-label.js";
import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { SWITCH_DEFAULTS } from "./constants.js";
export const defaultConfig = {
    prefix: "mtrl",
    componentName: "switch",
    labelPosition: SWITCH_DEFAULTS.LABEL_POSITION,
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "switch");
export const getElementConfig = (config) => controlLabelConfig(createElementConfig(config, {
    tag: "div",
    className: config.class,
    interactive: true,
}), config.controlLabelOnly);
export const getApiConfig = (comp) => ({
    disabled: {
        enable: comp.disabled.enable,
        disable: comp.disabled.disable,
        isDisabled: comp.disabled.isDisabled,
    },
    lifecycle: {
        destroy: comp.lifecycle.destroy,
    },
    checkable: {
        check: comp.checkable.check,
        uncheck: comp.checkable.uncheck,
        toggle: comp.checkable.toggle,
        isChecked: comp.checkable.isChecked,
    },
});
export default defaultConfig;
