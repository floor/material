import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withVariant, withDisabled, withLifecycle, } from "../../core/compose/features/index.js";
import { withCanvas } from "./features/canvas.js";
import { withState } from "./features/state.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createProgress = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const component = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withVariant(baseConfig), withDisabled(baseConfig), withState(baseConfig), withLifecycle(), withCanvas(baseConfig), (comp) => {
            return withAPI(getApiConfig(comp))(comp);
        })(baseConfig);
        return component;
    }
    catch (error) {
        console.error("Progress creation error:", error);
        throw new Error(`Failed to create progress: ${error.message}`);
    }
};
export default createProgress;
