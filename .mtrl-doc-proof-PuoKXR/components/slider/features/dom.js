import { createElement } from "../../../core/dom/create.js";
import { setStyles } from "../../../core/dom/utils.js";
import { createFormValue } from "../../../core/dom/form-value.js";
export const withDom = (config) => (component) => {
    const getClass = (className) => component.getClass(className);
    const min = config.min || 0;
    const max = config.max || 100;
    const value = config.value !== undefined ? config.value : min;
    const isDisabled = config.disabled === true;
    const formatter = config.valueFormatter || ((val) => val.toString());
    const container = createElement({
        tag: "div",
        className: getClass("slider__container"),
        container: component.element,
    });
    setStyles(container, {
        position: "relative",
    });
    const label = config.ariaLabel || config.label || "";
    const handleElement = (index, handleValue) => {
        const attributes = {
            role: "slider",
            "aria-valuemin": String(min),
            "aria-valuemax": String(max),
            "aria-valuenow": String(handleValue),
            "aria-orientation": config.orientation === "vertical" ? "vertical" : "horizontal",
            tabindex: isDisabled ? "-1" : "0",
            "aria-disabled": isDisabled ? "true" : "false",
            "data-value": String(handleValue),
            "data-handle-index": String(index),
        };
        const element = createElement({
            tag: "div",
            className: getClass("slider__handle"),
            attributes,
            container: container,
        });
        setStyles(element, {
            left: `${((handleValue - min) / (max - min)) * 100}%`,
        });
        return element;
    };
    const bubbleElement = (index, bubbleValue) => {
        const element = createElement({
            tag: "div",
            className: getClass("slider__value"),
            attributes: {
                "aria-hidden": "true",
                "data-handle-index": String(index),
            },
            text: formatter(bubbleValue),
            container: container,
        });
        setStyles(element, {
            left: `${((bubbleValue - min) / (max - min)) * 100}%`,
        });
        return element;
    };
    const handle = handleElement(0, value);
    const valueBubble = bubbleElement(0, value);
    let secondHandle;
    let secondValueBubble;
    if (config.range) {
        const secondValue = config.secondValue !== undefined ? config.secondValue : max;
        secondHandle = handleElement(1, secondValue);
        secondValueBubble = bubbleElement(1, secondValue);
    }
    [handle, secondHandle].forEach((target, index) => {
        if (!target)
            return;
        const endpoint = config.range ? index ? "maximum" : "minimum" : "";
        if (label)
            target.setAttribute("aria-label", endpoint ? `${label} ${endpoint}` : label);
        if (config.ariaLabelledBy) {
            let labelledBy = config.ariaLabelledBy;
            if (endpoint) {
                const suffix = createElement({
                    tag: "span",
                    text: endpoint,
                    attributes: {
                        id: `${getClass("slider")}-${Math.random().toString(36).slice(2, 9)}`,
                        hidden: true,
                    },
                    container: target,
                });
                labelledBy += ` ${suffix.id}`;
            }
            target.setAttribute("aria-labelledby", labelledBy);
        }
    });
    const name = config.name;
    const formFields = name
        ? [
            createFormValue(component.element, name, String(value), isDisabled),
            config.range
                ? createFormValue(component.element, `${name}-end`, String(config.secondValue ?? max), isDisabled)
                : null,
        ]
        : null;
    return {
        ...component,
        container,
        handle,
        valueBubble,
        secondHandle,
        secondValueBubble,
        formFields,
    };
};
