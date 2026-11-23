import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withTextLabel, withDisabled, withLifecycle, withInput, withCheckable } from "../../core/compose/features/index.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, withCheckIcon, withLabelPosition, getApiConfig } from "./config.js";
const enhanceWithCheckable = (component, config) => {
    const enhanced = withCheckable(config)(component);
    const syncIndeterminate = () => {
        enhanced.element.classList.toggle(`${config.prefix}-checkbox--indeterminate`, enhanced.input.indeterminate);
    };
    if (config.indeterminate) {
        enhanced.input.indeterminate = true;
    }
    syncIndeterminate();
    enhanced.on?.('change', syncIndeterminate);
    enhanced.setError = (error) => {
        enhanced.element.classList.toggle(`${config.prefix}-checkbox--error`, error);
        if (error)
            enhanced.input.setAttribute('aria-invalid', 'true');
        else
            enhanced.input.removeAttribute('aria-invalid');
        return enhanced;
    };
    enhanced.setError(!!config.error);
    enhanced.setIndeterminate = (state) => {
        enhanced.input.indeterminate = state;
        syncIndeterminate();
        return enhanced;
    };
    const clearIndeterminate = () => {
        if (enhanced.input.indeterminate) {
            enhanced.input.indeterminate = false;
            syncIndeterminate();
        }
    };
    const { checkable } = enhanced;
    if (checkable) {
        const { check, uncheck, toggle } = checkable;
        checkable.check = () => {
            clearIndeterminate();
            return check.call(checkable);
        };
        checkable.uncheck = () => {
            clearIndeterminate();
            return uncheck.call(checkable);
        };
        checkable.toggle = () => {
            clearIndeterminate();
            return toggle.call(checkable);
        };
    }
    return enhanced;
};
const createCheckbox = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const checkbox = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withInput(baseConfig), withCheckIcon(baseConfig), withTextLabel(baseConfig), withLabelPosition(baseConfig), component => enhanceWithCheckable(component, baseConfig), withDisabled(baseConfig), withLifecycle(), comp => withAPI(getApiConfig(comp))(comp))(baseConfig);
        return checkbox;
    }
    catch (error) {
        console.error('Checkbox creation error:', error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to create checkbox: ${error instanceof Error ? error.message : String(error)}`);
    }
};
export default createCheckbox;
