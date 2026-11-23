import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { withVisibility, withVariant, withColor, withPosition, withMax, withAttachment } from "./features.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createBadge = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const badge = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withVariant(baseConfig), withColor(baseConfig), withPosition(baseConfig), withMax(baseConfig), withVisibility(), withAttachment(baseConfig), withLifecycle(), comp => withAPI(getApiConfig(comp))(comp))(baseConfig);
        return badge;
    }
    catch (error) {
        console.error('Badge creation error:', error);
        throw new Error(`Failed to create badge: ${error.message}`);
    }
};
export default createBadge;
