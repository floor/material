// src/components/text-field/config.ts
import {
  createComponentConfig,
  createElementConfig,
} from "../../core/config/component";
import { TextFieldConfig, ApiOptions } from "./types";
import type { DisabledComponent } from "../../core/compose/features/disabled";
import type { LifecycleComponent } from "../../core/compose/features/lifecycle";
import { TEXT_FIELD_DEFAULTS } from "./constants";

/**
 * Default configuration for the TextField component
 */
export const defaultConfig: TextFieldConfig = {
  type: TEXT_FIELD_DEFAULTS.TYPE,
  variant: TEXT_FIELD_DEFAULTS.VARIANT,
};

/**
 * Creates the base configuration for TextField component
 * @param {TextFieldConfig} config - User provided configuration
 * @returns {TextFieldConfig} Complete configuration with defaults applied
 */
export const createBaseConfig = (
  config: TextFieldConfig = {}
): TextFieldConfig =>
  createComponentConfig(defaultConfig, config, "text-field") as TextFieldConfig;

/**
 * Generates element configuration for the TextField component
 * @param {TextFieldConfig} config - TextField configuration
 * @returns {Object} Element configuration object for withElement
 */
export const getElementConfig = (config: TextFieldConfig) =>
  createElementConfig(config, {
    tag: "div",
    className: config.class,
  });

/**
 * Creates API configuration for the TextField component
 * @param comp - Component with the disabled and lifecycle features applied
 * @returns {ApiOptions} API configuration object
 */
export const getApiConfig = (
  comp: DisabledComponent & LifecycleComponent,
): ApiOptions => ({
  disabled: {
    enable: comp.disabled.enable,
    disable: comp.disabled.disable,
    isDisabled: comp.disabled.isDisabled,
  },
  lifecycle: {
    destroy: comp.lifecycle.destroy,
  },
});

export default defaultConfig;
