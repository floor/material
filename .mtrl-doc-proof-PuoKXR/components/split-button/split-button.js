import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withVariant, withSize, withLifecycle } from "../../core/compose/features/index.js";
import { withButtons } from "./features/buttons.js";
import { withMenu } from "./features/menu.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig } from "./config.js";
const createSplitButton = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        return pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withVariant(baseConfig), withSize(baseConfig), withButtons(baseConfig), withMenu(baseConfig), withLifecycle(), (comp) => withAPI({
            config: baseConfig,
            lifecycle: { destroy: comp.lifecycle?.destroy || (() => { }) },
        })(comp))(baseConfig);
    }
    catch (error) {
        console.error("Split button creation error:", error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to create split button: ${error instanceof Error ? error.message : String(error)}`);
    }
};
export default createSplitButton;
