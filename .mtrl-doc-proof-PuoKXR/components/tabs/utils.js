export function getActiveTab(component) {
    if (typeof component.getActiveTab === "function") {
        return component.getActiveTab();
    }
    if (Array.isArray(component.tabs)) {
        return component.tabs.find((tab) => tab.isActive && tab.isActive()) ?? null;
    }
    return null;
}
let nextTabsGroupId = 0;
export function allocateTabsGroupId() {
    return `tabs-${++nextTabsGroupId}`;
}
const derive = (prefix, groupId, value) => /^[\w-]*$/.test(value)
    ? `${prefix}-${groupId}-${value}`
    : `${prefix}x-${groupId}-${value.replace(/[^A-Za-z0-9-]/gu, (c) => c === "_" ? "__" : `_${c.codePointAt(0).toString(16)}_`)}`;
export const tabIdFor = (groupId, value) => derive("tab", groupId, value);
export const tabPanelIdFor = (groupId, value) => derive("tabpanel", groupId, value);
const tabGroups = new WeakMap();
export function registerTab(element, groupId, value) {
    element.setAttribute("data-value", value);
    tabGroups.set(element, groupId);
}
export function findRegisteredPanel(tab) {
    const tabId = tab.id;
    if (!tabId || typeof document === "undefined")
        return null;
    const labelled = Array.from(document.querySelectorAll('[role="tabpanel"]'))
        .find((panel) => panel.getAttribute("aria-labelledby") === tabId);
    if (labelled)
        return labelled;
    const value = tab.getAttribute("data-value");
    const groupId = tabGroups.get(tab);
    if (value !== null && groupId !== undefined) {
        const byConvention = document.getElementById(tabPanelIdFor(groupId, value));
        if (byConvention?.getAttribute("role") === "tabpanel")
            return byConvention;
    }
    return null;
}
export function syncTabControls(element) {
    const panel = findRegisteredPanel(element);
    if (panel?.id) {
        element.setAttribute("aria-controls", panel.id);
    }
    else {
        element.removeAttribute("aria-controls");
    }
}
export function updateTabPanels(component) {
    const tabs = (typeof component.getTabs === "function"
        ? component.getTabs()
        : component.tabs ?? []);
    const activeTab = getActiveTab(component);
    for (const tab of tabs) {
        if (!tab?.element)
            continue;
        syncTabControls(tab.element);
        const panel = findRegisteredPanel(tab.element);
        if (!panel)
            continue;
        if (tab === activeTab) {
            panel.removeAttribute("hidden");
            panel.setAttribute("tabindex", "0");
        }
        else {
            panel.setAttribute("hidden", "true");
            panel.setAttribute("tabindex", "-1");
        }
    }
}
const isEnabledTab = (tab) => !tab.element.disabled && tab.element.getAttribute("aria-disabled") !== "true";
export function syncTabStops(component) {
    if (typeof component.getTabs !== "function")
        return;
    const tabs = component.getTabs();
    const enabled = tabs.filter(isEnabledTab);
    const active = getActiveTab(component);
    const stop = active && enabled.includes(active) ? active : enabled[0];
    tabs.forEach((tab) => tab.element.setAttribute("tabindex", tab === stop ? "0" : "-1"));
}
export function setupKeyboardNavigation(component, options = {}) {
    if (!component.element)
        return;
    const tablist = component.element;
    syncTabStops(component);
    tablist.addEventListener("focusout", (event) => {
        const next = event.relatedTarget;
        if (!next || !tablist.contains(next))
            syncTabStops(component);
    });
    tablist.addEventListener("keydown", (event) => {
        const tabElement = event.target?.closest?.('[role="tab"]');
        if (!tabElement || !tablist.contains(tabElement))
            return;
        if (typeof component.getTabs !== "function")
            return;
        const tabs = component
            .getTabs()
            .filter(isEnabledTab);
        const currentIndex = tabs.findIndex((tab) => tab.element === tabElement);
        if (currentIndex === -1)
            return;
        const rtl = getComputedStyle(tablist).direction === "rtl";
        const last = tabs.length - 1;
        let newIndex;
        switch (event.key) {
            case "ArrowRight":
                newIndex = rtl
                    ? (currentIndex > 0 ? currentIndex - 1 : last)
                    : (currentIndex < last ? currentIndex + 1 : 0);
                break;
            case "ArrowLeft":
                newIndex = rtl
                    ? (currentIndex < last ? currentIndex + 1 : 0)
                    : (currentIndex > 0 ? currentIndex - 1 : last);
                break;
            case "Home":
                newIndex = 0;
                break;
            case "End":
                newIndex = last;
                break;
            default:
                return;
        }
        event.preventDefault();
        const target = tabs[newIndex];
        if (target === tabs[currentIndex])
            return;
        component.getTabs().forEach((tab) => tab.element.setAttribute("tabindex", tab === target ? "0" : "-1"));
        target.element.focus();
        if (!options.autoActivate)
            return;
        if (typeof component.handleTabClick === "function") {
            component.handleTabClick(null, target);
        }
        else if (typeof component.setActiveTab === "function") {
            component.setActiveTab(target);
        }
        syncTabStops(component);
    });
}
