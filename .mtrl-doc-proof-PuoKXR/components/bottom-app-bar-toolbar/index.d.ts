import type { BottomAppBarConfig, BottomAppBarComponent } from "../bottom-app-bar/types.js";
export type { BottomAppBarConfig as BottomAppBarToolbarConfig, BottomAppBarComponent as BottomAppBarToolbarComponent } from "../bottom-app-bar/types.js";
/**
 * Self-contained opt-in bottom app bar with docked styling and legacy policy.
 * @param config
 */
export declare function createBottomAppBarToolbar(config?: BottomAppBarConfig): BottomAppBarComponent;
export default createBottomAppBarToolbar;
