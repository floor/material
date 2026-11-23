import { createComponentConfig, processClassNames } from "../../core/config/component.js";
import { cornerToken } from "../../core/theme/shape.js";
import { BUTTON_GROUP_DEFAULTS, BUTTON_GROUP_DENSITY, BUTTON_GROUP_SIZE_TOKENS, BUTTON_GROUP_CONNECTED_GAP, BUTTON_GROUP_CONNECTED_PRESSED_CORNER } from "./constants.js";
export const DEFAULT_CONFIG = {
    kind: BUTTON_GROUP_DEFAULTS.KIND,
    selection: BUTTON_GROUP_DEFAULTS.SELECTION,
    shape: BUTTON_GROUP_DEFAULTS.SHAPE,
    size: BUTTON_GROUP_DEFAULTS.SIZE,
    required: false,
    variant: BUTTON_GROUP_DEFAULTS.VARIANT,
    orientation: BUTTON_GROUP_DEFAULTS.ORIENTATION,
    density: BUTTON_GROUP_DEFAULTS.DENSITY,
    ripple: BUTTON_GROUP_DEFAULTS.RIPPLE,
    equalWidth: BUTTON_GROUP_DEFAULTS.EQUAL_WIDTH,
    disabled: false,
    buttons: []
};
export const createBaseConfig = (config = {}) => createComponentConfig(DEFAULT_CONFIG, config, 'button-group');
export const getContainerConfig = (config) => {
    const variant = config.variant || BUTTON_GROUP_DEFAULTS.VARIANT;
    const orientation = config.orientation || BUTTON_GROUP_DEFAULTS.ORIENTATION;
    const density = config.density || BUTTON_GROUP_DEFAULTS.DENSITY;
    const kind = config.kind || BUTTON_GROUP_DEFAULTS.KIND;
    const selection = config.selection || BUTTON_GROUP_DEFAULTS.SELECTION;
    const labels = config.labels || BUTTON_GROUP_DEFAULTS.LABELS;
    const shape = config.shape || BUTTON_GROUP_DEFAULTS.SHAPE;
    const size = config.size || BUTTON_GROUP_DEFAULTS.SIZE;
    return {
        tag: 'div',
        componentName: 'button-group',
        attributes: {
            role: 'group',
            'aria-label': config.ariaLabel || 'Button group',
            'data-variant': variant,
            'data-orientation': orientation,
            'data-density': density,
            'data-kind': kind,
            'data-selection': selection,
            'data-shape': shape,
            'data-size': size,
            'data-labels': labels
        },
        className: [
            processClassNames(config.className || ""),
            labels === 'selected' ? `${config.prefix}-button-group--labels-selected` : null,
            config.disabled ? `${config.prefix}-button-group--disabled` : null,
            `${config.prefix}-button-group--${orientation}`,
            `${config.prefix}-button-group--${variant}`,
            `${config.prefix}-button-group--${kind}`,
            `${config.prefix}-button-group--${shape}`,
            `${config.prefix}-button-group--size-${size}`,
            selection !== 'none' ? `${config.prefix}-button-group--selectable` : null,
            density !== BUTTON_GROUP_DENSITY.DEFAULT
                ? `${config.prefix}-button-group--density-${density}`
                : null,
            config.equalWidth ? `${config.prefix}-button-group--equal-width` : null
        ].filter((name) => Boolean(name)),
        interactive: true
    };
};
const DENSITY_STEPS = {
    [BUTTON_GROUP_DENSITY.DEFAULT]: 0,
    [BUTTON_GROUP_DENSITY.COMFORTABLE]: 1,
    [BUTTON_GROUP_DENSITY.COMPACT]: 2
};
export const getSizeStyles = (prefix, size, kind, density = BUTTON_GROUP_DENSITY.DEFAULT) => {
    const tokens = BUTTON_GROUP_SIZE_TOKENS[size || BUTTON_GROUP_DEFAULTS.SIZE] || BUTTON_GROUP_SIZE_TOKENS.s;
    const gap = kind === 'connected' ? BUTTON_GROUP_CONNECTED_GAP : tokens.standardGap;
    const steps = DENSITY_STEPS[density] ?? 0;
    const styles = {
        [`--${prefix}-button-group-height`]: `${tokens.height}px`,
        [`--${prefix}-button-group-icon`]: `${tokens.icon}px`,
        [`--${prefix}-button-group-gap`]: `${gap}px`,
        [`--${prefix}-button-group-inner-corner`]: cornerToken(tokens.connectedStep, tokens.connectedCorner, prefix),
        [`--${prefix}-button-group-pressed-corner`]: cornerToken("extra-small", BUTTON_GROUP_CONNECTED_PRESSED_CORNER, prefix)
    };
    if (steps > 0) {
        styles[`--${prefix}-density`] = `${-steps}`;
    }
    return styles;
};
export const getButtonConfig = (buttonConfig, index, total, groupConfig) => {
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const isSingle = total === 1;
    let positionClass = '';
    if (isSingle) {
        positionClass = `${groupConfig.prefix}-button-group__button--single`;
    }
    else if (isFirst) {
        positionClass = `${groupConfig.prefix}-button-group__button--first`;
    }
    else if (isLast) {
        positionClass = `${groupConfig.prefix}-button-group__button--last`;
    }
    else {
        positionClass = `${groupConfig.prefix}-button-group__button--middle`;
    }
    return {
        ...buttonConfig,
        variant: groupConfig.variant,
        size: groupConfig.size || BUTTON_GROUP_DEFAULTS.SIZE,
        shape: groupConfig.shape || BUTTON_GROUP_DEFAULTS.SHAPE,
        disabled: groupConfig.disabled || buttonConfig.disabled,
        ripple: groupConfig.ripple,
        rippleConfig: groupConfig.rippleConfig,
        class: [
            `${groupConfig.prefix}-button-group__button`,
            positionClass,
            buttonConfig.class
        ].filter(Boolean).join(' ')
    };
};
export const mapVariantToButton = (variant) => {
    return variant;
};
export const validateConfig = (config) => {
    if (!config.buttons || !Array.isArray(config.buttons)) {
        return false;
    }
    for (const button of config.buttons) {
        if (button.icon && !button.text && !button.ariaLabel) {
            console.warn('Button Group: Icon-only buttons require an ariaLabel for accessibility');
        }
    }
    return true;
};
