import { controlLabelConfig } from "../../core/config/control-label.js";
import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
export const defaultConfig = {
    labelPosition: "end",
    enterToggles: false,
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "checkbox");
export const getElementConfig = (config) => controlLabelConfig(createElementConfig(config, {
    tag: "div",
    className: config.class,
    interactive: true,
}), config.controlLabelOnly);
const SVG = "http://www.w3.org/2000/svg";
const checkIcons = new WeakMap();
const createCheckIcon = (doc) => {
    let checkIcon = checkIcons.get(doc);
    if (!checkIcon) {
        checkIcon = doc.createDocumentFragment();
        const svg = doc.createElementNS(SVG, "svg");
        svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", SVG);
        for (const [name, value] of [["viewBox", "0 0 24 24"], ["width", "20"], ["height", "20"], ["fill", "currentColor"]]) {
            svg.setAttribute(name, value);
        }
        const path = doc.createElementNS(SVG, "path");
        path.setAttribute("d", "M9.55 14.6L6.35 11.4l-1.9 1.9L9.55 18.4l10.9-10.9-1.9-1.9z");
        svg.append("\n      ", path, "\n    ");
        checkIcon.append("\n    ", svg, "\n  ");
        checkIcons.set(doc, checkIcon);
    }
    return checkIcon.cloneNode(true);
};
export const withCheckIcon = (config) => (component) => {
    const doc = document;
    const icon = doc.createElement("span");
    icon.className = `${config.prefix}-checkbox__icon`;
    icon.appendChild(createCheckIcon(doc));
    component.element.appendChild(icon);
    return component;
};
export const withLabelPosition = (config) => (component) => {
    const position = config.labelPosition || "end";
    const positionClass = `${config.prefix}-checkbox--label-${position}`;
    component.element.classList.add(positionClass);
    return component;
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
    checkable: {
        check: comp.checkable.check,
        uncheck: comp.checkable.uncheck,
        toggle: comp.checkable.toggle,
        isChecked: comp.checkable.isChecked,
    },
});
export default defaultConfig;
