import { isBadgeOverflow, isEmptyBadgeLabel, smallBadgeLabel } from "./config.js";
import { formatBadgeLabel } from "./config.js";
const VARIANT_SMALL = "small";
const ALL_COLORS = [
    "error",
    "primary",
    "secondary",
    "tertiary",
    "success",
    "warning",
    "info",
];
const ALL_VARIANTS = ["small", "large"];
const ALL_POSITIONS = ["top-right", "top-left", "bottom-right", "bottom-left"];
export const withAPI = ({ visibility, lifecycle }) => (component) => {
    const badgeComponent = {
        element: component.element,
        wrapper: component.wrapper,
        getClass: component.getClass,
        setLabel(label) {
            component.config.label = label;
            if (component.config.variant === VARIANT_SMALL) {
                component.element.textContent = "";
                component.element.setAttribute("aria-label", smallBadgeLabel(label));
                return badgeComponent;
            }
            const formattedLabel = formatBadgeLabel(label, component.config.max);
            component.element.textContent = formattedLabel;
            component.element.removeAttribute("aria-label");
            component.element.classList.remove(`${component.getClass("badge")}--overflow`);
            if (isBadgeOverflow(label, component.config.max)) {
                component.element.classList.add(`${component.getClass("badge")}--overflow`);
            }
            if (isEmptyBadgeLabel(formattedLabel)) {
                badgeComponent.hide();
            }
            else {
                badgeComponent.show();
            }
            return badgeComponent;
        },
        getLabel() {
            return component.element.textContent || "";
        },
        setContent(content) {
            return badgeComponent.setLabel(content);
        },
        getContent() {
            return badgeComponent.getLabel();
        },
        show() {
            visibility.show();
            return badgeComponent;
        },
        hide() {
            visibility.hide();
            return badgeComponent;
        },
        toggle(visible) {
            visibility.toggle(visible);
            return badgeComponent;
        },
        isVisible() {
            return visibility.isVisible();
        },
        setMax(max) {
            component.config.max = max;
            if (component.config.label !== undefined) {
                badgeComponent.setLabel(component.config.label);
            }
            return badgeComponent;
        },
        setColor(color) {
            ALL_COLORS.forEach((colorName) => {
                component.element.classList.remove(`${component.getClass("badge")}--${colorName}`);
            });
            component.element.classList.add(`${component.getClass("badge")}--${color}`);
            return badgeComponent;
        },
        setVariant(variant) {
            ALL_VARIANTS.forEach((variantName) => {
                component.element.classList.remove(`${component.getClass("badge")}--${variantName}`);
            });
            component.element.classList.add(`${component.getClass("badge")}--${variant}`);
            component.config.variant = variant;
            component.element.removeAttribute("aria-hidden");
            component.element.setAttribute("role", "status");
            if (variant === VARIANT_SMALL) {
                component.element.textContent = "";
                component.element.setAttribute("aria-label", smallBadgeLabel(component.config.label));
            }
            else {
                component.element.removeAttribute("aria-label");
                if (component.config.label !== undefined) {
                    badgeComponent.setLabel(component.config.label);
                }
            }
            return badgeComponent;
        },
        setPosition(position) {
            ALL_POSITIONS.forEach((posName) => {
                component.element.classList.remove(`${component.getClass("badge")}--${posName}`);
            });
            component.element.classList.add(`${component.getClass("badge")}--${position}`);
            return badgeComponent;
        },
        attachTo(target) {
            if (component.wrapper &&
                component.wrapper.contains(component.element)) {
                component.wrapper.removeChild(component.element);
            }
            const wrapper = document.createElement("div");
            wrapper.classList.add(component.getClass("badge__wrapper"));
            wrapper.style.position = "relative";
            const parent = target.parentNode;
            if (parent) {
                parent.replaceChild(wrapper, target);
                wrapper.appendChild(target);
                wrapper.appendChild(component.element);
                component.element.classList.add(`${component.getClass("badge")}--positioned`);
                component.wrapper = wrapper;
                badgeComponent.wrapper = wrapper;
            }
            return badgeComponent;
        },
        detach() {
            if (component.wrapper &&
                component.wrapper.contains(component.element)) {
                component.wrapper.removeChild(component.element);
                component.element.classList.remove(`${component.getClass("badge")}--positioned`);
                document.body.appendChild(component.element);
                component.wrapper = undefined;
                badgeComponent.wrapper = undefined;
            }
            return badgeComponent;
        },
        destroy() {
            lifecycle.destroy();
            if (component.wrapper) {
                const target = component.wrapper.firstChild;
                const parent = component.wrapper.parentNode;
                if (parent && target) {
                    parent.replaceChild(target, component.wrapper);
                }
            }
        },
        addClass: (...classes) => {
            component.addClass(...classes);
            return badgeComponent;
        },
        removeClass: (...classes) => {
            component.element.classList.remove(...classes.filter(Boolean));
            return badgeComponent;
        },
        on: (event, handler) => {
            component.on(event, handler);
            return badgeComponent;
        },
        off: (event, handler) => {
            component.off(event, handler);
            return badgeComponent;
        },
    };
    return badgeComponent;
};
