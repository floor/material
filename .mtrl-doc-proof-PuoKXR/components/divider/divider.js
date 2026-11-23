import { createBase, withElement, pipe, withVariant } from "../../core/compose/index.js";
import { createBaseConfig } from "./config.js";
import { withOrientation, withInset, withStyle } from "./features.js";
export const createDivider = (config = {}) => {
    const processedConfig = createBaseConfig(config);
    return pipe(createBase, withElement({
        tag: "hr",
        componentName: "divider",
        className: config.class,
    }), withOrientation(processedConfig), withVariant(processedConfig), withInset(processedConfig), withStyle(processedConfig))(processedConfig);
};
