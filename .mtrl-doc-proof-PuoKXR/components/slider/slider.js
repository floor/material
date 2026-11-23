import { pipe } from "../../core/compose/pipe.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle, withIcon, withTextLabel, } from "../../core/compose/features/index.js";
import { withStates, withController, withTracks, withDom, } from "./features/index.js";
import { createBaseConfig, getElementConfig } from "./config.js";
const createSlider = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const slider = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withDom(baseConfig), withTextLabel(baseConfig), withIcon(baseConfig), withLifecycle(), withStates(baseConfig), withTracks(baseConfig), withController(baseConfig, () => slider))(baseConfig);
        if (baseConfig.on && typeof slider.on === "function") {
            Object.entries(baseConfig.on).forEach(([event, handler]) => {
                if (typeof handler === "function") {
                    slider.on(event, handler);
                }
            });
        }
        return slider;
    }
    catch (error) {
        console.error("Slider creation error:", error);
        throw new Error(`Failed to create slider: ${error.message}`);
    }
};
export default createSlider;
