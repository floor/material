import { pipe } from "../../core/compose/index.js";
import { createBase } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { withAPI, getApiConfig } from "./api.js";
import { withTabsManagement, withScrollable, withDivider, withIndicator } from "./features.js";
import { createTabsConfig, getTabsElementConfig } from "./config.js";
import { setupKeyboardNavigation, syncTabStops, updateTabPanels } from "./utils.js";
const createTabs = (config = {}) => {
    const baseConfig = createTabsConfig(config);
    try {
        const component = pipe(createBase, withEvents(), getTabsElementConfig(baseConfig), withScrollable(baseConfig), withTabsManagement(baseConfig), withDivider(baseConfig), withIndicator(baseConfig), withLifecycle(), comp => withAPI(getApiConfig(comp))(comp))(baseConfig);
        if (config.on) {
            Object.entries(config.on).forEach(([event, handler]) => {
                if (typeof handler === 'function')
                    component.on(event, handler);
            });
        }
        setupKeyboardNavigation(component, { autoActivate: config.autoActivate });
        component.on('change', () => syncTabStops(component));
        for (const method of ['addTab', 'add', 'removeTab', 'setActiveTab']) {
            const original = component[method];
            component[method] = (...args) => {
                const result = original.apply(component, args);
                syncTabStops(component);
                if (method === 'setActiveTab')
                    updateTabPanels(component);
                return result;
            };
        }
        config.responsive?.(component);
        return component;
    }
    catch (error) {
        console.error('Tabs creation error:', error);
        throw new Error(`Failed to create tabs: ${error.message}`);
    }
};
export default createTabs;
