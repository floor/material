import createButton from "../../button/index.js";
import { SPLIT_BUTTON_CLASSES, SPLIT_BUTTON_CHEVRON } from "../constants.js";
export const withButtons = (config) => (component) => {
    const prefix = config.prefix || "mtrl";
    const cls = (name) => `${prefix}-${name}`;
    const shared = {
        variant: config.variant,
        size: config.size,
        disabled: config.disabled,
        prefix,
    };
    const leading = createButton({
        ...shared,
        text: config.text,
        icon: config.icon,
        ariaLabel: config.ariaLabel,
        class: cls(SPLIT_BUTTON_CLASSES.LEADING),
    });
    const trailing = createButton({
        ...shared,
        icon: SPLIT_BUTTON_CHEVRON,
        iconSize: "inherit",
        ariaLabel: config.trailingLabel,
        class: cls(SPLIT_BUTTON_CLASSES.TRAILING),
    });
    const chevron = trailing.element.querySelector("svg");
    chevron?.classList.add(cls(SPLIT_BUTTON_CLASSES.CHEVRON));
    trailing.element.setAttribute("aria-haspopup", "true");
    trailing.element.setAttribute("aria-expanded", "false");
    component.element.appendChild(leading.element);
    component.element.appendChild(trailing.element);
    return {
        ...component,
        leading,
        trailing,
        leadingElement: leading.element,
        trailingElement: trailing.element,
    };
};
