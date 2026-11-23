import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withIcon, withVariant, withSize, withRipple, withDisabled, withLifecycle } from "../../core/compose/features/index.js";
import { withToggle } from "./features/toggle.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createIconButton = (config) => {
    const baseConfig = createBaseConfig(config);
    try {
        const iconButton = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withVariant(baseConfig), withSize(baseConfig), withIcon(baseConfig), withDisabled(baseConfig), withToggle(baseConfig), withRipple(baseConfig), withLifecycle(), (component) => {
            if (baseConfig.width && baseConfig.width !== 'default' && component.element) {
                const className = `${baseConfig.prefix}-${baseConfig.componentName}--${baseConfig.width}`;
                component.element.classList.add(className);
            }
            return component;
        }, (comp) => withAPI(getApiConfig(comp))(comp))(baseConfig);
        return iconButton;
    }
    catch (error) {
        console.error('IconButton creation error:', error);
        throw new Error(`Failed to create icon button: ${error.message}`);
    }
};
export default createIconButton;
