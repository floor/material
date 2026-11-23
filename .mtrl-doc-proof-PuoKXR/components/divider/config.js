import { createComponentConfig } from "../../core/config/component.js";
export const defaultConfig = {
    orientation: 'horizontal',
    variant: 'full-width',
    thickness: 1
};
export const createBaseConfig = (config = {}) => {
    return createComponentConfig(defaultConfig, config, 'divider');
};
