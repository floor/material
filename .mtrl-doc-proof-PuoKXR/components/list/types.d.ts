import type { ForwardedEventPayload } from "../../core/dom/index.js";
/** List variant types following Material Design 3 guidelines. */
export type ListVariant = 'standard' | 'segmented';
/** Configuration for the List component */
export interface ListConfig<T = unknown> {
    /**
 * The list's visual style.
 * @default 'standard'
 */
    variant?: ListVariant;
    /** Static array of items to display */
    items: T[];
    /**
 * Function to render an item
 * @param item
 * @param index
 */
    renderItem?: (item: T, index: number) => HTMLElement;
    /**
 * Whether to track item selection When true, clicked items will receive a selected class.
 * @default true
 */
    trackSelection?: boolean;
    /**
 * Whether to allow multiple item selection
 * @default false
 */
    multiSelect?: boolean;
    /** Initial selection state (array of item IDs) */
    initialSelection?: (string | number)[];
    /** ARIA label for accessibility */
    ariaLabel?: string;
    /** Additional CSS classes */
    class?: string;
    /**
 * Default animation behavior for scroll operations
 * @default false
 */
    animate?: boolean;
    /**
 * Component name used in CSS class generation
 * @default 'list'
 */
    componentName?: string;
}
/** What the list reads off an item. */
/** Slot HTML uses the shared safe HTML sink; HTMLElement content is moved, not cloned. */
export interface ListSlot {
    type: "icon" | "avatar" | "image" | "video" | "text" | "control" | "custom";
    /** For `icon` and `avatar`, a string is markup. */
    content: string | HTMLElement | {
        element: HTMLElement;
    };
}
export interface ListItem {
    /** Structural entries are rendered but never selectable. */
    kind?: "item" | "divider" | "subheader";
    /** Insets a divider to the text column (72px from the leading edge). */
    inset?: boolean;
    /** One headline line plus optional overline/supporting lines. */
    lines?: 1 | 2 | 3;
    overline?: string;
    supportingText?: string;
    leading?: ListSlot;
    /** The slot at the row's end: text, an icon, or a control of the app's (a checkbox, a radio, a switch). */
    trailing?: ListSlot;
    /** Blocks user activation; programmatic selection is still allowed. */
    disabled?: boolean;
    id?: string | number;
    text?: string;
    title?: string;
    headline?: string;
    name?: string;
    /** Selected at creation, which withSelection seeds its set from */
    selected?: boolean;
}
/** What withRenderer installs at `component.list`. */
export interface ListRenderer<T = ListItem> {
    getRows: () => ListRow<T>[];
    onRender: (handler: () => void) => () => void;
    getItems: () => T[];
    getAllItems: () => T[];
    getVisibleItems: () => T[];
    refresh: () => void;
    scrollToItem: (itemId: string | number, position?: ScrollPosition, animate?: boolean) => void;
    scrollToIndex: (index: number, position?: ScrollPosition, animate?: boolean) => void;
    loadNext: () => Promise<{
        hasNext: boolean;
        items: T[];
    }>;
    loadPage: () => Promise<{
        hasNext: boolean;
        items: T[];
    }>;
    loadPrevious: () => Promise<{
        hasPrev: boolean;
        items: T[];
    }>;
    scrollNext: () => Promise<{
        hasNext: boolean;
        items: T[];
    }>;
    scrollPrevious: () => Promise<{
        hasPrev: boolean;
        items: T[];
    }>;
    scrollToItemById: (itemId: string | number, position?: ScrollPosition, animate?: boolean) => Promise<void>;
    onCollectionChange: () => () => void;
    onPageChange: () => () => void;
    getCurrentPage: () => number;
    getPageSize: () => number;
    getCollection: () => null;
    isApiMode: () => boolean;
    isLoading: () => boolean;
    hasNextPage: () => boolean;
}
export interface ListRow<T = ListItem> {
    item: T;
    id: string;
    index: number;
    element: HTMLElement;
    action?: HTMLButtonElement;
}
/** Where a scrolled-to item lands in the viewport */
export type ScrollPosition = "start" | "center" | "end";
/** What withSelection installs. */
export interface ListSelection<T = ListItem> {
    getSelectedItems: () => T[];
    getSelectedItemIds: () => string[];
    isItemSelected: (itemId: string | number) => boolean;
    selectItem(itemId: string | number): this;
    deselectItem(itemId: string | number): this;
    clearSelection(): this;
    setSelection(itemIds: (string | number)[]): this;
}
/** What a list feature needs from the component it is handed. */
export interface ListFeatureHost {
    element: HTMLElement;
    getClass: (name: string) => string;
    resources?: import("../../core/compose/cleanup.js").CleanupScope;
    eventTarget?: {
        current: unknown;
    };
    emit?: (event: string, data: unknown) => unknown;
    lifecycle?: {
        destroy: () => void;
    };
    list?: ListRenderer;
}
/** Selection event data */
export interface SelectEvent<T = unknown> {
    /** Selected item data */
    item: T;
    /** The item's id as a string, the `value` of the `<m-list>` element's */
    value: string;
    /** DOM element for the selected item: the row, never its button */
    element: HTMLElement;
    /** The row's primary action button that carried the activation, the same node the row exposes to assistive technology. */
    action?: HTMLButtonElement;
    /** Original DOM event */
    originalEvent: Event;
    /** Component instance */
    component: ListComponent<T>;
    /** Prevent default behavior */
    preventDefault: () => void;
    /** Whether default was prevented */
    defaultPrevented: boolean;
}
/** Load event data */
export interface LoadEvent<T = unknown> {
    /** Loaded items */
    items: T[];
    /** Whether the list is currently loading */
    loading: boolean;
    /** Whether there are more items to load */
    hasNext: boolean;
    /** Whether there are previous items */
    hasPrev: boolean;
    /** Component instance */
    component: ListComponent<T>;
    /** Prevent default behavior */
    preventDefault?: () => void;
    /** Whether default was prevented */
    defaultPrevented?: boolean;
}
/** List component interface */
export interface ListComponent<T = unknown> {
    /** Component's root DOM element */
    element: HTMLElement;
    /** Refreshes the list display */
    refresh: () => Promise<ListComponent<T>>;
    /** Gets all items in the list */
    getAllItems: () => T[];
    /** Gets all visible items (same as getAllItems for rendered lists) */
    getVisibleItems: () => T[];
    /**
 * Scrolls to a specific item by ID
 * @param itemId
 * @param position
 * @param animate
 */
    scrollToItem: (itemId: string | number, position?: "start" | "center" | "end", animate?: boolean) => ListComponent<T>;
    /**
 * Scroll to a specific index in the list
 * @param index
 * @param position
 * @param animate
 */
    scrollToIndex: (index: number, position?: "start" | "center" | "end", animate?: boolean) => Promise<ListComponent<T>>;
    /** Checks if the list is currently loading (always false for rendered lists) */
    isLoading: () => boolean;
    /** Checks if the list has more items to load (always false for rendered lists) */
    hasNextPage: () => boolean;
    /** Gets the currently selected items */
    getSelectedItems: () => T[];
    /** Gets the IDs of currently selected items */
    getSelectedItemIds: () => string[];
    /**
 * Checks if an item is selected
 * @param itemId
 */
    isItemSelected: (itemId: string | number) => boolean;
    /**
 * Selects an item
 * @param itemId
 */
    selectItem: (itemId: string | number) => ListComponent<T>;
    /**
 * Deselects an item
 * @param itemId
 */
    deselectItem: (itemId: string | number) => ListComponent<T>;
    /** Clears all selections */
    clearSelection: () => ListComponent<T>;
    /**
 * Sets the selection to the specified item IDs
 * @param itemIds
 */
    setSelection: (itemIds: (string | number)[]) => ListComponent<T>;
    /**
 * Adds an event listener to the list
 * @param event
 * @param handler
 */
    on: <K extends keyof ListEvents<T>>(event: K, handler: ListEvents<T>[K]) => ListComponent<T>;
    /**
 * Removes an event listener from the list
 * @param event
 * @param handler
 */
    off: <K extends keyof ListEvents<T>>(event: K, handler: ListEvents<T>[K]) => ListComponent<T>;
    /** Destroys the component and cleans up resources */
    destroy: () => void;
}
/** Event handlers for List */
export interface ListEvents<T = unknown> {
    select: (event: SelectEvent<T>) => void;
    load: (event: LoadEvent<T>) => void;
    scroll: (event: ForwardedEventPayload<Event, HTMLElement>) => void;
    keydown: (event: ForwardedEventPayload<KeyboardEvent, HTMLElement>) => void;
}
