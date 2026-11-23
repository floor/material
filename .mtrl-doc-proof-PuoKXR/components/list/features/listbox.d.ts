import type { ListComponent, ListItem } from "../types.js";
/** Options for {@link withSingleSelectListbox}. */
export interface SingleSelectListboxOptions {
    /**
 * Where the visual-only radio indicator sits: before the row's content (`"leading"`, the default) or after it (`"trailing"`).
 * @default "leading"
 */
    indicator?: "leading" | "trailing";
}
/**
 * Turns a created list into a single-select listbox (`role="listbox"` with `role="option"` rows, `aria-selected`, a visual-only radio, one tab stop).
 * @param component
 * @param options
 */
export declare const withSingleSelectListbox: (component: ListComponent<ListItem>, options?: SingleSelectListboxOptions) => ListComponent<ListItem>;
export default withSingleSelectListbox;
