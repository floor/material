import { createComponentConfig, createElementConfig } from "../../core/config/component";
import type { DatePickerConfig } from "./types";

export const defaultConfig: DatePickerConfig = {
  variant: "docked", initialView: "day", selectionMode: "single",
  animate: true, closeOnSelect: false,
};
export const createBaseConfig = (config: DatePickerConfig = {}) =>
  createComponentConfig(defaultConfig, config, "datepicker");
export const getContainerConfig = (config: DatePickerConfig) => createElementConfig({ ...config, ariaLabel: undefined }, {
  tag: "div", forwardEvents: { keydown: true, click: true }, interactive: true,
});
export default defaultConfig;
