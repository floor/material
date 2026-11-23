import { createTab } from "./tab.js";
import { allocateTabsGroupId, updateTabPanels } from "./utils.js";
import { createTabIndicator } from "./indicator.js";
import { TABS_DEFAULTS } from "./constants.js";
const isCancelable = (event) => !!event && typeof event.preventDefault === "function";
export const withTabsManagement = (config) => (component) => {
    const groupId = config.groupId ?? allocateTabsGroupId();
    const tabs = [];
    const tabsContainer = component.scrollContainer || component.element;
    if (Array.isArray(config.tabs)) {
        config.tabs.forEach((tabConfig) => {
            const mergedConfig = {
                ...tabConfig,
                prefix: config.prefix,
                variant: tabConfig.variant || config.variant,
                groupId,
            };
            const tab = createTab(mergedConfig);
            tabs.push(tab);
            tabsContainer.appendChild(tab.element);
        });
    }
    const getTabs = () => {
        return [...tabs];
    };
    const getActiveTab = () => {
        return tabs.find((tab) => tab.isActive()) || null;
    };
    const handleTabClick = (event, tab) => {
        if (isCancelable(event)) {
            event.preventDefault();
        }
        if (tab.element.disabled) {
            return;
        }
        tabs.forEach((t) => t.deactivate());
        tab.activate();
        const value = tab.getValue();
        updateTabPanels({
            tabs,
            getActiveTab: () => tabs.find((t) => t.isActive()) || null,
        });
        if (typeof component["emit"] === "function") {
            component["emit"]("change", {
                tab,
                value,
            });
        }
    };
    tabs.forEach((tab) => {
        if (tab.on && typeof tab.on === "function") {
            tab.on("click", (event) => handleTabClick(event, tab));
        }
        else {
            tab.element.addEventListener("click", (event) => handleTabClick(event, tab));
        }
    });
    return {
        ...component,
        tabs,
        tabsContainer,
        handleTabClick,
        groupId,
        getTabs,
        getActiveTab,
    };
};
export const withScrollable = (config) => (component) => {
    if (config.scrollable === false) {
        return component;
    }
    component.element.classList.add(`${component.getClass("tabs")}--scrollable`);
    const scrollContainer = document.createElement("div");
    scrollContainer.className = `${component.getClass("tabs")}__scroll`;
    while (component.element.firstChild) {
        scrollContainer.appendChild(component.element.firstChild);
    }
    component.element.appendChild(scrollContainer);
    return {
        ...component,
        scrollContainer,
    };
};
export const withDivider = (config) => (component) => {
    if (config.showDivider === false) {
        return component;
    }
    const divider = document.createElement("div");
    divider.className = `${component.getClass("tabs")}__divider`;
    component.element.appendChild(divider);
    return component;
};
export const withIndicator = (config) => (component) => {
    const indicatorConfig = config.indicator || {};
    const indicator = createTabIndicator({
        prefix: config.prefix,
        widthStrategy: indicatorConfig.widthStrategy || TABS_DEFAULTS.INDICATOR_WIDTH_STRATEGY,
        height: indicatorConfig.height,
        fixedWidth: indicatorConfig.fixedWidth || TABS_DEFAULTS.INDICATOR_FIXED_WIDTH,
        animationDuration: indicatorConfig.animationDuration,
        animationTiming: indicatorConfig.animationTiming,
        color: indicatorConfig.color,
        visible: indicatorConfig.visible,
        variant: config.variant ?? "primary",
    });
    const scrollContainer = component.scrollContainer || component.element;
    if (!scrollContainer) {
        console.error("No scroll container found - cannot add indicator");
        throw new Error("Failed to create tabs: No scroll container found");
    }
    scrollContainer.appendChild(indicator.element);
    const originalHandleTabClick = component.handleTabClick;
    component.handleTabClick = function (event, tab) {
        if (tab.element.disabled) {
            return;
        }
        originalHandleTabClick.call(this, event, tab);
        setTimeout(() => {
            indicator.moveToTab(tab);
        }, 10);
    };
    const updateIndicator = () => {
        const activeTab = component.tabs.find((tab) => tab.isActive());
        if (activeTab) {
            indicator.moveToTab(activeTab, true);
        }
    };
    updateIndicator();
    setTimeout(updateIndicator, 50);
    if (scrollContainer) {
        scrollContainer.addEventListener("scroll", updateIndicator);
    }
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateIndicator) : null;
    resizeObserver?.observe(scrollContainer);
    const mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "attributes" &&
                mutation.attributeName === "class" &&
                mutation.target.classList.contains(`${config.prefix}-tab--active`)) {
                const tabElement = mutation.target;
                const activeTab = component.tabs.find((tab) => tab.element === tabElement);
                if (activeTab) {
                    indicator.moveToTab(activeTab);
                }
            }
        }
    });
    if (Array.isArray(component.tabs)) {
        component.tabs.forEach((tab) => {
            if (tab.element) {
                mutationObserver.observe(tab.element, { attributes: true });
            }
        });
    }
    const originalDestroy = component.destroy || (() => { });
    component.destroy = function () {
        indicator.destroy();
        resizeObserver?.disconnect();
        mutationObserver.disconnect();
        if (scrollContainer) {
            scrollContainer.removeEventListener("scroll", updateIndicator);
        }
        if (typeof originalDestroy === "function") {
            originalDestroy.call(this);
        }
    };
    return {
        ...component,
        indicator,
        getIndicator: () => indicator,
    };
};
