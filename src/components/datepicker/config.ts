import { createComponentConfig, createElementConfig } from "../../core/config/component";
import type { DatePickerConfig } from "./types";
import { DEFAULT_DATE_FORMAT } from "./constants";

export const defaultConfig: DatePickerConfig = {
  variant: "docked", initialView: "day", selectionMode: "single",
  dateFormat: DEFAULT_DATE_FORMAT, animate: true, closeOnSelect: false,
};
export const createBaseConfig = (config: DatePickerConfig = {}) =>
  createComponentConfig(defaultConfig, config, "datepicker");
export const getContainerConfig = (config: DatePickerConfig) => createElementConfig(config, {
  tag: "div", forwardEvents: { keydown: true, click: true }, interactive: true,
});
export default defaultConfig;
