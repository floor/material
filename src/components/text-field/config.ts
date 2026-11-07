import { controlLabelConfig } from "../../core/config/control-label";
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
    // Development diagnostic, the pattern of the trailing-label one: a config key
    // nothing reads was silently ignored (`maxlength` where `maxLength` is
    // supported, an `inputmode` the field never reads), so it names each unknown
    // key. The accepted keys are one string, cheaper in the bundle than a table
    // of them; the runtime reads it as the checked set, and the compile-time
    // checks below hold it against the interfaces — every accepted key must be
    // listed, and every listed key must be accepted — so the two cannot drift
    // quietly. The literal guard above lets bundlers erase this block, its loop
    // and the list together in production, while warnDev's own runtime guard
    // keeps the un-bundled paths safe. `multiline` is read by the shared
    // text-input feature although the component's interface does not carry it.
    type AcceptedKey = keyof TextFieldConfig | keyof BaseComponentConfig | "multiline";
    type Words<S extends string> = S extends `${infer Word} ${infer Rest}` ? Word | Words<Rest> : S;
    const KEY_LIST =
      "type variant density name label value placeholder required noAsterisk disabled readonly maxLength pattern autocomplete leadingIcon trailingIcon trailingIconLabel onTrailingClick supportingText error prefixText suffixText class prefix componentName className parent id title tabIndex style data role ariaLabel ariaDescribedBy ariaLabelledBy ariaHidden multiline controlLabelOnly";
    type ListedKey = Words<typeof KEY_LIST>;
    const _complete: Exclude<AcceptedKey, ListedKey> extends never ? true : never = true;
    const _sound: ListedKey extends AcceptedKey ? true : never = true;
    const CONFIG_KEYS = KEY_LIST.split(" ");
    for (const key of Object.keys(config)) {
      if (!CONFIG_KEYS.includes(key)) warnDev("text-field", `unknown config key "${key}"`);
    }
  }
  return createComponentConfig(defaultConfig, config, "text-field") as TextFieldConfig;
};

/**
 * Generates element configuration for the TextField component
 * @param {TextFieldConfig} config - TextField configuration
 * @returns {Object} Element configuration object for withElement
 */
export const getElementConfig = (config: TextFieldConfig) =>
  controlLabelConfig(createElementConfig(config, {
    tag: "div",
    className: config.class,
  }), config.controlLabelOnly);

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
