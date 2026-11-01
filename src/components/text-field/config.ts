// src/components/text-field/config.ts
import {
  createComponentConfig,
  createElementConfig,
  type BaseComponentConfig,
} from "../../core/config/component";
import { TextFieldConfig, ApiOptions } from "./types";
import type { DisabledComponent } from "../../core/compose/features/disabled";
import type { LifecycleComponent } from "../../core/compose/features/lifecycle";
import { TEXT_FIELD_DEFAULTS } from "./constants";
import { warnDev } from "../../core/utils/warn";

/**
 * Development diagnostic, the pattern of the trailing-label one: a config
 * key nothing reads was silently ignored (`maxlength` where `maxLength` is
 * supported, an `inputmode` the field never reads), so it names each
 * unknown key. The key table is a `Record` over the key types themselves,
 * kept inside the body: the compiler errors the moment the list and the
 * interfaces drift apart, and the call site's literal check lets bundlers
 * erase the call — and, with every caller gone, this function, its loop
 * and the table — in production, while warnDev's own runtime guard keeps
 * the un-bundled paths safe. `multiline` is read by the shared text-input
 * feature although the component's own interface does not carry it.
 */
const warnUnknownConfigKeys = (config: TextFieldConfig): void => {
  const CONFIG_KEYS: Record<
    keyof TextFieldConfig | keyof BaseComponentConfig | "multiline",
    true
  > = {
    type: true,
    variant: true,
    density: true,
    name: true,
    label: true,
    value: true,
    placeholder: true,
    required: true,
    noAsterisk: true,
    disabled: true,
    readonly: true,
    maxLength: true,
    pattern: true,
    autocomplete: true,
    leadingIcon: true,
    trailingIcon: true,
    trailingIconLabel: true,
    onTrailingClick: true,
    supportingText: true,
    error: true,
    prefixText: true,
    suffixText: true,
    class: true,
    prefix: true,
    componentName: true,
    className: true,
    parent: true,
    id: true,
    title: true,
    tabIndex: true,
    style: true,
    data: true,
    role: true,
    ariaLabel: true,
    ariaDescribedBy: true,
    ariaLabelledBy: true,
    ariaHidden: true,
    multiline: true,
  };
  for (const key of Object.keys(config)) {
    if (key in CONFIG_KEYS) continue;
    warnDev("text-field", `unknown config key "${key}"`);
  }
};

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
): TextFieldConfig => {
  if (/*#__PURE__*/ (() => { try { return process.env.NODE_ENV !== "production"; } catch { return false; } })() && process.env.NODE_ENV !== "production") {
    warnUnknownConfigKeys(config);
  }
  return createComponentConfig(defaultConfig, config, "text-field") as TextFieldConfig;
};

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
