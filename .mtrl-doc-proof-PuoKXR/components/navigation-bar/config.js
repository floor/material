import { createComponentConfig } from "../../core/config/component.js";
export const createBaseConfig = (config) => createComponentConfig({ items: [], itemLayout: 'auto', ripple: true }, config, 'navigation-bar');
