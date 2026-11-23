import type { EventCallback } from "../../core/state/emitter.js";
/** Menu position options */
export declare const MENU_POSITION: {
    /** Places menu below the opener, aligned to left edge */
    readonly BOTTOM_START: "bottom-start";
    /** Places menu below the opener, centered */
    readonly BOTTOM: "bottom";
    /** Places menu below the opener, aligned to right edge */
    readonly BOTTOM_END: "bottom-end";
    /** Places menu above the opener, aligned to left edge */
    readonly TOP_START: "top-start";
    /** Places menu above the opener, centered */
    readonly TOP: "top";
    /** Places menu above the opener, aligned to right edge */
    readonly TOP_END: "top-end";
    /** Places menu to the right of the opener, aligned to top edge */
    readonly RIGHT_START: "right-start";
    /** Places menu to the right of the opener, centered */
    readonly RIGHT: "right";
    /** Places menu to the right of the opener, aligned to bottom edge */
    readonly RIGHT_END: "right-end";
    /** Places menu to the left of the opener, aligned to top edge */
    readonly LEFT_START: "left-start";
    /** Places menu to the left of the opener, centered */
    readonly LEFT: "left";
    /** Places menu to the left of the opener, aligned to bottom edge */
    readonly LEFT_END: "left-end";
};
/** Position options for the menu */
export type MenuPosition = (typeof MENU_POSITION)[keyof typeof MENU_POSITION];
/** Configuration interface for a menu item */
export interface MenuItem<TData = unknown> {
    /** Unique ID for the menu item */
    id: string;
    /** Display text for the menu item */
    text: string;
    /** Optional icon to display before the text. */
    icon?: string;
    /** Optional keyboard shortcut hint to display */
    shortcut?: string;
    /** A second line under the label, for a short explanation of the item */
    supportingText?: string;
    /** Whether the menu item is disabled */
    disabled?: boolean;
    /** Whether this item has a submenu */
    hasSubmenu?: boolean;
    /** Optional array of submenu items */
    submenu?: MenuItem<TData>[];
    /** Additional data to associate with the menu item */
    data?: TData;
}
/** Menu item type for dividers */
export interface MenuDivider {
    /** Type must be 'divider' to differentiate from regular menu items */
    type: "divider";
    /** Optional ID for the divider (for accessibility) */
    id?: string;
}
/** Menu item type for a gap between groups. */
export interface MenuGap {
    /** Type must be 'gap' to differentiate from regular menu items */
    type: "gap";
    /** Optional ID for the gap (for accessibility) */
    id?: string;
}
/** Combined type for menu content items (regular items, dividers or gaps) */
export type MenuContent<TData = unknown> = MenuItem<TData> | MenuDivider | MenuGap;
/** Configuration interface for the Menu component */
/** Menu variants */
export type MenuVariant = "baseline" | "vertical";
/** Colour mappings for the vertical menu */
export type MenuColor = "standard" | "vibrant";
export interface MenuConfig {
    /** Element to which the menu will be openered */
    opener: HTMLElement | string | {
        element: HTMLElement;
    };
    /** The element the menu is placed against, when it is not the opener's: a select's field, so its supporting text row never pushes the menu down The opener still opens, closes and gets focus back. */
    positionTarget?: HTMLElement;
    /** Array of menu items and dividers to display */
    items: MenuContent[];
    /**
 * Menu variant.
 * @default 'vertical'
 */
    variant?: MenuVariant;
    /** Colour mapping for the vertical variant. */
    color?: MenuColor;
    /**
 * Position of the menu relative to the opener
 * @default 'bottom-start'
 */
    position?: MenuPosition;
    /**
 * Whether the menu should close when an item is clicked
 * @default true
 */
    closeOnSelect?: boolean;
    /**
 * Whether the menu should close when the user clicks outside
 * @default true
 */
    closeOnClickOutside?: boolean;
    /**
 * Whether the menu should close when the escape key is pressed
 * @default true
 */
    closeOnEscape?: boolean;
    /**
 * Whether the menu should close when the window is resized
 * @default false
 */
    closeOnResize?: boolean;
    /**
 * Whether submenus should open on hover
 * @default true
 */
    openSubmenuOnHover?: boolean;
    /** Optional width for the menu (in CSS units) */
    width?: string;
    /** Optional maximum height for the menu (in CSS units) */
    maxHeight?: string;
    /**
 * Optional offset from the opener (in pixels)
 * @default 0
 */
    offset?: number;
    /**
 * Whether the menu should automatically flip position to stay in viewport
 * @default true
 */
    autoFlip?: boolean;
    /**
 * Whether the menu is initially visible
 * @default false
 */
    visible?: boolean;
    /** Container element to append the menu to */
    container?: HTMLElement | null;
    /** `"top"` renders the menu in place, next to its opener, and shows it in the browser's top layer as a `popover="manual"` element: above every z-index, outside any clipping ancestor, and still inside the opener's shadow root, so it keeps that root's styles. */
    layer?: "top";
    /**
 * When true, the opener is used only for positioning.
 * @default false
 */
    manualOpen?: boolean;
    /**
 * Renders the menu as the listbox popup of a combobox (WAI-ARIA select-only combobox): the list is `role="listbox"` and each item `role="option"` with its own id, focus stays with the combobox, which owns the keyboard and points at the active option with `aria-activedescendant`, and the opener gets no ARIA from the menu.
 * @default false
 */
    listbox?: boolean;
    /**
 * When true, renders a compact menu with smaller items and tighter spacing.
 * @deprecated The library moves to one density scale
 * (`--mtrl-density`) in 3.10.0, which leaves menus at their default
 * density: M3 advises against densifying focused tasks such as selecting
 * from a menu. This option still renders the dense variant and is removed
 * in 4.0.
 * @default false
 */
    dense?: boolean;
    /** Additional CSS classes to add to the menu */
    class?: string;
    /** Accessible label for assistive technology on the menu surface and list */
    ariaLabel?: string;
    /**
 * Component prefix for CSS class names
 * @default 'mtrl'
 */
    prefix?: string;
    /**
 * Component name used in CSS class generation
 * @default 'menu'
 */
    componentName?: string;
    /** Event handlers for the menu */
    on?: {
        /** Called when the menu is opened */
        open?: (event: MenuEvent) => void;
        /** Called when the menu is closed */
        close?: (event: MenuEvent) => void;
        /** Called when a menu item is selected */
        select?: (event: MenuSelectEvent) => void;
    };
}
/** What `open` and `close` carry. */
export interface MenuEvent {
    /** The menu component that triggered the event */
    menu: MenuComponent;
    /** Original DOM event if available */
    originalEvent?: Event;
}
/** Menu selection event interface */
export interface MenuSelectEvent<TData = unknown> extends MenuEvent {
    /** The selected menu item */
    item: MenuItem<TData>;
    /** ID of the selected menu item */
    itemId: string;
    /** The item's id again, as the `value` of the `<m-menu>` element's `select` */
    value: string;
    /** Data associated with the menu item (if any) */
    itemData?: TData;
    /** Keeps the menu open: a `closeOnSelect` menu does not close for this selection */
    preventDefault: () => void;
    /** Whether a listener has called `preventDefault()` */
    defaultPrevented: boolean;
}
/** Menu component interface */
export interface MenuComponent {
    /** The menu's root DOM element */
    element: HTMLElement;
    /**
 * Opens the menu.
 * @param event
 * @param interactionType
 */
    open: (event?: Event, interactionType?: "mouse" | "keyboard") => MenuComponent;
    /**
 * Closes the menu.
 * @param event
 * @param restoreFocus
 * @param skipAnimation
 */
    close: (event?: Event, restoreFocus?: boolean, skipAnimation?: boolean) => MenuComponent;
    /**
 * Toggles the menu's open state
 * @param event
 */
    toggle: (event?: Event) => MenuComponent;
    /** Checks if the menu is currently open. */
    isOpen: () => boolean;
    /**
 * Updates the menu items
 * @param items
 */
    setItems: (items: MenuContent[]) => MenuComponent;
    /** Gets the current menu items */
    getItems: () => MenuContent[];
    /**
 * Updates the menu's opener element
 * @param opener
 */
    setOpener: (opener: HTMLElement | string) => MenuComponent;
    /** Gets the current opener element */
    getOpener: () => HTMLElement;
    /**
 * Updates the menu's position
 * @param position
 */
    setPosition: (position: MenuPosition) => MenuComponent;
    /** Gets the current menu position */
    getPosition: () => MenuPosition;
    /**
 * Sets the selected menu item
 * @param itemId
 */
    setSelected: (itemId: string | null) => MenuComponent;
    /** Gets the currently selected menu item's ID */
    getSelected: () => string | null;
    /**
 * Adds an event listener to the menu
 * @param event
 * @param handler
 */
    on<T extends keyof MenuEvents>(event: T, handler: MenuEvents[T]): MenuComponent;
    /**
 * Adds an event listener for any event the menu emits, such as
 * @param event
 * @param handler
 */
    on(event: string, handler: EventCallback): MenuComponent;
    /**
 * Removes an event listener from the menu
 * @param event
 * @param handler
 */
    off<T extends keyof MenuEvents>(event: T, handler: MenuEvents[T]): MenuComponent;
    /**
 * Removes an event listener for any event the menu emits
 * @param event
 * @param handler
 */
    off(event: string, handler: EventCallback): MenuComponent;
    /** Destroys the menu component and cleans up resources */
    destroy: () => void;
}
/** Menu events interface for type-checking */
export interface MenuEvents {
    open: (event: MenuEvent) => void;
    close: (event: MenuEvent) => void;
    select: (event: MenuSelectEvent) => void;
}
/** The menu as its own features see it, part-way through the pipe. */
/** What withController installs at `component.menu`. */
/** Menu state the keyboard handlers read. */
export interface KeyboardMenuState {
    items: MenuContent[];
}
/** Menu actions the keyboard handlers call. */
export interface KeyboardActions {
    closeMenu: (event: Event, restoreFocus?: boolean) => void;
    findItemById: (id: string) => MenuItem | null;
    closeSubmenu?: (level: number) => void;
    handleSubmenuClick?: (item: MenuItem, index: number, itemElement: HTMLElement) => void;
    handleNestedSubmenuClick?: (item: MenuItem, index: number, itemElement: HTMLElement) => void;
}
export interface MenuControllerApi {
    open: (event?: Event, interactionType?: "mouse" | "keyboard") => void;
    close: (event?: Event, restoreFocus?: boolean, skipAnimation?: boolean) => void;
    toggle: (event?: Event, interactionType?: "mouse" | "keyboard") => void;
    isOpen: () => boolean;
    getItems: () => MenuContent[];
    setItems: (items: MenuContent[]) => void;
    getSelected: () => string | null;
    setSelected: (value: string | null) => void;
    getPosition: () => MenuPosition;
    setPosition: (position: MenuPosition) => void;
}
/** A component that can act as a menu's opener: anything that exposes an element through `element`, `getElement()` or `input`, and follows the menu's open state when it can. */
export interface OpenerComponent {
    element?: HTMLElement;
    getElement?: () => HTMLElement;
    input?: HTMLElement;
    setActive?: (active: boolean) => void;
    selected?: boolean;
    focus?: () => void;
    blur?: () => void;
}
/** What a menu opener can be given as: a selector, an element or a component */
export type OpenerTarget = string | HTMLElement | OpenerComponent;
/** What withOpener installs at `component.opener`. */
export interface MenuOpenerApi {
    setOpener: (opener: OpenerTarget) => void;
    getOpener: () => HTMLElement | null;
    getOpenerComponent: () => OpenerComponent | null;
    setActive: (active: boolean) => void;
    focus: () => void;
}
export interface MenuFeatureHost {
    element: HTMLElement;
    getClass: (name: string) => string;
    lifecycle: {
        destroy: () => void;
    };
    emit: (event: string, data?: unknown) => unknown;
    on: (event: string, handler: EventCallback) => unknown;
    off: (event: string, handler: EventCallback) => unknown;
    menu?: MenuControllerApi;
    opener?: MenuOpenerApi;
    position?: {
        positionMenu: (openerElement: HTMLElement) => void;
        positionSubmenu: (submenuElement: HTMLElement, parentItemElement: HTMLElement, level?: number) => void;
    };
    keyboard?: {
        setupKeyboardHandlers: (menuElement: HTMLElement, state: KeyboardMenuState, actions: KeyboardActions) => void;
        removeKeyboardHandlers: (element: HTMLElement) => void;
        handleMenuKeydown: (e: KeyboardEvent, state: KeyboardMenuState, actions: KeyboardActions) => void;
        handleInitialFocus: (menuElement: HTMLElement, interactionType: "keyboard" | "mouse", openingEvent?: Event) => void;
        isTabNavigationActive: () => boolean;
    };
    submenu?: {
        handleSubmenuClick: (item: MenuItem, index: number, itemElement: HTMLElement) => void;
        handleSubmenuHover: (item: MenuItem, index: number, itemElement: HTMLElement) => void;
        handleSubmenuLeave: () => void;
        handleNestedSubmenuClick: (item: MenuItem, index: number, itemElement: HTMLElement) => void;
        closeSubmenu: (level: number) => void;
        closeAllSubmenus: () => void;
        hasOpenSubmenu: () => boolean;
        getActiveSubmenus: () => Array<{
            element: HTMLElement;
        }>;
    };
}
declare module "../../core/config/global" {
    interface ComponentConfigMap {
        menu?: Partial<MenuConfig>;
    }
}
