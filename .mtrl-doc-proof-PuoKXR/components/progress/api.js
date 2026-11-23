import { PREFIX } from "../../core/index.js";
import { PROGRESS_CLASSES, PROGRESS_EVENTS, PROGRESS_THICKNESS, PROGRESS_SHAPES, } from "./constants.js";
import { addClass, removeClass } from "../../core/dom/index.js";
export const withAPI = (options) => (comp) => {
    const { element, getClass, canvas } = comp;
    const emitEvent = (name, payload) => {
        comp.emit?.(name, payload);
    };
    const setDisabled = (disabled) => {
        if (disabled)
            options.disabled.disable();
        else
            options.disabled.enable();
    };
    const updateProgress = (value, max) => {
        element.setAttribute("aria-valuenow", value.toString());
        const label = comp.label;
        if (label) {
            const formatter = options.label?.formatter ||
                ((v, m) => `${Math.round((v / m) * 100)}%`);
            label.textContent = formatter(value, max);
        }
        if (typeof comp.draw === "function") {
            comp.draw();
        }
    };
    const handleIndeterminateState = (indeterminate) => {
        if (indeterminate) {
            addClass(element, `${PREFIX}-${PROGRESS_CLASSES.INDETERMINATE}`);
            element.removeAttribute("aria-valuenow");
        }
        else {
            removeClass(element, `${PREFIX}-${PROGRESS_CLASSES.INDETERMINATE}`);
            element.setAttribute("aria-valuenow", options.value.getValue().toString());
        }
        comp.setIndeterminate?.(indeterminate);
    };
    if (options.state.isIndeterminate()) {
        handleIndeterminateState(true);
    }
    const api = {
        element,
        canvas: canvas,
        track: canvas,
        indicator: canvas,
        buffer: canvas,
        getClass,
        resize: () => comp.resize?.(),
        getValue() {
            return options.value.getValue();
        },
        setValue(requested, animate = true) {
            const prevValue = options.value.getValue();
            const max = options.value.getMax();
            options.value.setValue(requested);
            const value = options.value.getValue();
            if (prevValue !== value) {
                element.setAttribute("aria-valuenow", value.toString());
                const label = comp.label;
                if (label) {
                    const formatter = options.label?.formatter ||
                        ((v, m) => `${Math.round((v / m) * 100)}%`);
                    label.textContent = formatter(value, max);
                }
                const detail = { value, max };
                emitEvent(PROGRESS_EVENTS.CHANGE, detail);
                if (comp.setValue && typeof comp.setValue === "function") {
                    comp.setValue(value, animate);
                }
                else {
                    updateProgress(value, max);
                }
            }
            return api;
        },
        getMax() {
            return options.value.getMax();
        },
        getBuffer: () => options.buffer.getBuffer(),
        setBuffer(value) {
            options.buffer.setBuffer(value);
            if (!options.state.isIndeterminate() &&
                typeof comp.draw === "function") {
                comp.draw();
            }
            return api;
        },
        setIndeterminate(indeterminate) {
            const wasIndeterminate = options.state.isIndeterminate();
            if (wasIndeterminate === indeterminate)
                return api;
            options.state.setIndeterminate(indeterminate);
            handleIndeterminateState(indeterminate);
            return api;
        },
        isIndeterminate: () => options.state.isIndeterminate(),
        showLabel() {
            if (options.label?.show)
                options.label.show();
            return api;
        },
        hideLabel() {
            if (options.label?.hide)
                options.label.hide();
            return api;
        },
        setLabelFormatter(formatter) {
            if (options.label?.format)
                options.label.format(formatter);
            const label = comp.label || comp.state?.label;
            if (label) {
                label.textContent = formatter(options.value.getValue(), options.value.getMax());
            }
            return api;
        },
        getThickness() {
            return options.thickness?.getThickness() || PROGRESS_THICKNESS.THIN;
        },
        setThickness(thickness) {
            if (options.thickness) {
                options.thickness.setThickness(thickness);
            }
            if (comp.setThickness) {
                comp.setThickness(thickness);
            }
            return api;
        },
        getShape() {
            if (options.shape && typeof options.shape.getShape === "function") {
                return options.shape.getShape();
            }
            return PROGRESS_SHAPES.FLAT;
        },
        setShape(shape) {
            comp.setShape?.(shape);
            return api;
        },
        setSize(size) {
            if (comp.setSize) {
                comp.setSize(size);
            }
            return api;
        },
        getSize() {
            return comp.getSize ? comp.getSize() : undefined;
        },
        enable() {
            setDisabled(false);
            return api;
        },
        disable() {
            setDisabled(true);
            return api;
        },
        isDisabled: options.disabled.isDisabled,
        hide() {
            if (comp.hide) {
                comp.hide();
            }
            return api;
        },
        show() {
            if (comp.show) {
                comp.show();
            }
            return api;
        },
        isVisible() {
            return comp.isVisible
                ? comp.isVisible()
                : element.style.display !== "none";
        },
        on(event, handler) {
            comp.on?.(event, handler);
            return api;
        },
        off(event, handler) {
            comp.off?.(event, handler);
            return api;
        },
        addClass(...classes) {
            classes.forEach((className) => element.classList.add(className));
            return api;
        },
        painted() {
            return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        },
        destroy() {
            options.lifecycle.destroy();
        },
        disabled: {
            enable() {
                setDisabled(false);
            },
            disable() {
                setDisabled(true);
            },
            isDisabled: options.disabled.isDisabled,
        },
        lifecycle: {
            destroy() {
                options.lifecycle.destroy();
            },
        },
    };
    if (comp.state?.showLabel === true) {
        if (options.label?.show) {
            options.label.show();
        }
    }
    return api;
};
