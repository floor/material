import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { withStructure, withVisibility, withContent, withButtons, withSize, withConfirm, withDivider } from "./features.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig } from "./config.js";
const createDialog = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    try {
        const dialog = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withStructure(baseConfig, () => dialog), withVisibility(() => dialog), withContent(), withButtons(() => dialog), withSize(), withDivider(), withConfirm(), withLifecycle(), withAPI)(baseConfig);
        if (baseConfig.on) {
            Object.entries(baseConfig.on).forEach(([event, handler]) => {
                if (typeof handler === 'function') {
                    dialog.on(event, handler);
                }
            });
        }
        return dialog;
    }
    catch (error) {
        console.error('Dialog creation error:', error);
        throw new Error(`Failed to create dialog: ${error.message}`);
    }
};
export default createDialog;
