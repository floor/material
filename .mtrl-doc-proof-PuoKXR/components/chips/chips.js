import { pipe } from "../../core/compose/pipe.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { withContainer, withChipItems, withController, withDom, } from "./features/index.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createChips = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const component = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withContainer(baseConfig), withChipItems(baseConfig), withDom(baseConfig), withController(baseConfig), withLifecycle())(baseConfig);
        const apiOptions = getApiConfig(component, baseConfig);
        const chips = withAPI(apiOptions)(component);
        if (baseConfig.onChange)
            chips.on("change", baseConfig.onChange);
        if (baseConfig.on && typeof chips.on === "function") {
            Object.entries(baseConfig.on).forEach(([event, handler]) => {
                if (typeof handler === "function") {
                    chips.on(event, handler);
                }
            });
        }
        if (Array.isArray(baseConfig.chips) && baseConfig.chips.length > 0) {
            baseConfig.chips.forEach((chipConfig) => {
                chips.addChip(chipConfig);
            });
        }
        return chips;
    }
    catch (error) {
        console.error("Chips creation error:", error);
        throw new Error(`Failed to create chip: ${error.message}`);
    }
};
export default createChips;
