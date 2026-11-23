import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { TIME_PICKER_TYPE, TIME_PICKER_ORIENTATION, TIME_FORMAT, } from "./types.js";
import { TIMEPICKER_DEFAULTS, TIMEPICKER_ICONS } from "./constants.js";
export const defaultConfig = {
    type: TIME_PICKER_TYPE.DIAL,
    format: TIME_FORMAT.AMPM,
    orientation: TIME_PICKER_ORIENTATION.VERTICAL,
    showSeconds: TIMEPICKER_DEFAULTS.SHOW_SECONDS,
    minuteStep: TIMEPICKER_DEFAULTS.MINUTE_STEP,
    secondStep: TIMEPICKER_DEFAULTS.SECOND_STEP,
    cancelText: TIMEPICKER_DEFAULTS.CANCEL_TEXT,
    confirmText: TIMEPICKER_DEFAULTS.CONFIRM_TEXT,
    open: TIMEPICKER_DEFAULTS.OPEN,
    clockIcon: TIMEPICKER_ICONS.CLOCK,
    keyboardIcon: TIMEPICKER_ICONS.KEYBOARD,
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "time-picker");
const inDialog = (event, prefix) => event.target instanceof Element && event.target.closest(`.${prefix}-time-picker__dialog`) !== null;
export const getContainerConfig = (config) => {
    return createElementConfig({ ...config, title: undefined, ariaLabel: undefined }, {
        tag: "div",
        className: [
            config.class,
            config.open ? `${config.prefix}-time-picker--open` : "",
        ],
        forwardEvents: {
            click: (_component, event) => !inDialog(event, config.prefix),
            keydown: (_component, event) => !inDialog(event, config.prefix),
        },
        interactive: true,
    });
};
export const getApiConfig = (comp) => ({
    events: {
        on: (event, handler) => comp.on(event, handler),
        off: (event, handler) => comp.off(event, handler),
        emit: (event, data) => comp.emit(event, data),
    },
    lifecycle: {
        destroy: () => comp.lifecycle.destroy(),
    },
});
export default defaultConfig;
