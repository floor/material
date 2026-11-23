import type { EventCallback } from "../../core/state/emitter.js";
import type { MenuConfig, MenuContent, MenuEvents, MenuPosition } from "./types.js";
/** createMenu's configuration, except the items, which setItems may replace. */
type MenuSettings = Omit<MenuConfig, "items">;
/** The menu a select or a split button holds before the chunk arrives: the operations the two components reach on their own inner menu. */
export interface OnDemandMenu {
    readonly element: HTMLElement;
    /** Starts the load without opening the menu, from the intent to open it. */
    preload(): void;
    /** Runs once the real menu exists, after an open that waited for it. */
    whenReady(callback: () => void): void;
    open(event?: Event, interactionType?: "mouse" | "keyboard"): OnDemandMenu;
    close(event?: Event, restoreFocus?: boolean, skipAnimation?: boolean): OnDemandMenu;
    isOpen(): boolean;
    setItems(items: MenuContent[]): OnDemandMenu;
    getItems(): MenuContent[];
    setPosition(value: MenuPosition): OnDemandMenu;
    getPosition(): MenuPosition;
    setSelected(value: string | null): OnDemandMenu;
    on<T extends keyof MenuEvents>(event: T, handler: MenuEvents[T]): OnDemandMenu;
    on(event: string, handler: EventCallback): OnDemandMenu;
    destroy(): void;
}
/**
 * A stand-in for the menu, replaced by it when the chunk lands
 * @param settings
 * @param items
 */
export declare const createOnDemandMenu: (settings: MenuSettings, items: MenuContent[]) => OnDemandMenu;
export {};
