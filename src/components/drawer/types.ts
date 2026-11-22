// src/components/drawer/types.ts

import type { ForwardedEventPayload } from "../../core/dom";
import { BaseComponentConfig } from "../../core/config/component";

/**
 * Drawer variant type — controls layout behavior
 * @category Components
 * @remarks
 * - standard: Inline drawer, can be permanently visible or toggled. Best for expanded+ window sizes.
 * - modal: Overlay drawer with scrim. Best for compact/medium window sizes.
 */
export type NavigationDrawerVariant = "standard" | "modal";

/**
 * Drawer position — which edge the drawer anchors to
 * @category Components
 */
export type NavigationDrawerPosition = "start" | "end";

/**
 * Configuration for a navigation destination item
 * @category Components
 */
export interface NavigationDrawerItemConfig {
  /** Item type — defaults to 'item' if omitted */
  type?: "item" | "divider" | "section";

  /** Unique identifier for the item */
  id?: string;

  /** Destination label text */
  label?: string;

  /** Icon HTML content (placed before label). Markup (HTML). Not sanitized by default: see Markup and sanitizing. */
  icon?: string;

  /** Icon HTML content shown while this item is the active destination, in place of `icon`. Markup (HTML). Not sanitized by default: see Markup and sanitizing. */
  activeIcon?: string;

  /** Navigation URL for a leaf destination. */
  href?: string;

  /** A non-empty list makes this item a disclosure section. One level is rendered. */
  items?: NavigationDrawerItemConfig[];

  /** Initial section state. If omitted, an active child opens the section. */
  expanded?: boolean;

  /** Badge text (e.g. unread count) */
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
 * @category Components
 */
export interface NavigationDrawerSelectEvent {
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

/** The new state of a drawer disclosure section. */
export interface NavigationDrawerSectionEvent {
  id: string;
  value: string;
  label: string;
  expanded: boolean;
  originalEvent?: Event;
}

/** Events emitted by drawer state, navigation items and root DOM forwarding. */
export interface NavigationDrawerEvents {
  open: () => void;
  close: () => void;
  /** User activation only; setActive() is silent. */
  select: (payload: NavigationDrawerSelectEvent) => void;
  expand: (payload: NavigationDrawerSectionEvent) => void;
  collapse: (payload: NavigationDrawerSectionEvent) => void;
  click: (payload: ForwardedEventPayload<MouseEvent, HTMLElement>) => void;
  keydown: (payload: ForwardedEventPayload<KeyboardEvent, HTMLElement>) => void;
}

/**
 * Configuration interface for the Drawer component
 * @category Components
 */
export interface NavigationDrawerConfig extends BaseComponentConfig {
  /**
   * Drawer variant that determines layout behavior
   * @default 'standard'
   */
  variant?: NavigationDrawerVariant | string;

  /**
   * Drawer anchor position
   * @default 'start'
   */
  position?: NavigationDrawerPosition | string;

  /**
   * Whether the drawer is initially open
   * @default false
   */
  open?: boolean;

  /**
   * Whether the modal drawer can be dismissed by clicking the scrim, or with
   * Escape.
   *
   * Escape is a key press, handled by the topmost open modal only, after
   * whatever is open inside it has had the key: `false` holds for any number
   * of presses. The remaining limit, with `layer: "top"`: a close request
   * that is not a key press (a back gesture) is the browser's `cancel`, which
   * it forces on the third refusal in a row.
   * @default true
   */
  dismissible?: boolean;

  /**
   * `"top"` makes a modal drawer's root a `<dialog>` element, rendered where
   * the drawer is, and opens it with `showModal()`: in the browser's top
   * layer, above every z-index and outside any clipping ancestor, with the
   * rest of the page inert, a shadow root's page included. The scrim is its
   * `::backdrop`, and Escape reaches the drawer as the dialog's `cancel`
   * event. The sheet slides as without it.
   *
   * A standard drawer stays in the page, and where the browser has no
   * `showModal()` the drawer behaves as without it.
   */
  layer?: "top";

  /**
   * Optional headline text displayed at the top of the drawer
   * @example 'Mail'
   */
  headline?: string;

  /**
   * The drawer's accessible name. Default: the headline, or "Navigation".
   */
  ariaLabel?: string;

  /**
   * Navigation items configuration array.
   * Supports destination items, dividers, and section labels.
   * @example
   * [
   *   { id: 'inbox', label: 'Inbox', icon: '<svg>...</svg>', badge: '24', active: true },
   *   { type: 'divider' },
   *   { type: 'section', label: 'Labels' },
   *   { id: 'family', label: 'Family', icon: '<svg>...</svg>' },
   * ]
   */
  items?: NavigationDrawerItemConfig[];

  /**
   * Drawer width as a CSS value
   * @default 360
   */
  width?: string | number;

  /**
   * An alias for the density scale's last step: sets `--mtrl-density: -5`,
   * so items land on the 36dp height of that step while keeping their 48dp
   * touch target. Sheet padding, typography, icons, badges and dividers are
   * unchanged — density never moves type or icons.
   * @default false
   */
  dense?: boolean;

  /**
   * Whether items show a ripple on press. The ripple is clipped to the
   * item shape, so it reads as part of the active indicator.
   * @default true
   */
  ripple?: boolean;

  /**
   * Additional CSS classes to add to the drawer
   */
  class?: string;

