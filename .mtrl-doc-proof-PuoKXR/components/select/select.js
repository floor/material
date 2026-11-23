import { pipe } from "../../core/compose/index.js";
import { createBase } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { withTextField, withMenu } from "./features.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getApiConfig } from "./config.js";
const createSelect = (config) => {
    try {
        const baseConfig = createBaseConfig(config);
        const select = pipe(createBase, withEvents(), withTextField(baseConfig), withMenu(baseConfig, () => select), withLifecycle(), comp => withAPI(getApiConfig(comp))(comp))(baseConfig);
        if (config.on) {
            if (config.on.change)
                select.on('change', config.on.change);
            if (config.on.open)
                select.on('open', config.on.open);
            if (config.on.close)
                select.on('close', config.on.close);
        }
        return select;
    }
    catch (error) {
        console.error('Select creation error:', error);
        throw new Error(`Failed to create select: ${error.message}`);
    }
};
export default createSelect;
