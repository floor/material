import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withTextLabel, withDisabled, withLifecycle, withInput, withCheckable, } from "../../core/compose/features/index.js";
import { withAPI } from "./api.js";
import { withSupportingText, withTrack } from "./features.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createSwitch = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const switchComponent = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withInput(baseConfig), withTextLabel(baseConfig), withTrack(baseConfig), withSupportingText(baseConfig), withCheckable(baseConfig), withDisabled(baseConfig), withLifecycle(), (comp) => withAPI(getApiConfig(comp))(comp))(baseConfig);
        const host = switchComponent;
        for (const type of ["focus", "blur"]) {
            host.input?.addEventListener(type, (event) => host.emit?.(type, event));
        }
        return switchComponent;
    }
    catch (error) {
        console.error("Switch creation error:", error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to create switch: ${error instanceof Error ? error.message : String(error)}`);
    }
};
export default createSwitch;
