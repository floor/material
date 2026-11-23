import { warnUnknownValue } from "../../core/utils/warn.js";
import { createTab } from "./tab.js";
export const withAPI = ({ lifecycle }) => (component) => ({
    ...component,
    element: component.element,
    addTab(config) {
        const mergedConfig = {
            ...config,
            prefix: component.config.prefix,
            variant: config.variant || component.config.variant,
            groupId: component.groupId,
        };
        if (mergedConfig.value === undefined) {
            mergedConfig.value = '';
        }
        const tab = createTab(mergedConfig);
        component.tabs.push(tab);
        const targetContainer = component.tabsContainer;
        targetContainer.appendChild(tab.element);
        if (tab.on && typeof tab.on === 'function') {
            tab.on('click', (event) => component.handleTabClick(event, tab));
        }
        else {
            tab.element.addEventListener('click', (event) => {
                component.handleTabClick(event, tab);
            });
        }
        return tab;
    },
    add(tab) {
        component.tabs.push(tab);
        const targetContainer = component.tabsContainer;
        targetContainer.appendChild(tab.element);
        if (tab.on && typeof tab.on === 'function') {
            tab.on('click', (event) => component.handleTabClick(event, tab));
        }
        else {
            tab.element.addEventListener('click', (event) => {
                component.handleTabClick(event, tab);
            });
        }
        return this;
    },
    getTabs() {
        return [...component.tabs];
    },
    getValue() {
        return this.getActiveTab()?.getValue() ?? null;
    },
    getActiveTab() {
        return component.tabs.find(tab => tab.isActive()) || null;
    },
    setActiveTab(tabOrValue) {
        const targetTab = typeof tabOrValue === 'string'
            ? component.tabs.find(tab => tab.getValue() === tabOrValue)
            : tabOrValue;
        if (!targetTab) {
            if (typeof tabOrValue === 'string') {
                component.tabs.forEach(tab => tab.deactivate());
                warnUnknownValue('tabs', tabOrValue);
            }
            return this;
        }
        component.tabs.forEach(tab => tab.deactivate());
        targetTab.activate();
        return this;
    },
    removeTab(tabOrValue) {
        const targetTab = typeof tabOrValue === 'string'
            ? component.tabs.find(tab => tab.getValue() === tabOrValue)
            : tabOrValue;
        if (!targetTab)
            return this;
        const index = component.tabs.indexOf(targetTab);
        if (index !== -1) {
            component.tabs.splice(index, 1);
        }
        if (targetTab.element.parentNode) {
            targetTab.element.parentNode.removeChild(targetTab.element);
        }
        targetTab.destroy();
        return this;
    },
    on(event, handler) {
        if (component.on) {
            component.on(event, handler);
        }
        return this;
    },
    off(event, handler) {
        if (component.off) {
            component.off(event, handler);
        }
        return this;
    },
    emit(event, data) {
        component.emit?.(event, data);
        return this;
    },
    destroy() {
        component.tabs.forEach(tab => tab.destroy());
        component.tabs.length = 0;
        lifecycle.destroy();
    }
});
export const getApiConfig = (comp) => ({
    lifecycle: {
        destroy: () => comp.lifecycle.destroy()
    }
});
