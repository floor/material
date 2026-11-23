import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { TIME_PERIOD, } from "./types.js";
import { createBaseConfig, getContainerConfig, getApiConfig } from "./config.js";
import { createTimePickerAPI } from "./api.js";
import { parseTime, formatFormValue } from "./utils.js";
import { createFormValue } from "../../core/dom/form-value.js";
let pickers = 0;
const createTimePicker = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const baseComponent = pipe(createBase, withEvents(), withElement(getContainerConfig(baseConfig)), withLifecycle())(baseConfig);
        baseConfig.titleId = `${baseConfig.prefix}-time-picker-${++pickers}__title`;
        const dialogElement = document.createElement("dialog");
        dialogElement.className = [
            `${baseConfig.prefix}-time-picker__dialog`,
            `${baseConfig.prefix}-time-picker__dialog--${baseConfig.type}`,
            `${baseConfig.prefix}-time-picker__dialog--${baseConfig.orientation}`,
            `${baseConfig.prefix}-time-picker__dialog--${baseConfig.format}`,
        ].join(" ");
        const modalElement = dialogElement;
        const container = typeof baseConfig.container === "string"
            ? document.querySelector(baseConfig.container) || baseComponent.element
            : baseConfig.container || baseComponent.element;
        container.appendChild(modalElement);
        let timeValue;
        if (baseConfig.value) {
            timeValue = parseTime(baseConfig.value, baseConfig.format);
        }
        else {
            const now = new Date();
            timeValue = {
                hours: now.getHours(),
                minutes: now.getMinutes(),
                seconds: baseConfig.showSeconds ? now.getSeconds() : 0,
                period: now.getHours() >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM,
            };
        }
        const formValue = createFormValue(baseComponent.element, baseConfig.name, formatFormValue(timeValue, baseConfig.showSeconds === true));
        const timePicker = createTimePickerAPI(baseComponent, modalElement, dialogElement, timeValue, baseConfig, getApiConfig(baseComponent), formValue);
        if (baseConfig.open)
            timePicker.open(true);
        return timePicker;
    }
    catch (error) {
        console.error("TimePicker creation error:", error);
        throw new Error(`Failed to create time picker: ${error.message}`);
    }
};
export default createTimePicker;
