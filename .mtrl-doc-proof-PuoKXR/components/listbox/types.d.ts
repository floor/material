/** The lean selection popup's public types. */
/** One option of a listbox. */
export interface ListboxOption<T = unknown> {
    /** The value the option commits. */
    id: string;
    /** The row's text, set as `textContent` -- never HTML. */
    text: string;
    /** A disabled option is shown and read, but navigation and activation skip it. */
    disabled?: boolean;
    /** Returned to the application with the option; never rendered. */
    data?: T;
}
/** What the `open` and `close` events carry. */
export interface ListboxEventDetail<T = unknown> {
    /** The listbox that emitted the event. */
    listbox: ListboxComponent<T>;
    /** The event that caused it, when there was one. */
    originalEvent?: Event;
}
/** What the `change` event carries: the value a user choice committed. */
export interface ListboxChangeDetail<T = unknown> extends ListboxEventDetail<T> {
    /** The committed option's id. */
    value: string;
    /** The value before this choice. */
    previousValue: string | null;
    /** The committed option, as a snapshot. */
    option: ListboxOption<T>;
}
/** The listbox's typed events, by name. */
export interface ListboxEvents<T = unknown> {
    open: ListboxEventDetail<T>;
    change: ListboxChangeDetail<T>;
    close: ListboxEventDetail<T>;
}
/** The handler each typed event takes, by event name. */
export type ListboxEventHandlers<T = unknown> = {
    [K in keyof ListboxEvents<T>]: (detail: ListboxEvents<T>[K]) => void;
};
/** Configuration for `createListbox`. */
export interface ListboxConfig<T = unknown> {
    /** The dedicated value control. */
    control: HTMLDivElement;
    /** The nonempty accessible name, distinct from the value text. */
    ariaLabel: string;
    /** The options, in display order. */
    options: readonly ListboxOption<T>[];
    /** The initial selected option's id, or `null` for none. */
    value?: string | null;
    /** The control's text while no option is selected. */
    placeholder?: string;
    /** A disabled control stays in the tab order but cannot open or change. */
    disabled?: boolean;
    /** Event handlers, installed before the first interaction. */
    on?: Partial<ListboxEventHandlers<T>>;
}
/** The handle `createListbox` returns. */
export interface ListboxComponent<T = unknown> {
    /** The popup root (`role="listbox"`), stable until `destroy()`. */
    element: HTMLElement;
    /** Opens the popup, focusing the control. */
    open: (event?: Event) => ListboxComponent<T>;
    /** Closes the popup without committing. */
    close: (event?: Event) => ListboxComponent<T>;
    /** Opens a closed popup, closes an open one. */
    toggle: (event?: Event) => ListboxComponent<T>;
    /** Whether the popup is showing. */
    isOpen: () => boolean;
    /** The committed option's id, or `null`. */
    getValue: () => string | null;
    /** Selects an option by id, or clears the selection with `null`. */
    setValue: (value: string | null) => ListboxComponent<T>;
    /** The options, as snapshots: mutating them cannot bypass rendering. */
    getOptions: () => ListboxOption<T>[];
    /** Replaces the options, validating all of them before changing anything. */
    setOptions: (options: readonly ListboxOption<T>[]) => ListboxComponent<T>;
    /** Disables or enables the control; disabling closes without committing. */
    setDisabled: (disabled: boolean) => ListboxComponent<T>;
    /** Whether the control is disabled. */
    isDisabled: () => boolean;
    /** Subscribes to an event. */
    on: <K extends keyof ListboxEvents<T>>(type: K, handler: (detail: ListboxEvents<T>[K]) => void) => ListboxComponent<T>;
    /** Removes the exact subscription. */
    off: <K extends keyof ListboxEvents<T>>(type: K, handler: (detail: ListboxEvents<T>[K]) => void) => ListboxComponent<T>;
    /** Idempotent and terminal. */
    destroy: () => void;
}
