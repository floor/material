import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withText, withIcon, withVariant, withSize, withRipple, withDisabled, withLifecycle, } from "../../core/compose/features/index.js";
import { withProgress } from "./features/progress.js";
import { withToggle } from "./features/toggle.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createButton = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const button = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withVariant(baseConfig), withSize(baseConfig), withText(baseConfig), withIcon(baseConfig), withDisabled(baseConfig), withToggle(baseConfig), withRipple(baseConfig), withLifecycle(), withProgress(baseConfig), (component) => {
            if (baseConfig.shape && component.element) {
                const className = `${baseConfig.prefix}-${baseConfig.componentName}--${baseConfig.shape}`;
                component.element.classList.add(className);
            }
            return component;
        }, (comp) => withAPI(getApiConfig(comp))(comp))(baseConfig);
        return button;
    }
    catch (error) {
        console.error("Button creation error:", error);
        throw new Error(`Failed to create button: ${error.message}`);
    }
};
export default createButton;
