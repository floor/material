import { pipe } from "../../core/compose/pipe.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle, withVariant } from "../../core/compose/features/index.js";
import { withRenderer, withSelection } from "./features/index.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createList = (config = {}) => {
    try {
        const baseConfig = createBaseConfig(config);
        const component = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withVariant(baseConfig), withRenderer(baseConfig), withSelection(baseConfig), withLifecycle(), (comp) => withAPI(getApiConfig(comp, baseConfig))(comp))(baseConfig);
        return component;
    }
    catch (error) {
        console.error("List creation error:", error);
        throw new Error(`Failed to create list: ${error.message}`);
    }
};
export default createList;
