import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { PROGRESS_CLASSES, PROGRESS_THICKNESS, PROGRESS_DEFAULTS, } from "./constants.js";
export const defaultConfig = {
    variant: PROGRESS_DEFAULTS.VARIANT,
    value: PROGRESS_DEFAULTS.VALUE,
    max: PROGRESS_DEFAULTS.MAX,
    buffer: PROGRESS_DEFAULTS.BUFFER,
    showLabel: PROGRESS_DEFAULTS.SHOW_LABEL,
    thickness: "thin",
    shape: PROGRESS_DEFAULTS.SHAPE,
    showStopIndicator: true,
    ariaLabel: PROGRESS_DEFAULTS.LABEL,
};
export const createBaseConfig = (config = {}) => {
    return createComponentConfig(defaultConfig, config, "progress");
};
export const getElementConfig = (config) => {
    const isIndeterminate = config.indeterminate === true;
    const attributes = {
        role: "progressbar",
        "aria-label": config.ariaLabel || PROGRESS_DEFAULTS.LABEL,
        "aria-valuemin": "0",
        "aria-valuemax": (config.max || 100).toString(),
    };
    if (!isIndeterminate && config.value !== undefined) {
        attributes["aria-valuenow"] = Math.max(0, Math.min(config.max || 100, config.value)).toString();
    }
    if (config.disabled === true) {
        attributes["aria-disabled"] = "true";
    }
    const classList = [config.class].filter(Boolean);
    return createElementConfig(config, {
        tag: "div",
        attributes,
        className: classList,
    });
};
export const getApiConfig = (comp) => {
    return {
        value: {
            getValue: () => comp.state.value,
            setValue: (value) => {
                if (comp.state) {
                    const clampedValue = Math.max(0, Math.min(comp.state.max, value));
                    comp.state.value = clampedValue;
                    if (comp.state.label) {
                        comp.state.label.textContent = comp.state.labelFormatter(clampedValue, comp.state.max);
                    }
                    if (typeof comp.setValue === "function") {
                        comp.setValue(clampedValue);
                    }
                    else if (comp.draw) {
                        comp.draw();
                    }
                }
            },
            getMax: () => comp.state.max,
        },
        buffer: {
            getBuffer: () => comp.state.buffer,
            setBuffer: (value) => {
                comp.state.buffer = Math.max(0, Math.min(comp.state.max, value));
            },
        },
        disabled: {
            enable: () => {
                comp.disabled?.enable?.();
            },
            disable: () => {
                comp.disabled?.disable?.();
            },
            isDisabled: () => comp.disabled?.isDisabled?.() || false,
        },
        label: {
            show: () => {
                if (!comp.state.label) {
                    const label = document.createElement("div");
                    label.className = `${comp.getClass(PROGRESS_CLASSES.LABEL)}`;
                    label.textContent = comp.state.labelFormatter(comp.state.value, comp.state.max);
                    comp.element.appendChild(label);
                    comp.state.label = label;
                    comp.label = label;
                }
            },
            hide: () => {
                if (comp.state.label) {
                    comp.state.label.remove();
                    comp.state.label = undefined;
                    comp.label = undefined;
                }
            },
            format: (formatter) => {
                comp.state.labelFormatter = formatter;
            },
            formatter: comp.state.labelFormatter,
        },
        thickness: {
            getThickness: () => {
                const thickness = comp.state.thickness;
                if (thickness === "thin") {
                    return PROGRESS_THICKNESS.THIN;
                }
                else if (thickness === "thick") {
                    return PROGRESS_THICKNESS.THICK;
                }
                else if (typeof thickness === "number") {
                    return thickness;
                }
                return PROGRESS_THICKNESS.THIN;
            },
            setThickness: (thickness) => {
                comp.state.thickness = thickness;
                if (comp.draw) {
                    comp.draw();
                }
            },
        },
        shape: {
            getShape: () => comp.state.shape,
            setShape: (shape) => {
                comp.state.shape = shape;
                if (comp.setShape) {
                    comp.setShape(shape);
                }
            },
        },
        state: {
            setIndeterminate: (indeterminate) => {
                if (comp.state) {
                    comp.state.indeterminate = indeterminate;
                    if (typeof comp.setIndeterminate === "function") {
                        comp.setIndeterminate(indeterminate);
                    }
                    else if (comp.draw) {
                        comp.draw();
                    }
                }
            },
            isIndeterminate: () => comp.state.indeterminate,
        },
        lifecycle: {
            destroy: () => {
                comp.lifecycle?.destroy?.();
            },
        },
    };
};
export default defaultConfig;
