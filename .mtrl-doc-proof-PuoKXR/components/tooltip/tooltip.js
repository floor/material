import { PREFIX } from "../../core/config.js";
import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withLifecycle } from "../../core/compose/features/index.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createTooltipId = () => {
    return `${PREFIX}-tooltip-${Math.random().toString(36).substring(2, 9)}`;
};
const createTooltip = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const tooltip = pipe(createBase, withElement(getElementConfig(baseConfig)), withLifecycle(), comp => withAPI(getApiConfig(comp))(comp))(baseConfig);
        tooltip.element.id = createTooltipId();
        if (baseConfig.target) {
            tooltip.setTarget(baseConfig.target);
        }
        if (baseConfig.text) {
            tooltip.setText(baseConfig.text);
        }
        if (baseConfig.visible) {
            tooltip.show(true);
        }
        return tooltip;
    }
    catch (error) {
        console.error('Tooltip creation error:', error);
        throw new Error(`Failed to create tooltip: ${error.message}`);
    }
};
export default createTooltip;
