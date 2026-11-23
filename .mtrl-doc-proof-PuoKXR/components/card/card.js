import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withVariant, withRipple, withLifecycle } from "../../core/compose/features/index.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig, withInteractiveBehavior, processInlineConfig, applyInlineConfiguration } from "./config.js";
const createCard = (config = {}) => {
    const processedConfig = processInlineConfig(config);
    const baseConfig = createBaseConfig(processedConfig);
    try {
        const card = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withVariant(baseConfig), baseConfig.clickable ? withRipple(baseConfig) : (c) => c, withLifecycle(), withInteractiveBehavior, comp => withAPI({ ...getApiConfig(comp), config: baseConfig })(comp))(baseConfig);
        applyInlineConfiguration(card, processedConfig);
        return card;
    }
    catch (error) {
        console.error('Card creation error:', error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to create card: ${error instanceof Error ? error.message : String(error)}`);
    }
};
export default createCard;
