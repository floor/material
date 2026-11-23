import { createComponentConfig, createElementConfig, } from "../../core/config/component.js";
import { SNACKBAR_DEFAULTS, SNACKBAR_DURATION_MS } from "./constants.js";
import { supportsTopLayer } from "../../core/dom/layer.js";
export const defaultConfig = {
    position: SNACKBAR_DEFAULTS.POSITION,
    queueBehavior: SNACKBAR_DEFAULTS.QUEUE_BEHAVIOR,
    closeLabel: SNACKBAR_DEFAULTS.CLOSE_LABEL,
};
export const createBaseConfig = (config) => {
    const merged = createComponentConfig(defaultConfig, config, 'snackbar');
    if (merged.layer === 'top' && !supportsTopLayer('popover-manual')) {
        merged.layer = undefined;
    }
    return merged;
};
export const durationToMs = (duration, hasAction) => {
    if (duration === undefined || duration === null) {
        return hasAction ? SNACKBAR_DURATION_MS.indefinite : SNACKBAR_DURATION_MS.short;
    }
    if (typeof duration === 'number') {
        return Number.isFinite(duration) && duration > 0 ? duration : 0;
    }
    return SNACKBAR_DURATION_MS[duration] ?? SNACKBAR_DURATION_MS.short;
};
export const getElementConfig = (config) => createElementConfig(config, {
    tag: 'div',
    attributes: { role: 'status' },
});
export const getTextConfig = (config) => ({
    ...config,
    text: config.message,
});
export const getApiConfig = (comp, queue, config) => ({
    lifecycle: {
        destroy: comp.lifecycle?.destroy || (() => { }),
    },
    queue,
    config,
});
export default defaultConfig;
