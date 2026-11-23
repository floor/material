import type { ListboxComponent, ListboxConfig } from "./types.js";
/**
 * Creates a listbox handle on a dedicated control.
 * @param config
 */
export declare function createListbox<T = unknown>(config: ListboxConfig<T>): ListboxComponent<T>;
export default createListbox;
