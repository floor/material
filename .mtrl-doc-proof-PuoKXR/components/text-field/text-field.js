import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withDisabled, withLifecycle, withVariant, withTextInput, withTextLabel, } from "../../core/compose/features/index.js";
import { withAPI } from "./api.js";
import { withLeadingIcon, withTrailingIcon, withSupportingText, withPrefixText, withSuffixText, withPlacement, withDensity, withError, withField, withCounter, withRequired, } from "./features/index.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createTextField = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const textField = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withLifecycle(), withVariant(baseConfig), withField(baseConfig), withTextInput(baseConfig), withDensity(baseConfig), withTextLabel(baseConfig), withRequired(baseConfig), withLeadingIcon(baseConfig), withTrailingIcon(baseConfig), withPrefixText(baseConfig), withSuffixText(baseConfig), withSupportingText(baseConfig), withError(baseConfig), withCounter(baseConfig), withDisabled(baseConfig), withPlacement(), (comp) => withAPI(getApiConfig(comp))(comp))(baseConfig);
        if (baseConfig.onTrailingClick)
            textField.on("trailing", baseConfig.onTrailingClick);
        return textField;
    }
    catch (error) {
        console.error("TextField creation error:", error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to create text field: ${error instanceof Error ? error.message : String(error)}`);
    }
};
export default createTextField;
