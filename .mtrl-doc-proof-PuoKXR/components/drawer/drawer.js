import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withVariant, withLifecycle, } from "../../core/compose/features/index.js";
import { withItems, withState, withHeadline } from "./features/index.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
import { DRAWER_DEFAULTS } from "./constants.js";
export default function createDrawer(config = {}) {
    return buildDrawer(config, false);
}
export const createShadowDrawer = (config) => buildDrawer(config, true);
const buildDrawer = (config, shadow) => {
    const baseConfig = createBaseConfig(config);
    try {
        const drawer = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withVariant(baseConfig), withHeadline(baseConfig), withItems(baseConfig, shadow), withState(baseConfig), withLifecycle(), (component) => {
            const sheetEl = document.createElement("div");
            sheetEl.className = component.getClass("drawer__sheet");
            const width = baseConfig.width;
            const widthValue = width
                ? typeof width === "number"
                    ? `${width}px`
                    : width
                : `${DRAWER_DEFAULTS.WIDTH}px`;
            component.element.style.setProperty(`--${baseConfig.prefix}-drawer-width`, widthValue);
            if (component.headlineElement) {
                sheetEl.appendChild(component.headlineElement);
            }
            if (component.itemsContainer) {
                sheetEl.appendChild(component.itemsContainer);
            }
            if (component.scrimElement) {
                component.element.appendChild(component.scrimElement);
            }
            component.element.appendChild(sheetEl);
            const position = baseConfig.position || "start";
            component.element.classList.add(`${component.getClass("drawer")}--${position}`);
            return component;
        }, (comp) => withAPI(getApiConfig(comp))(comp))(baseConfig);
        if (baseConfig.onSelect)
            drawer.on("select", baseConfig.onSelect);
        if (baseConfig.onOpen)
            drawer.on("open", baseConfig.onOpen);
        if (baseConfig.onClose)
            drawer.on("close", baseConfig.onClose);
        if (baseConfig.onExpand)
            drawer.on("expand", baseConfig.onExpand);
        if (baseConfig.onCollapse)
            drawer.on("collapse", baseConfig.onCollapse);
        return drawer;
    }
    catch (error) {
        console.error("Drawer creation error:", error);
        throw new Error(`Failed to create drawer: ${error.message}`);
    }
};
export const createNavigationDrawer = createDrawer;
