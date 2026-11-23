import type { ResponsiveConfig } from "./responsive-legacy.js";
import type { TabsComponent } from "./types.js";
export type { ResponsiveConfig } from "./responsive-legacy.js";
/** The behaviour `tabsResponsive` builds, applied by `createTabs` while the group is created. */
export type TabsResponsive = (tabs: TabsComponent) => void;
/**
 * Creates the `responsive` option for `createTabs`.
 * @param config
 */
export declare const tabsResponsive: (config?: ResponsiveConfig) => TabsResponsive;
