import type { ToolbarConfig, ToolbarComponent } from "./types.js";
/**
 * Creates a toolbar: M3 Expressive's docked and floating toolbars.
 * @param config
 */
declare const createToolbar: (config?: ToolbarConfig) => ToolbarComponent;
export default createToolbar;
export { createToolbar };
