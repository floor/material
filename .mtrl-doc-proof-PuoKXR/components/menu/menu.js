import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { withController, withOpener, withPosition, withKeyboard, } from "./features/index.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createMenu = (config) => {
    try {
        const baseConfig = createBaseConfig(config);
        const menu = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withLifecycle(), withPosition(baseConfig), withKeyboard(), withController(baseConfig, () => menu), withOpener(baseConfig), (comp) => withAPI(getApiConfig(comp))(comp))(baseConfig);
        if (baseConfig.on && typeof menu.on === "function") {
            Object.entries(baseConfig.on).forEach(([event, handler]) => {
                if (typeof handler === "function") {
                    menu.on(event, handler);
                }
            });
        }
        return menu;
    }
    catch (error) {
        console.error("Menu creation error:", error);
        throw new Error(`Failed to create menu: ${error.message}`);
    }
};
export default createMenu;
