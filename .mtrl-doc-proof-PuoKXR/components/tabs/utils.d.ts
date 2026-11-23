import { TabComponent } from "./types.js";
/** Tabs members read by these helpers; each one is checked before use */
interface TabsHost {
    element?: HTMLElement;
    tabs?: TabComponent[];
    getTabs?: () => TabComponent[];
    getActiveTab?: () => TabComponent | null;
    setActiveTab?: (tabOrValue: TabComponent | string) => unknown;
    handleTabClick?: (event: Event | null, tab: TabComponent) => void;
}
/**
 * Gets the active tab from a component
 * @param component
 */
export declare function getActiveTab(component: TabsHost): TabComponent | null;
/** A fresh id for a tab group, so two tablists can share tab values. */
export declare function allocateTabsGroupId(): string;
/** A tab's element id within its group: `tab-<groupId>-<value>` for a value of `[A-Za-z0-9_-]`, and `tabx-<groupId>-<encoded value>` otherwise. */
export declare const tabIdFor: (groupId: string, value: string) => string;
/** The panel id a group looks for when a page does not label its panels: `tabpanel-<groupId>-<value>`, or `tabpanelx-<groupId>-<encoded value>` for a value with other characters, as {@link tabIdFor} derives the tab's. */
export declare const tabPanelIdFor: (groupId: string, value: string) => string;
/** Records a tab's value and group on its element: the value as `data-value`, which the panel lookup reads instead of parsing the id. */
export declare function registerTab(element: HTMLElement, groupId: string, value: string): void;
/** The panel registered to a tab, or null. */
export declare function findRegisteredPanel(tab: HTMLElement): HTMLElement | null;
/** Points a tab's `aria-controls` at its panel, and only at one that exists. */
export declare function syncTabControls(element: HTMLElement): void;
/**
 * Updates tab panels based on active tab
 * @param component
 */
export declare function updateTabPanels(component: TabsHost): void;
/**
 * Gives the tablist a single tab stop: the active tab, or the first enabled one when none is active.
 * @param component
 */
export declare function syncTabStops(component: TabsHost): void;
/**
 * Sets up keyboard navigation for tabs.
 * @param component
 * @param options
 */
export declare function setupKeyboardNavigation(component: TabsHost, options?: {
    autoActivate?: boolean;
}): void;
export {};
