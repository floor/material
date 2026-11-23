import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withDisabled, withLifecycle, } from "../../core/compose/features/index.js";
import { withRadio } from "./radio.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createRadios = (config) => {
    if (!config.name) {
        config.name = `radios-${Math.random().toString(36).substring(2, 9)}`;
    }
    const baseConfig = createBaseConfig(config);
    try {
        const radios = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withRadio(baseConfig), withDisabled(baseConfig), withLifecycle(), (comp) => withAPI(getApiConfig(comp))(comp))(baseConfig);
        return radios;
    }
    catch (error) {
        console.error("Radios creation error:", error);
        throw new Error(`Failed to create radios component: ${error.message}`);
    }
};
export default createRadios;
