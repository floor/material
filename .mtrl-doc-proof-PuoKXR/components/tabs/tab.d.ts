import { TabConfig, TabComponent } from "./types.js";
/**
 * Creates a new Tab component following MD3 guidelines
 * @param config
 */
/** Point a tab at its panel, but only when that panel exists. */
export declare const createTab: (config?: TabConfig) => TabComponent;
