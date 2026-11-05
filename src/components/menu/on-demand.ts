// src/components/menu/on-demand.ts
//
// A menu the component holds before the menu's chunk has arrived. The menu is
// most of what a select or a split button with items costs, so it is loaded on
// the first open (or a little earlier, from the intent that precedes it)
// rather than with the component.
//
// The component's own contract is not deferred: open() has set isOpen(), the
// ARIA and emitted the open event before it returns, exactly as when the menu
// was created with the component. The menu's open() or close() lands when the
// chunk arrives; its events, from it or from the user's next interaction,
// reach the listeners wired at creation. The opener's ARIA is the menu's own
// rule (menu/features/opener.ts), written at creation for a menu popup and
// skipped for a listbox, whose combobox carries it.

import type { EventCallback } from "../../core/state/emitter";
import { openWithInitialFocus } from "./inner";
import type { MenuComponent, MenuConfig, MenuContent, MenuEvents, MenuPosition } from "./types";

/** createMenu's configuration, except the items, which setItems may replace. */
type MenuSettings = Omit<MenuConfig, "items">;

/**
 * The menu a select or a split button holds before the chunk arrives: the
 * operations the two components reach on their own inner menu. The rest of
 * the menu's API comes with the menu, which is why it is not here.
 */
export interface OnDemandMenu {
  readonly element: HTMLElement;
  /** Starts the load without opening the menu, from the intent to open it. */
  preload(): void;
  /** Runs once the real menu exists, after an open that waited for it. */
  whenReady(callback: () => void): void;
  open(event?: Event, interactionType?: "mouse" | "keyboard", initialFocus?: "first" | "last"): OnDemandMenu;
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
 *
 * @param settings - The menu's configuration, without items
 * @param items - The items the menu starts with
 * @returns The stand-in
 */
export const createOnDemandMenu = (settings: MenuSettings, items: MenuContent[]): OnDemandMenu => {
  let menu: MenuComponent | null = null;
  let loading = false;
  let destroyed = false;
  // Whether the menu is to be open; the chunk may not have arrived yet
  let opened = false;
  let asked: [Event | undefined, "mouse" | "keyboard" | undefined, "first" | "last" | undefined] = [undefined, undefined, undefined];
  let current = items;
  let selected: string | null | undefined;
  let position: MenuPosition = settings.position ?? "bottom-end";
  const openerElement: HTMLElement | null = typeof settings.opener === "string"
    ? null
    : (settings.opener as { element?: HTMLElement }).element ?? (settings.opener as HTMLElement);
  // The menu's opener names the menu it controls, with an id of this shape
  // (menu/features/opener.ts), before the menu is ever shown. The stand-in is
  // that name until the real menu is created and replaces it: the component's
  // ARIA, and the server render, are the same as with the menu at creation.
  const placeholder = document.createElement("div");
  placeholder.id = `menu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  // A listbox popup belongs to a combobox, which carries its own ARIA
  if (!settings.listbox) {
    if (openerElement && !openerElement.hasAttribute("aria-haspopup")) {
      openerElement.setAttribute("aria-haspopup", "true");
    }
    openerElement?.setAttribute("aria-expanded", "false");
    openerElement?.setAttribute("aria-controls", placeholder.id);
  }
  // Listeners added before the menu is there, replayed onto it after
  const listeners = new Map<string, Set<EventCallback>>();
  // Callers waiting for the real menu, run after it exists
  let ready: (() => void)[] = [];

  const notify = (event: string, payload: unknown): void => {
    for (const listener of listeners.get(event) ?? []) listener(payload);
  };

  const attach = (created: MenuComponent): void => {
    menu = created;
    // What was set while it loaded, before the listeners: the open() that
    // waited for the chunk is this stand-in's, already emitted, not a second
    // one when the surface arrives.
    if (selected !== undefined) created.setSelected(selected);
    if (position !== settings.position) created.setPosition(position);
    if (opened) {
      const [event, interactionType, initialFocus] = asked;
      // The intent is the owner's, not the public open's: it goes through the
      // menu's symbol, and a plain open stays a plain open
      if (initialFocus) openWithInitialFocus(created, event, interactionType, initialFocus);
      else created.open(event, interactionType);
    }
    for (const [event, set] of listeners) for (const listener of set) created.on(event, listener);
    listeners.clear();
    const waiting = ready;
    ready = [];
    for (const callback of waiting) callback();
  };

  const load = (): void => {
    if (menu || loading || destroyed) return;
    loading = true;
    import("./index").then(
      ({ default: createMenu }) => {
        loading = false;
        if (destroyed) return;
        attach(createMenu({ ...settings, items: current } as MenuConfig));
      },
      (error: unknown) => {
        loading = false;
        console.error("Menu failed to load:", error);
      },
    );
  };

  const api: OnDemandMenu = {
    get element(): HTMLElement {
      return menu?.element ?? placeholder;
    },

    open(event?: Event, interactionType?: "mouse" | "keyboard", initialFocus?: "first" | "last"): OnDemandMenu {
      if (menu) {
        // The stand-in's own open is internal; the menu's public one is not
        if (initialFocus) openWithInitialFocus(menu, event, interactionType, initialFocus);
        else menu.open(event, interactionType);
        return api;
      }
      if (!opened) {
        opened = true;
        if (!settings.listbox) openerElement?.setAttribute("aria-expanded", "true");
        notify("open", { menu: api, originalEvent: event });
      }
      asked = [event, interactionType, initialFocus];
      load();
      return api;
    },

    close(event?: Event, restoreFocus = true, skipAnimation = false): OnDemandMenu {
      if (menu) {
        menu.close(event, restoreFocus, skipAnimation);
        return api;
      }
      if (opened) {
        opened = false;
        if (!settings.listbox) openerElement?.setAttribute("aria-expanded", "false");
        notify("close", { menu: api, originalEvent: event });
      }
      return api;
    },

    isOpen: (): boolean => (menu ? menu.isOpen() : opened),

    setItems(items: MenuContent[]): OnDemandMenu {
      current = items;
      menu?.setItems(items);
      return api;
    },

    getItems: (): MenuContent[] => (menu ? menu.getItems() : current),

    setPosition(value: MenuPosition): OnDemandMenu {
      if (menu) menu.setPosition(value);
      else position = value;
      return api;
    },

    getPosition: (): MenuPosition => (menu ? menu.getPosition() : position),

    setSelected(value: string | null): OnDemandMenu {
      if (menu) menu.setSelected(value);
      else selected = value;
      return api;
    },

    on(event: string, handler: EventCallback): OnDemandMenu {
      if (menu) menu.on(event, handler);
      else {
        const set = listeners.get(event) ?? new Set<EventCallback>();
        set.add(handler);
        listeners.set(event, set);
      }
      return api;
    },

    preload: (): void => {
      load();
    },

    whenReady: (callback: () => void): void => {
      if (menu) callback();
      else if (!destroyed) ready.push(callback);
    },

    destroy(): void {
      destroyed = true;
      listeners.clear();
      ready = [];
      menu?.destroy();
    },
  };

  return api;
};
