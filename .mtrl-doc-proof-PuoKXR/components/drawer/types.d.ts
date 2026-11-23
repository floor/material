import type { ForwardedEventPayload } from "../../core/dom/index.js";
import { BaseComponentConfig } from "../../core/config/component.js";
/**
 * Drawer variant type — controls layout behavior
 * @deprecated use `NavigationDrawerVariant`. Removal in 4.0.
 */
export type DrawerVariant = "standard" | "modal";
/**
 * Drawer position — which edge the drawer anchors to
 * @deprecated use `NavigationDrawerPosition`. Removal in 4.0.
 */
export type DrawerPosition = "start" | "end";
/**
 * Configuration for a navigation destination item
 * @deprecated use `NavigationDrawerItemConfig`. Removal in 4.0.
 */
export interface DrawerItemConfig {
    /** Item type — defaults to 'item' if omitted */
    type?: "item" | "divider" | "section";
    /** Unique identifier for the item */
    id?: string;
    /** Destination label text */
    label?: string;
    /** Icon HTML content (placed before label). */
    icon?: string;
    /** Icon HTML content shown while this item is the active destination, in place of `icon`. */
    activeIcon?: string;
    /** Navigation URL for a leaf destination. */
    href?: string;
    /** A non-empty list makes this item a disclosure section. */
    items?: DrawerItemConfig[];
    /** Initial section state. */
    expanded?: boolean;
    /** Badge text (e.g. */
    badge?: string;
    /** Whether this item is initially active/selected */
    active?: boolean;
    /** Section label text (only when type is 'section') */
    sectionLabel?: string;
    /** Whether the item is disabled */
    disabled?: boolean;
}
/**
 * Event detail emitted when a drawer item is selected
 * @deprecated use `NavigationDrawerSelectEvent`. Removal in 4.0.
 */
export interface DrawerSelectEvent {
    /** The selected item's id */
    id: string;
    /** The id again, as the `value` of the `<m-drawer>` element's `change` */
    value: string;
    /** The selected item's label */
    label: string;
    /** The selected item's index within navigation items (excludes dividers/sections) */
    index: number;
    /** The underlying DOM event */
    originalEvent: Event;
}
/**
 * The new state of a drawer disclosure section.
 * @deprecated use `NavigationDrawerSectionEvent`. Removal in 4.0.
 */
export interface DrawerSectionEvent {
    id: string;
    value: string;
    label: string;
    expanded: boolean;
    originalEvent?: Event;
}
/**
 * Events emitted by drawer state, navigation items and root DOM forwarding.
 * @deprecated use `NavigationDrawerEvents`. Removal in 4.0.
 */
export interface DrawerEvents {
    open: () => void;
    close: () => void;
    /** User activation only; setActive() is silent. */
    select: (payload: DrawerSelectEvent) => void;
    expand: (payload: DrawerSectionEvent) => void;
    collapse: (payload: DrawerSectionEvent) => void;
    click: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
    keydown: (payload: ForwardedEventPayload<KeyboardEvent, HTMLElement>) => void;
}
/**
 * Configuration interface for the Drawer component
 * @deprecated use `NavigationDrawerConfig`. Removal in 4.0.
 */
export interface DrawerConfig extends BaseComponentConfig {
    /**
 * Drawer variant that determines layout behavior
 * @default 'standard'
 */
    variant?: DrawerVariant | string;
    /**
 * Drawer anchor position
 * @default 'start'
 */
    position?: DrawerPosition | string;
    /**
 * Whether the drawer is initially open
 * @default false
 */
    open?: boolean;
    /**
 * Whether the modal drawer can be dismissed by clicking the scrim, or with Escape.
 * @default true
 */
    dismissible?: boolean;
    /** `"top"` makes a modal drawer's root a `<dialog>` element, rendered where the drawer is, and opens it with `showModal()`: in the browser's top layer, above every z-index and outside any clipping ancestor, with the rest of the page inert, a shadow root's page included. */
    layer?: "top";
    /** Optional headline text displayed at the top of the drawer */
    headline?: string;
    /** The drawer's accessible name. */
    ariaLabel?: string;
    /** Navigation items configuration array. */
    items?: DrawerItemConfig[];
    /**
 * Drawer width as a CSS value
 * @default 360
 */
    width?: string | number;
    /**
 * An alias for the density scale's last step: sets `--mtrl-density: -5`, so items land on the 36dp height of that step while keeping their 48dp touch target.
 * @default false
 */
    dense?: boolean;
    /**
 * Whether items show a ripple on press.
 * @default true
 */
    ripple?: boolean;
    /** Additional CSS classes to add to the drawer */
    class?: string;
    /**
 * Component prefix for class names
 * @default 'mtrl'
 */
    prefix?: string;
    /** Component name used in class generation */
    componentName?: string;
    /** `select` listener registered at creation. */
    onSelect?: DrawerEvents["select"];
    /** `open` listener registered at creation. */
    onOpen?: DrawerEvents["open"];
    /** `close` listener registered at creation. */
    onClose?: DrawerEvents["close"];
    /** Section listeners registered at creation. */
    onExpand?: DrawerEvents["expand"];
    onCollapse?: DrawerEvents["collapse"];
}
/**
 * Drawer component interface — public API
 * @deprecated use `NavigationDrawerComponent`. Removal in 4.0.
 */
