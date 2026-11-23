import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withActionButton, withCloseButton, withDismissTimer } from "./features.js";
import { withPosition } from "./position.js";
import { withEvents, withText, withLifecycle } from "../../core/compose/features/index.js";
import { withAPI } from "./api.js";
import { createSnackbarQueue } from "./queue.js";
import { createBaseConfig, getElementConfig, getTextConfig, getApiConfig } from "./config.js";
const queue = createSnackbarQueue();
const createSnackbar = (config) => {
    if (!config.message) {
        throw new Error('Snackbar message is required');
    }
    const baseConfig = createBaseConfig(config);
    try {
        const snackbar = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withPosition(baseConfig), withText(getTextConfig(baseConfig)), withActionButton(baseConfig), withCloseButton(baseConfig), withLifecycle(), withDismissTimer(baseConfig), comp => withAPI(getApiConfig(comp, queue, baseConfig))(comp))(baseConfig);
        return snackbar;
    }
    catch (error) {
        console.error('Snackbar creation error:', error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to create snackbar: ${error instanceof Error ? error.message : String(error)}`);
    }
};
export const clearSnackbars = () => queue.clear();
export default createSnackbar;
