// src/components/split-button/features/menu-on-demand.ts
//
// The split button's menu, as the button holds it before the menu's chunk has
// arrived. The menu is most of what a split button with items costs, so it is
// loaded on the first open rather than with the component.
//
// The button's own contract is not deferred: expand() has set isExpanded(),
// aria-expanded and emitted expand/change before it returns, exactly as when
// the menu was created with the component. The menu's open() or close() lands
// when the chunk arrives; its events, from it or from the user's next
// interaction, reach the listeners wired at creation.

import type { EventCallback } from "../../../core/state/emitter";
import type { MenuComponent, MenuConfig, MenuContent, MenuPosition } from "../../menu/types";

/** createMenu's configuration, except the items, which setItems may replace. */
type MenuSettings = Omit<MenuConfig, "items">;

/**
 * A MenuComponent that creates the real menu on first open
 *
 * @param settings - The menu's configuration, without items
 * @param items - The items the menu starts with
 * @returns A stand-in for the menu, replaced by it when the chunk lands
 */
export const createOnDemandMenu = (settings: MenuSettings, items: MenuContent[]): MenuComponent => {
  let menu: MenuComponent | null = null;
  let loading = false;
  let destroyed = false;
  // Whether the menu is to be open; the chunk may not have arrived yet
  let opened = false;
  let asked: [Event | undefined, "mouse" | "keyboard" | undefined] = [undefined, undefined];
  let current = items;
  let selected: string | null | undefined;
  let position: MenuPosition = settings.position ?? "bottom-end";
  // The split button always hands over its trailing element
  let opener: HTMLElement | string = settings.opener as HTMLElement;
  const openerElement: HTMLElement | null = typeof settings.opener === "string"
    ? null
    : (settings.opener as { element?: HTMLElement }).element ?? (settings.opener as HTMLElement);
  // The menu's opener names the menu it controls, with an id of this shape
  // (menu/features/opener.ts), before the menu is ever shown. The stand-in is
  // that name until the real menu is created and replaces it: the button's
  // ARIA, and the server render, are the same as with the menu at creation.
  const placeholder = document.createElement("div");
  placeholder.id = `menu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  openerElement?.setAttribute("aria-controls", placeholder.id);
  // Listeners added before the menu is there, replayed onto it after
  const listeners = new Map<string, Set<EventCallback>>();

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
    if (opener !== settings.opener) created.setOpener(opener);
    if (opened) created.open(asked[0], asked[1]);
    for (const [event, set] of listeners) for (const listener of set) created.on(event, listener);
    listeners.clear();
  };

  const load = (): void => {
    if (menu || loading || destroyed) return;
    loading = true;
    import("../../menu").then(
      ({ default: createMenu }) => {
        loading = false;
        if (destroyed) return;
        attach(createMenu({ ...settings, items: current } as MenuConfig));
      },
      (error: unknown) => {
        loading = false;
        console.error("Split button menu failed to load:", error);
      },
    );
  };

  const api: MenuComponent = {
    get element(): HTMLElement {
      return menu?.element ?? placeholder;
    },

    open(event?: Event, interactionType?: "mouse" | "keyboard"): MenuComponent {
      if (menu) {
        menu.open(event, interactionType);
        return api;
      }
      if (!opened) {
        opened = true;
        notify("open", { menu: api, originalEvent: event });
      }
      asked = [event, interactionType];
      load();
      return api;
    },

    close(event?: Event, restoreFocus = true, skipAnimation = false): MenuComponent {
      if (menu) {
        menu.close(event, restoreFocus, skipAnimation);
        return api;
      }
      if (opened) {
        opened = false;
        notify("close", { menu: api, originalEvent: event });
      }
      return api;
    },

    toggle(event?: Event): MenuComponent {
      // isOpen(), not `opened`: once the menu is there, it holds the state
      if (api.isOpen()) api.close(event);
      else api.open(event);
      return api;
    },

    isOpen: (): boolean => (menu ? menu.isOpen() : opened),

    setItems(items: MenuContent[]): MenuComponent {
      current = items;
      menu?.setItems(items);
      return api;
    },

    getItems: (): MenuContent[] => (menu ? menu.getItems() : current),

    setOpener(value: HTMLElement | string): MenuComponent {
      if (menu) menu.setOpener(value);
      else opener = value;
      return api;
    },

    getOpener: (): HTMLElement => (menu ? menu.getOpener() : (opener as HTMLElement)),

    setPosition(value: MenuPosition): MenuComponent {
      if (menu) menu.setPosition(value);
      else position = value;
      return api;
    },

    getPosition: (): MenuPosition => (menu ? menu.getPosition() : position),

    setSelected(value: string | null): MenuComponent {
      if (menu) menu.setSelected(value);
      else selected = value;
      return api;
    },

    getSelected: (): string | null => (menu ? menu.getSelected() : (selected ?? null)),

    on(event: string, handler: EventCallback): MenuComponent {
      if (menu) menu.on(event, handler);
      else {
        const set = listeners.get(event) ?? new Set<EventCallback>();
        set.add(handler);
        listeners.set(event, set);
      }
      return api;
    },

    off(event: string, handler: EventCallback): MenuComponent {
      if (menu) menu.off(event, handler);
      else listeners.get(event)?.delete(handler);
      return api;
    },

    destroy(): void {
      destroyed = true;
      listeners.clear();
      menu?.destroy();
    },
  };

  return api;
};
