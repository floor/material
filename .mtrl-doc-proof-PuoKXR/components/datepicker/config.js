import { createComponentConfig, createElementConfig } from "../../core/config/component.js";
export const defaultConfig = {
    variant: "docked", initialView: "day", selectionMode: "single",
    animate: true, closeOnSelect: false,
};
export const createBaseConfig = (config = {}) => createComponentConfig(defaultConfig, config, "datepicker");
export const getContainerConfig = (config) => createElementConfig({ ...config, ariaLabel: undefined }, {
    tag: "div", forwardEvents: { keydown: true, click: true }, interactive: true,
});
export default defaultConfig;
