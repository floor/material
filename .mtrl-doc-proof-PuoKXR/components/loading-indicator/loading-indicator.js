import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withLifecycle } from "../../core/compose/features/index.js";
import { withRenderer } from "./features/renderer.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig } from "./config.js";
const createLoadingIndicator = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        return pipe(createBase, withElement(getElementConfig(baseConfig)), withLifecycle(), withRenderer(baseConfig), (comp) => withAPI({ config: baseConfig, lifecycle: { destroy: comp.lifecycle?.destroy || (() => { }) } })(comp))(baseConfig);
    }
    catch (error) {
        console.error('Loading indicator creation error:', error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to create loading indicator: ${error instanceof Error ? error.message : String(error)}`);
    }
};
export default createLoadingIndicator;
