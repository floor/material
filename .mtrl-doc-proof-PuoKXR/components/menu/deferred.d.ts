import type { EventCallback } from "../../core/state/emitter.js";
import type { MenuConfig, MenuContent, MenuEvent, MenuPosition, MenuSelectEvent } from "./types.js";
export type { MenuContent, MenuItem, MenuDivider, MenuGap, MenuPosition, MenuVariant, MenuColor } from "./types.js";
/** An accepted open/close request; presentation may still be loading. */
export interface DeferredMenuEvent extends Omit<MenuEvent, "menu"> {
    menu: DeferredMenuComponent;
}
/** Selection keeps the controller's live cancellation state. */
export interface DeferredMenuSelectEvent extends Omit<MenuSelectEvent, "menu"> {
    menu: DeferredMenuComponent;
}
/** An explicit load or construction attempt failed. */
export interface DeferredMenuLoadErrorEvent {
    menu: DeferredMenuComponent;
    error: unknown;
}
export interface DeferredMenuEvents {
    open: (event: DeferredMenuEvent) => void;
    close: (event: DeferredMenuEvent) => void;
    select: (event: DeferredMenuSelectEvent) => void;
    loaderror: (event: DeferredMenuLoadErrorEvent) => void;
}
export interface DeferredMenuConfig extends Omit<MenuConfig, "on"> {
    on?: Partial<DeferredMenuEvents>;
}
/** Opt-in delivery handle. */
export interface DeferredMenuComponent {
    readonly element: HTMLElement | null;
    isReady(): boolean;
    preload(): Promise<void>;
    open(event?: Event, interactionType?: "mouse" | "keyboard"): DeferredMenuComponent;
    close(event?: Event, restoreFocus?: boolean, skipAnimation?: boolean): DeferredMenuComponent;
    toggle(event?: Event): DeferredMenuComponent;
    isOpen(): boolean;
    setItems(items: MenuContent[]): DeferredMenuComponent;
    getItems(): MenuContent[];
    setOpener(opener: HTMLElement | string): DeferredMenuComponent;
    getOpener(): HTMLElement;
    setPosition(position: MenuPosition): DeferredMenuComponent;
    getPosition(): MenuPosition;
    setSelected(itemId: string | null): DeferredMenuComponent;
    getSelected(): string | null;
    on<T extends keyof DeferredMenuEvents>(event: T, handler: DeferredMenuEvents[T]): DeferredMenuComponent;
    on(event: string, handler: EventCallback): DeferredMenuComponent;
    off<T extends keyof DeferredMenuEvents>(event: T, handler: DeferredMenuEvents[T]): DeferredMenuComponent;
    off(event: string, handler: EventCallback): DeferredMenuComponent;
    destroy(): void;
}
/** Create a closed menu handle without requesting its implementation. */
export declare const createDeferredMenu: (config: DeferredMenuConfig) => DeferredMenuComponent;
export default createDeferredMenu;
