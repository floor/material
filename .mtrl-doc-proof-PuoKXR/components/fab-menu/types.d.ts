import type { ElementComponent } from "../../core/compose/index.js";
import type { BaseComponentConfig } from "../../core/config/component.js";
import type { FabMenuColor, FabMenuSize, FabMenuPresentation, FabMenuPlacement } from "./constants.js";
/** An action of the menu */
export interface FabMenuItem {
    /** Identifies the item in `select` */
    id: string;
    /** The label: always shown (m3.material.io FAB menu guidelines) */
    text: string;
    /** Icon HTML, 24dp. */
    icon?: string;
}
/** What the menu presentation needs from a menu: the baseline menu (createMenu), or one the app brings. */
export interface FabMenuMenu {
    open(event?: Event, interactionType?: "mouse" | "keyboard"): unknown;
    close(event?: Event, restoreFocus?: boolean): unknown;
    isOpen(): boolean;
    on(event: "close" | "select", handler: (event: {
        itemId?: string;
    }) => void): unknown;
    destroy(): void;
    element: HTMLElement;
}
/** Configuration of a FAB menu */
export interface FabMenuConfig extends BaseComponentConfig {
    /** The FAB's icon HTML. */
    icon: string;
    /** The FAB's accessible name: it describes the menu the FAB opens */
    ariaLabel: string;
    /** The actions, 2 to 6 (m3.material.io FAB menu guidelines). */
    items: FabMenuItem[];
    /**
 * Colour set: the FAB is the role's container, the close button the role,
 * @default 'primary'
 */
    color?: FabMenuColor | string;
    /**
 * The size of the FAB the menu opens from
 * @default 'default'
 */
    size?: FabMenuSize | string;
    /**
 * The expressive list (compact windows), the baseline menu (the site's rule
 * @default 'auto'
 */
    presentation?: FabMenuPresentation | string;
    /**
 * Where the FAB sits in its positioned container: 16dp from the window edges, 24dp in large windows.
 * @default 'none'
 */
    placement?: FabMenuPlacement | string;
    /** The icon of the close button, 20dp. */
    closeIcon?: string;
    /** A menu of the app's own for the menu presentation, in place of the baseline menu the FAB menu loads when it needs one. */
    menu?: (opener: HTMLElement, items: FabMenuItem[]) => FabMenuMenu;
    /** Additional CSS classes */
    class?: string;
}
/** Events of a FAB menu */
export interface FabMenuEvents {
    /** The menu opened */
    open: () => void;
    /** The menu closed */
    close: () => void;
    /** An item was chosen; the menu closes. */
    select: (event: {
        id: string;
        value: string;
    }) => void;
}
/** A FAB menu */
export interface FabMenuComponent extends ElementComponent {
    /** The FAB, which becomes the close button of the list */
    fab: HTMLElement;
    /** The list of the list presentation: `role="menu"` */
    list: HTMLElement;
    /** Opens the menu. */
    open(event?: Event): this;
    /** Closes the menu. */
    close(): this;
    /** Opens or closes the menu */
    toggle(event?: Event): this;
    /** Whether the menu is open */
    isOpen(): boolean;
    /** The presentation in use: 'list' or 'menu' */
    getPresentation(): "list" | "menu";
    on<K extends keyof FabMenuEvents>(event: K, handler: FabMenuEvents[K]): this;
    off<K extends keyof FabMenuEvents>(event: K, handler: FabMenuEvents[K]): this;
    /** Removes the FAB menu, its listeners and its menu */
    destroy(): void;
}
/** Registers FabMenuConfig with the global defaults map, so `setComponentDefaults("fab-menu", ...)` is typed without core importing anything from this component. */
declare module "../../core/config/global" {
    interface ComponentConfigMap {
        "fab-menu"?: Partial<FabMenuConfig>;
    }
}
