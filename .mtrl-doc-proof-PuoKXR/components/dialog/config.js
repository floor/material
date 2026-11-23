import { createComponentConfig, createElementConfig } from "../../core/config/component.js";
import { supportsTopLayer } from "../../core/dom/layer.js";
export const defaultConfig = {
    size: 'medium',
    animation: 'scale',
    footerAlignment: 'right',
    open: false,
    closeOnOverlayClick: true,
    closeOnEscape: true,
    modal: true,
    autofocus: true,
    trapFocus: true,
    divider: false,
    buttons: []
};
export const createBaseConfig = (config = {}) => {
    const merged = createComponentConfig(defaultConfig, config, 'dialog');
    if (merged.layer === 'top' && !supportsTopLayer('modal'))
        merged.layer = undefined;
    return merged;
};
export const getElementConfig = (config) => {
    const role = config.role ||
        (config.size === 'fullscreen' ? 'dialog' : 'alertdialog');
    const attributes = {
        role,
        tabindex: -1
    };
    if (config.modal !== false) {
        attributes['aria-modal'] = 'true';
    }
    return createElementConfig({ ...config, title: undefined }, {
        tag: config.layer === 'top' ? 'dialog' : 'div',
        attributes,
        className: config.class
    });
};
export default defaultConfig;