  /**
   * Component prefix for class names
   * @default 'mtrl'
   */
  prefix?: string;

  /**
   * Component name used in class generation
   */
  componentName?: string;

  /** `select` listener registered at creation. */
  onSelect?: NavigationDrawerEvents["select"];

  /** `open` listener registered at creation. */
  onOpen?: NavigationDrawerEvents["open"];

  /** `close` listener registered at creation. */
  onClose?: NavigationDrawerEvents["close"];

  /** Section listeners registered at creation. */
  onExpand?: NavigationDrawerEvents["expand"];
  onCollapse?: NavigationDrawerEvents["collapse"];
}

/**
 * Drawer component interface — public API
 * @category Components
 */
export interface NavigationDrawerComponent {
  /** The drawer's root DOM element */
  element: HTMLElement;

  /**
   * Gets a class name with the component's prefix
   * @param name - Base class name
   * @returns Prefixed class name
   */
  getClass: (name: string) => string;

  /**
   * Opens the drawer
   * @returns The drawer component for chaining
   */
  open: () => NavigationDrawerComponent;

  /**
   * Closes the drawer
   * @returns The drawer component for chaining
   */
  close: () => NavigationDrawerComponent;

  /**
   * Toggles the drawer open/closed state
   * @returns The drawer component for chaining
   */
  toggle: () => NavigationDrawerComponent;

  /**
   * Checks if the drawer is currently open
   * @returns True if the drawer is open
   */
  isOpen: () => boolean;

  /**
   * Sets the active navigation item by id
   * @param id - Item id to activate
   * @returns The drawer component for chaining
   */
  setActive: (id: string) => NavigationDrawerComponent;

  /**
   * Gets the currently active item id
   * @returns Active item id or null
   */
  getActive: () => string | null;
  /** Reads the current model value without changing selection. */
  getValue: () => string | null;

  /**
   * Sets the headline text
   * @param text - Headline text
   * @returns The drawer component for chaining
   */
  setHeadline: (text: string) => NavigationDrawerComponent;

  /**
   * Gets the headline text
   * @returns Headline text
   */
  getHeadline: () => string;

  /**
   * Sets the navigation items
   * @param items - Array of item configurations
   * @returns The drawer component for chaining
   */
  setItems: (items: NavigationDrawerItemConfig[]) => NavigationDrawerComponent;

  /**
   * Gets the current items configuration
   * @returns Array of item configurations
   */
  getItems: () => NavigationDrawerItemConfig[];

  /**
   * Sets a badge on a specific item
   * @param id - Item id
   * @param badge - Badge text or empty string to remove
   * @returns The drawer component for chaining
   */
  setBadge: (id: string, badge: string) => NavigationDrawerComponent;

  /** Open, close or toggle the disclosure with this id. */
  expandSection: (id: string) => NavigationDrawerComponent;
  collapseSection: (id: string) => NavigationDrawerComponent;
  toggleSection: (id: string) => NavigationDrawerComponent;
  isSectionExpanded: (id: string) => boolean;
  /** Expanded section ids in document order. */
  getExpandedSections: () => string[];

  /**
   * Adds an event listener
   * @param event - Event name ('select', 'open', 'close')
   * @param handler - Event handler function
   * @returns The drawer component for chaining
   */
  on: <K extends keyof NavigationDrawerEvents>(event: K, handler: NavigationDrawerEvents[K]) => NavigationDrawerComponent;

  /**
   * Removes an event listener
   * @param event - Event name
   * @param handler - Event handler function
   * @returns The drawer component for chaining
   */
  off: <K extends keyof NavigationDrawerEvents>(event: K, handler: NavigationDrawerEvents[K]) => NavigationDrawerComponent;

  /**
   * Adds CSS classes to the drawer element
   * @param classes - One or more class names to add
   * @returns The drawer component for chaining
   */
  addClass: (...classes: string[]) => NavigationDrawerComponent;

  /**
   * Destroys the drawer component and cleans up resources
   */
  destroy: () => void;

  /** API for managing component lifecycle */
  lifecycle: {
    /** Destroys the component and cleans up resources */
    destroy: () => void;
  };
}

/**
 * @deprecated use {@link NavigationDrawerConfig}. Material Design 3 names the
 * component the navigation drawer. An interface, so a consumer's module
 * augmentation still compiles.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the deprecated name must stay augmentable
export interface DrawerConfig extends NavigationDrawerConfig {}
/** @deprecated use {@link NavigationDrawerComponent}. */
export type DrawerComponent = NavigationDrawerComponent;
/** @deprecated use {@link NavigationDrawerVariant}. */
export type DrawerVariant = NavigationDrawerVariant;
/** @deprecated use {@link NavigationDrawerPosition}. */
export type DrawerPosition = NavigationDrawerPosition;
/** @deprecated use {@link NavigationDrawerItemConfig}. */
export type DrawerItemConfig = NavigationDrawerItemConfig;
/** @deprecated use {@link NavigationDrawerSelectEvent}. */
export type DrawerSelectEvent = NavigationDrawerSelectEvent;
/** @deprecated use {@link NavigationDrawerSectionEvent}. */
export type DrawerSectionEvent = NavigationDrawerSectionEvent;
/** @deprecated use {@link NavigationDrawerEvents}. */
export type DrawerEvents = NavigationDrawerEvents;
