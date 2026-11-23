import { PREFIX } from "../../../core/index.js";
import { PROGRESS_CLASSES, PROGRESS_SHAPES } from "../constants.js";
import { addClass } from "../../../core/dom/index.js";
export const withState = (config) => (component) => {
    if (config.indeterminate && component.element) {
        addClass(component.element, `${PREFIX}-${PROGRESS_CLASSES.INDETERMINATE}`);
        component.element.removeAttribute("aria-valuenow");
    }
    if (component.element) {
        const containerClass = component.getClass?.(PROGRESS_CLASSES.CONTAINER) || "";
        component.element.classList.remove(`${containerClass}--thin`, `${containerClass}--thick`);
    }
    if (config.shape &&
        config.shape !== PROGRESS_SHAPES.FLAT &&
        component.element) {
        const isCircular = component.element.classList.contains(component.getClass?.(PROGRESS_CLASSES.CIRCULAR) || "");
        if (!isCircular) {
            const containerClass = component.getClass?.(PROGRESS_CLASSES.CONTAINER) || "";
            addClass(component.element, `${containerClass}--${config.shape}`);
        }
    }
    const max = config.max ?? 100;
    const clamp = (value) => Math.max(0, Math.min(max, value));
    const state = {
        value: clamp(config.value ?? 0),
        max,
        buffer: clamp(config.buffer ?? 0),
        indeterminate: config.indeterminate === true,
        thickness: config.thickness ?? "thin",
        shape: config.shape ?? PROGRESS_SHAPES.FLAT,
        labelFormatter: config.labelFormatter ??
            ((v, m) => `${Math.round((v / m) * 100)}%`),
        showLabel: config.showLabel,
    };
    component.state = state;
    return {
        ...component,
        state,
    };
};
