// src/components/slider/config.ts
// Class names are written out in full. The class helpers no longer add the
// `mtrl-` prefix for you, so a modifier built here carries it.
import { PREFIX } from "../../core/config";
import {
  createComponentConfig,
  createElementConfig,
} from "../../core/config/component";
import { SliderConfig } from "./types";
import { SLIDER_DEFAULTS, SliderSize } from "./constants";

/**
 * The root's size modifier: none for the default XS, the lowercase name otherwise, or
 * the pixel height for a numeric size. Shared with setSize, which swaps it.
 */
export const sliderSizeClass = (size: SliderSize): string =>
  size === "XS" ? "" : `${PREFIX}-slider--${typeof size === "string" ? size.toLowerCase() : size}`;

/**
 * Default configuration for the Slider component
 */
export const defaultConfig: SliderConfig = {
  min: SLIDER_DEFAULTS.MIN,
  max: SLIDER_DEFAULTS.MAX,
  value: SLIDER_DEFAULTS.VALUE,
  step: SLIDER_DEFAULTS.STEP,
  disabled: SLIDER_DEFAULTS.DISABLED,
  color: SLIDER_DEFAULTS.COLOR,
  size: SLIDER_DEFAULTS.SIZE,
  ticks: SLIDER_DEFAULTS.TICKS,
  showValue: SLIDER_DEFAULTS.SHOW_VALUE,
  snapToSteps: SLIDER_DEFAULTS.SNAP_TO_STEPS,
  range: SLIDER_DEFAULTS.RANGE,
  centered: SLIDER_DEFAULTS.CENTERED,
  iconPosition: SLIDER_DEFAULTS.ICON_POSITION,
  labelPosition: SLIDER_DEFAULTS.LABEL_POSITION,
  valueFormatter: (value) => value.toString(),
};

/**
 * Creates the base configuration for Slider component
 * @param {SliderConfig} config - User provided configuration
 * @returns {SliderConfig} Complete configuration with defaults applied
 */
export const createBaseConfig = (config: SliderConfig = {}): SliderConfig => {
  // Create the base config with defaults applied
  const baseConfig = createComponentConfig(
    defaultConfig,
    config,
    "slider",
  ) as SliderConfig;

  // Schema is no longer needed as we use direct DOM creation

  return baseConfig;
};

/**
 * Generates element configuration for the Slider component
 * @param {SliderConfig} config - Slider configuration
 * @returns {Object} Element configuration object for withElement
 */
export const getElementConfig = (config: SliderConfig) => {
  const classes = [
    "slider",
    config.class,
    config.disabled ? `${PREFIX}-slider--disabled` : "",
    config.size ? sliderSizeClass(config.size) : "",
    config.color && config.color !== "primary" ? `${PREFIX}-slider--${config.color}` : "",
    config.range ? `${PREFIX}-slider--range` : "",
    config.centered ? `${PREFIX}-slider--centered` : "",
    config.orientation === "vertical" ? `${PREFIX}-slider--vertical` : "",
    config.icon ? `${PREFIX}-slider--icon` : "",
    // Where the icon and the label go: the icon before or after the track (the M3
    // guidelines' icons at either end), the label above or below it.
    config.icon && config.iconPosition === "end" ? `${PREFIX}-slider--icon-end` : "",
    config.label && config.labelPosition === "end" ? `${PREFIX}-slider--label-end` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Root element is a presentational wrapper — ARIA slider attributes
  // belong on the handle elements (set in dom.ts), not here.
  const attributes: Record<string, string> = {
    tabindex: "-1",
  };

  if (config.disabled) {
    attributes["aria-disabled"] = "true";
  }

  return createElementConfig(config, {
    tag: "div",
    attributes,
    className: classes,
    forwardEvents: {
      click: true,
      keydown: true,
      touchstart: true,
      touchmove: true,
      touchend: true,
      mousedown: true,
      mousemove: true,
      mouseup: true,
    },
    interactive: true,
  });
};

