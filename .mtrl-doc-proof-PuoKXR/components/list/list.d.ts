import type { ListComponent, ListConfig, ListItem } from "./types.js";
/**
 * Creates a new List component The List component provides a simple way to render static arrays of data with Material item anatomy and built-in selection capabilities.
 * @param config
 */
declare const createList: (config?: Partial<ListConfig<ListItem>>) => ListComponent<ListItem>;
export default createList;
