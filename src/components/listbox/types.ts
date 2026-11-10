// src/components/listbox/types.ts

/**
 * The lean selection popup's public types.
 *
 * The contract is deliberately small: flat text options, one committed value,
 * no actions, links, separators, groups, submenus, icons, HTML, filtering,
 * multiple selection, virtualization or asynchronous providers.
 *
 * @module components/listbox
 */

/**
 * One option of a listbox.
 *
 * @category Components
 */
export interface ListboxOption<T = unknown> {
  /** The value the option commits. Nonempty, unique within the listbox. */
  id: string;
  /** The row's text, set as `textContent` -- never HTML. */
  text: string;
  /** A disabled option is shown and read, but navigation and activation skip it. */
  disabled?: boolean;
  /** Returned to the application with the option; never rendered. */
  data?: T;
}

/**
 * What the `open` and `close` events carry.
 *
 * @category Components
 */
export interface ListboxEventDetail<T = unknown> {
  /** The listbox that emitted the event. */
  listbox: ListboxComponent<T>;
  /** The event that caused it, when there was one. */
  originalEvent?: Event;
}

/**
 * What the `change` event carries: the value a user choice committed.
 *
 * @category Components
 */
export interface ListboxChangeDetail<T = unknown> extends ListboxEventDetail<T> {
  /** The committed option's id. */
  value: string;
  /** The value before this choice. */
  previousValue: string | null;
  /** The committed option, as a snapshot. */
  option: ListboxOption<T>;
}

/**
 * The listbox's typed events, by name.
 *
 * They are notifications after the state and the DOM have been updated, not
 * cancelable proposals.
 *
 * @category Components
 */
export interface ListboxEvents<T = unknown> {
  open: ListboxEventDetail<T>;
  change: ListboxChangeDetail<T>;
  close: ListboxEventDetail<T>;
}

/**
 * The handler each typed event takes, by event name.
 *
 * @category Components
 */
export type ListboxEventHandlers<T = unknown> = {
  [K in keyof ListboxEvents<T>]: (detail: ListboxEvents<T>[K]) => void;
};

/**
 * Configuration for `createListbox`.
 *
 * @category Components
 */
export interface ListboxConfig<T = unknown> {
  /**
   * The dedicated value control. A noneditable `div` with no interactive
   * descendants and no independent content: the factory owns its value text,
   * `role="combobox"`, `tabindex="0"`, the expansion and active-descendant
   * state, the accessible name and the disabled state while attached. The
   * application styles its shell.
   */
  control: HTMLDivElement;
  /** The nonempty accessible name, distinct from the value text. */
  ariaLabel: string;
  /** The options, in display order. Empty is valid. */
  options: readonly ListboxOption<T>[];
  /** The initial selected option's id, or `null` for none. @default null */
  value?: string | null;
  /** The control's text while no option is selected. @default "" */
  placeholder?: string;
  /** A disabled control stays in the tab order but cannot open or change. @default false */
  disabled?: boolean;
  /** Event handlers, installed before the first interaction. */
  on?: Partial<ListboxEventHandlers<T>>;
}

/**
 * The handle `createListbox` returns. Focus stays on the control while
 * the popup is explored.
 *
 * @category Components
 */
export interface ListboxComponent<T = unknown> {
  /** The popup root (`role="listbox"`), stable until `destroy()`. */
  element: HTMLElement;
  /** Opens the popup, focusing the control. No-op when disabled, disconnected or already open. */
  open: (event?: Event) => ListboxComponent<T>;
  /** Closes the popup without committing. No-op when already closed. */
  close: (event?: Event) => ListboxComponent<T>;
  /** Opens a closed popup, closes an open one. */
  toggle: (event?: Event) => ListboxComponent<T>;
  /** Whether the popup is showing. */
  isOpen: () => boolean;
  /** The committed option's id, or `null`. */
  getValue: () => string | null;
  /**
   * Selects an option by id, or clears the selection with `null`. Emits no
   * `change`; throws `RangeError` for an unknown id, atomically.
   */
  setValue: (value: string | null) => ListboxComponent<T>;
  /** The options, as snapshots: mutating them cannot bypass rendering. */
  getOptions: () => ListboxOption<T>[];
  /** Replaces the options, validating all of them before changing anything. */
  setOptions: (options: readonly ListboxOption<T>[]) => ListboxComponent<T>;
  /** Disables or enables the control; disabling closes without committing. */
  setDisabled: (disabled: boolean) => ListboxComponent<T>;
  /** Whether the control is disabled. */
  isDisabled: () => boolean;
  /** Subscribes to an event. Repeated calls do not accumulate a handler twice. */
  on: <K extends keyof ListboxEvents<T>>(type: K, handler: (detail: ListboxEvents<T>[K]) => void) => ListboxComponent<T>;
  /** Removes the exact subscription. */
  off: <K extends keyof ListboxEvents<T>>(type: K, handler: (detail: ListboxEvents<T>[K]) => void) => ListboxComponent<T>;
  /** Idempotent and terminal. Emits no event. */
  destroy: () => void;
}