export interface DrawerComponent {
    /** The drawer's root DOM element */
    element: HTMLElement;
    /**
 * Gets a class name with the component's prefix
 * @param name
 */
    getClass: (name: string) => string;
    /** Opens the drawer */
    open: () => DrawerComponent;
    /** Closes the drawer */
    close: () => DrawerComponent;
    /** Toggles the drawer open/closed state */
    toggle: () => DrawerComponent;
    /** Checks if the drawer is currently open */
    isOpen: () => boolean;
    /**
 * Sets the active navigation item by id
 * @param id
 */
    setActive: (id: string) => DrawerComponent;
    /** Gets the currently active item id */
    getActive: () => string | null;
    /** Reads the current model value without changing selection. */
    getValue: () => string | null;
    /**
 * Sets the headline text
 * @param text
 */
    setHeadline: (text: string) => DrawerComponent;
    /** Gets the headline text */
    getHeadline: () => string;
    /**
 * Sets the navigation items
 * @param items
 */
    setItems: (items: DrawerItemConfig[]) => DrawerComponent;
    /** Gets the current items configuration */
    getItems: () => DrawerItemConfig[];
    /**
 * Sets a badge on a specific item
 * @param id
 * @param badge
 */
    setBadge: (id: string, badge: string) => DrawerComponent;
    /** Open, close or toggle the disclosure with this id. */
    expandSection: (id: string) => DrawerComponent;
    collapseSection: (id: string) => DrawerComponent;
    toggleSection: (id: string) => DrawerComponent;
    isSectionExpanded: (id: string) => boolean;
    /** Expanded section ids in document order. */
    getExpandedSections: () => string[];
    /**
 * Adds an event listener
 * @param event
 * @param handler
 */
    on: <K extends keyof DrawerEvents>(event: K, handler: DrawerEvents[K]) => DrawerComponent;
    /**
 * Removes an event listener
 * @param event
 * @param handler
 */
    off: <K extends keyof DrawerEvents>(event: K, handler: DrawerEvents[K]) => DrawerComponent;
    /**
 * Adds CSS classes to the drawer element
 * @param classes
 */
    addClass: (...classes: string[]) => DrawerComponent;
    /** Destroys the drawer component and cleans up resources */
    destroy: () => void;
    /** API for managing component lifecycle */
    lifecycle: {
        /** Destroys the component and cleans up resources */
        destroy: () => void;
    };
}
/** The navigation drawer's config; the drawer is the navigation drawer. */
export type NavigationDrawerConfig = DrawerConfig;
/** The navigation drawer's component. */
export type NavigationDrawerComponent = DrawerComponent;
/** The navigation drawer's variant. */
export type NavigationDrawerVariant = DrawerVariant;
/** The navigation drawer's position. */
export type NavigationDrawerPosition = DrawerPosition;
/** The navigation drawer's item config. */
export type NavigationDrawerItemConfig = DrawerItemConfig;
/** The navigation drawer's select event detail. */
export type NavigationDrawerSelectEvent = DrawerSelectEvent;
/** The navigation drawer's section event detail. */
export type NavigationDrawerSectionEvent = DrawerSectionEvent;
/** The navigation drawer's events. */
export type NavigationDrawerEvents = DrawerEvents;
