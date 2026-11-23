import { controlLabelConfig } from "../../core/config/control-label.js";
import { PREFIX } from "../../core/config.js";
import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { SLIDER_DEFAULTS } from "./constants.js";
export const sliderSizeClass = (size) => size === "XS" ? "" : `${PREFIX}-slider--${typeof size === "string" ? size.toLowerCase() : size}`;
export const defaultConfig = {
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
export const createBaseConfig = (config = {}) => {
    const baseConfig = createComponentConfig(defaultConfig, config, "slider");
    return baseConfig;
};
export const getElementConfig = (config) => {
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
        config.icon && config.iconPosition === "end" ? `${PREFIX}-slider--icon-end` : "",
        config.label && config.labelPosition === "end" ? `${PREFIX}-slider--label-end` : "",
    ]
        .filter(Boolean)
        .join(" ");
    const attributes = {
        tabindex: "-1",
    };
    if (config.disabled) {
        attributes["aria-disabled"] = "true";
    }
    return controlLabelConfig(createElementConfig(config, {
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
    }), config.controlLabelOnly);
};
