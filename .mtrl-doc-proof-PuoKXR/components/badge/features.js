import { formatBadgeLabel, isBadgeOverflow, isEmptyBadgeLabel, smallBadgeLabel } from "./config.js";
const VARIANT_SMALL = 'small';
const VARIANT_LARGE = 'large';
const COLOR_ERROR = 'error';
const POSITION_TOP_RIGHT = 'top-right';
export const withVisibility = () => (component) => {
    const visible = component.config.visible !== false;
    const nothingToShow = component.config.variant !== "small" && isEmptyBadgeLabel(formatBadgeLabel(component.config.label ?? "", component.config.max));
    if (!visible || nothingToShow) {
        component.element.classList.add(`${component.getClass('badge')}--invisible`);
    }
    return {
        ...component,
        visibility: {
            show() {
                component.element.classList.remove(`${component.getClass('badge')}--invisible`);
            },
            hide() {
                component.element.classList.add(`${component.getClass('badge')}--invisible`);
            },
            toggle(visible) {
                if (visible === undefined) {
                    component.element.classList.toggle(`${component.getClass('badge')}--invisible`);
                }
                else if (visible) {
                    this.show();
                }
                else {
                    this.hide();
                }
            },
            isVisible() {
                return !component.element.classList.contains(`${component.getClass('badge')}--invisible`);
            }
        }
    };
};
export const withVariant = (config) => (component) => {
    const variant = config.variant || VARIANT_LARGE;
    component.element.classList.add(`${component.getClass('badge')}--${variant}`);
    component.element.setAttribute('role', 'status');
    if (variant === VARIANT_SMALL) {
        component.element.setAttribute('aria-label', smallBadgeLabel(config.label));
        component.element.removeAttribute('aria-hidden');
    }
    else {
        component.element.removeAttribute('aria-label');
        component.element.textContent = formatBadgeLabel(config.label ?? '', config.max);
    }
    return component;
};
export const withColor = (config) => (component) => {
    const color = config.color || COLOR_ERROR;
    component.element.classList.add(`${component.getClass('badge')}--${color}`);
    return component;
};
export const withPosition = (config) => (component) => {
    const position = config.position || POSITION_TOP_RIGHT;
    component.element.classList.add(`${component.getClass('badge')}--${position}`);
    if (config.target && config.target.parentNode) {
        component.element.classList.add(`${component.getClass('badge')}--positioned`);
    }
    return component;
};
export const withMax = (config) => (component) => {
    if (config.max === undefined || config.variant === VARIANT_SMALL) {
        return component;
    }
    component.config.max = config.max;
    if (config.label !== undefined) {
        if (isBadgeOverflow(config.label, config.max)) {
            component.element.classList.add(`${component.getClass('badge')}--overflow`);
        }
    }
    return component;
};
export const withAttachment = (config) => (component) => {
    if (!config.target) {
        return component;
    }
    const wrapper = document.createElement('div');
    wrapper.classList.add(component.getClass('badge__wrapper'));
    wrapper.style.position = 'relative';
    const parent = config.target.parentNode;
    if (parent) {
        parent.replaceChild(wrapper, config.target);
        wrapper.appendChild(config.target);
        wrapper.appendChild(component.element);
        component.wrapper = wrapper;
    }
    return component;
};
