// src/components/button/config.ts
import { PREFIX } from "../../core/config";
import { createComponentConfig, createElementConfig } from "../../core/config/component";
import { ButtonConfig } from "./types";
import {
  BUTTON_VARIANTS,
  BUTTON_TYPES,
  DEFAULT_RIPPLE_CONFIG,
  BUTTON_SIZES,
  BUTTON_SHAPES,
} from "./constants";

/**
 * Default configuration for the Button component.
 * These values will be used when not explicitly specified by the user.
 *
 * @category Components
 */
export const defaultConfig: ButtonConfig = {
  variant: BUTTON_VARIANTS.FILLED,
  size: BUTTON_SIZES.S,
  shape: BUTTON_SHAPES.ROUND,
  disabled: false,
  type: BUTTON_TYPES.BUTTON,
  ripple: true, // Explicitly enable ripple effects by default
  rippleConfig: {
    duration: DEFAULT_RIPPLE_CONFIG.DURATION,
  },
};

/**
 * Creates the base configuration for Button component by merging user-provided
 * config with default values. Global configuration is automatically applied
 * by createComponentConfig.
 *
 * @param {ButtonConfig} config - User provided configuration
 * @param {boolean} isolated - Internal. Build from the button defaults plus
 *   this config. The public button registry is not read and not written.
 * @returns {ButtonConfig} Complete configuration with defaults applied
 * @category Components
 * @internal
 */
/**
 * The same merge as `createComponentConfig`, without reading the public registry.
 * An item build uses this so a public button default does not reach it.
 */
const isolatedButtonConfig = (config: ButtonConfig): ButtonConfig => {
  const userClassName = config.className !== undefined ? config.className : config.class;
  const defaultClassName =
    defaultConfig.className !== undefined ? defaultConfig.className : defaultConfig.class;
  const merged: ButtonConfig & { prefix: string } = {
    ...defaultConfig,
    ...config,
    componentName: "button",
    prefix: PREFIX,
    className: userClassName !== undefined ? userClassName : defaultClassName,
  };
  if ("class" in merged && merged.className !== undefined) {
    delete merged.class;
  }
  return merged;
};

export const createBaseConfig = (config: ButtonConfig = {}, isolated = false): ButtonConfig =>
  (isolated
    ? isolatedButtonConfig(config)
    : createComponentConfig(defaultConfig, config, "button")) as ButtonConfig;

/**
 * Generates element configuration for the Button component.
 * This function creates the necessary attributes and configuration
 * for the DOM element creation process.
 *
 * @param {ButtonConfig} config - Button configuration
 * @returns {Object} Element configuration object for withElement
 * @category Components
 * @internal
 */
export const getElementConfig = (config: ButtonConfig) => {
  // Create the attributes object
  const attributes: Record<string, string | boolean | undefined> = {
    type: config.type || "button",
  };

  // Only add disabled attribute if it's explicitly true
  if (config.disabled === true) {
    attributes.disabled = true;
  }

  // Add value attribute only if it exists
  if (config.value !== undefined) {
    attributes.value = config.value;
  }

  // Add aria-label attribute for accessibility
  if (config.ariaLabel) {
    attributes["aria-label"] = config.ariaLabel;
  }

  return createElementConfig(config, {
    tag: "button",
    attributes,
    className: config.class,
    forwardEvents: {
      click: (component: { element: HTMLButtonElement }) =>
        !component.element.disabled,
      focus: true,
      blur: true,
    },
  });
};

/**
 * Creates API configuration for the Button component.
 * This connects the core component features (like disabled state)
 * to the public API methods exposed to users.
 *
 * @param {Object} comp - Component with disabled and lifecycle features
 * @returns {Object} API configuration object
 * @category Components
 * @internal
 */
export const getApiConfig = (comp: {
  disabled: {
    enable: () => void;
    disable: () => void;
    isDisabled: () => boolean;
  };
  lifecycle: { destroy: () => void };
}) => ({
  disabled: {
    enable: () => comp.disabled.enable(),
    disable: () => comp.disabled.disable(),
    isDisabled: () => comp.disabled.isDisabled(),
  },
  lifecycle: {
    destroy: () => comp.lifecycle.destroy(),
  },
});

export default defaultConfig;
