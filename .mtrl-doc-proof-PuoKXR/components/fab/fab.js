import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withIcon, withVariant, withRipple, withDisabled, withLifecycle } from "../../core/compose/features/index.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createFab = (config) => {
    const fabConfig = createBaseConfig(config);
    try {
        const fab = pipe(createBase, withEvents(), withElement(getElementConfig(fabConfig)), withVariant(fabConfig), withIcon(fabConfig), withDisabled(fabConfig), withRipple(fabConfig), withLifecycle(), comp => withAPI(getApiConfig(comp))(comp))(fabConfig);
        return fab;
    }
    catch (error) {
        console.error('FAB creation error:', error);
        throw new Error(`Failed to create FAB: ${error.message}`);
    }
};
export default createFab;
