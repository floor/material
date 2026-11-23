import { SideSheetConfig, SideSheetComponent } from "./types.js";
/**
 * Creates a side sheet: a surface docked to a vertical edge, holding content that supports the page rather than replacing it.
 * @param config
 */
declare const createSideSheet: (config?: SideSheetConfig) => SideSheetComponent;
export default createSideSheet;
