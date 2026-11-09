import type { EventCallback } from "../../core/state/emitter";
import { eventsFrom, type EventsFrom } from "../../core/dom/layer";
import { focusWithin } from "./features/layer";
import { menuOpened, menuClosed } from "./features/registry";
import type {
  MenuComponent, MenuConfig, MenuContent, MenuEvent, MenuPosition, MenuSelectEvent,
} from "./types";

export type { MenuContent, MenuItem, MenuDivider, MenuGap, MenuPosition, MenuVariant, MenuColor } from "./types";

/** An accepted open/close request; presentation may still be loading. */
export interface DeferredMenuEvent extends Omit<MenuEvent, "menu"> { menu: DeferredMenuComponent }
/** Selection keeps the controller's live cancellation state. */
export interface DeferredMenuSelectEvent extends Omit<MenuSelectEvent, "menu"> { menu: DeferredMenuComponent }
/** An explicit load or construction attempt failed. A later request may retry. */
export interface DeferredMenuLoadErrorEvent { menu: DeferredMenuComponent; error: unknown }
export interface DeferredMenuEvents {
  open: (event: DeferredMenuEvent) => void;
  close: (event: DeferredMenuEvent) => void;
  select: (event: DeferredMenuSelectEvent) => void;
  loaderror: (event: DeferredMenuLoadErrorEvent) => void;
}
export interface DeferredMenuConfig extends Omit<MenuConfig, "on"> {
  on?: Partial<DeferredMenuEvents>;
}
/** Opt-in delivery handle. Await preload before accessing the real surface. */
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

/** Same input forms as MenuConfig, resolved before starting any import. */
const resolveOpener = (value: MenuConfig["opener"]): HTMLElement => {
  const element = typeof value === "string" ? document.querySelector(value)
    : value && "element" in value ? value.element : value;
  if (!(element instanceof HTMLElement)) throw new Error("Menu component requires an opener element or resolvable selector");
  return element;
};

/**
 * Create a closed menu handle without requesting its implementation. Open state
 * and events are synchronous; the ordinary menu controller presents it once
 * loaded. CSS stays the application's synchronous stylesheet choice.
 */
export const createDeferredMenu = (config: DeferredMenuConfig): DeferredMenuComponent => {
  let opener = resolveOpener(config.opener);
  let openerTarget = typeof config.opener === "string" ? opener : config.opener;
  let menu: MenuComponent | null = null;
  let inflight: Promise<void> | null = null;
  let abortLoad: ((reason: unknown) => void) | undefined;
  let destroyed = false;
  let opened = false;
  let generation = 0;
  let replay = 0;
  let items = config.items;
  let position: MenuPosition = config.position ?? "bottom-start";
  let selected: string | null = null;
  let asked: [Event | undefined, "mouse" | "keyboard" | undefined] = [undefined, undefined];
  const listeners = new Map<string, EventCallback[]>();
  const bridges = new Map<string, EventCallback>();
  let from: EventsFrom | undefined;
  let observer: MutationObserver | undefined;
  let dialog: Element | null = null;
  // Restore author attributes only while the facade still owns their values.
  let original = new Map<string, string | null>();
  let owned = new Map<string, string | null>();
  const write = (name: string, value: string | null): void => {
    if (!original.has(name)) original.set(name, opener.getAttribute(name));
    if (value === null) opener.removeAttribute(name);
    else opener.setAttribute(name, value);
    owned.set(name, value);
  };
  const restore = (name: string): void => {
    if (!owned.has(name)) return;
    if (opener.getAttribute(name) === owned.get(name)) {
      const value = original.get(name) ?? null;
      if (value === null) opener.removeAttribute(name);
      else opener.setAttribute(name, value);
    }
    owned.delete(name);
    original.delete(name);
  };
  const attributes = ["aria-haspopup", "aria-expanded", "aria-controls"];
  const capture = (): void => {
    for (const name of attributes) original.set(name, opener.getAttribute(name));
    if (!config.listbox) {
      if (!opener.hasAttribute("aria-haspopup")) write("aria-haspopup", "true");
      write("aria-expanded", "false");
    }
  };
  // The eager opener clears its own attributes on destroy/retarget. Preserve
  // both the original author values and any later edits around that cleanup.
  const preserveAttributes = (action: () => void): void => {
    const values = attributes.map(name => [name,
      owned.has(name) && opener.getAttribute(name) === owned.get(name)
        ? original.get(name) ?? null : opener.getAttribute(name)] as const);
    action();
    for (const [name, value] of values) {
      if (value === null) opener.removeAttribute(name); else opener.setAttribute(name, value);
    }
  };
  const notify = (name: string, payload: unknown): void => {
    for (const callback of [...listeners.get(name) ?? []]) {
      if (destroyed) break;
      try { callback(payload); } catch (error) { console.error(`A listener for "${name}" threw:`, error); }
    }
  };
  const usable = (): boolean => {
    if (!opener.isConnected || opener.matches(":disabled, [disabled], [aria-disabled='true']") ||
      (config.container && !config.container.isConnected)) return false;
    for (let node: Element | undefined = opener; node;) {
      if (node.closest("[inert], [hidden], dialog:not([open])") ||
        getComputedStyle(node).display === "none" || getComputedStyle(node).visibility === "hidden") return false;
      const root = node.getRootNode();
      node = "host" in root ? (root as ShadowRoot).host : undefined;
    }
    return true;
  };
  const registry = { close: (event?: Event): void => { api.close(event, false); } };
  const stopPending = (keepWatch = false): void => {
    from?.stop();
    from = undefined;
    if (!keepWatch) {
      observer?.disconnect(); observer = undefined;
      dialog?.removeEventListener("close", cancelled); dialog = null;
    }
    document.removeEventListener("click", outside);
    document.removeEventListener("keydown", pendingKey);
    restore("aria-busy");
    menuClosed(registry);
  };
  const cancelled = (event?: Event): void => { api.close(event, false); };
  const outside = (event: Event): void => {
    if (from?.after(event) && !event.composedPath().includes(opener)) api.close(event, false);
  };
  const pendingKey = (event: KeyboardEvent): void => {
    if (!from?.after(event)) return;
    if (event.key === "Escape" && config.closeOnEscape !== false && !config.listbox) {
      event.preventDefault();
      api.close(event);
    } else if (event.key === "Tab") api.close(event, false);
  };
  const startPending = (): void => {
    from = eventsFrom(opener);
    write("aria-busy", "true");
    if (config.closeOnClickOutside !== false) document.addEventListener("click", outside);
    document.addEventListener("keydown", pendingKey);
    watchOpener();
  };
  const watchOpener = (): void => {
    dialog = opener.closest("dialog");
    dialog?.addEventListener("close", cancelled);
    observer = new MutationObserver(() => { if (opened && !usable()) api.close(undefined, false); });
    const options = { subtree: true, childList: true, attributes: true,
      attributeFilter: ["disabled", "aria-disabled", "open", "hidden", "inert", "style", "class"] };
    observer.observe(document, options);
    // Document observers do not cross shadow boundaries. Watch each root
    // containing the opener too, including changes to an outer shadow host.
    for (let root = opener.getRootNode(); "host" in root; root = (root as ShadowRoot).host.getRootNode()) {
      observer.observe(root, options);
    }
  };
  const click = (event: MouseEvent): void => {
    if (!usable()) return;
    event.preventDefault();
    event.stopPropagation();
    api.toggle(event);
  };
  const key = (event: KeyboardEvent): void => {
    if (!usable()) return;
    if (["Enter", " ", "ArrowDown", "Down", "ArrowUp", "Up"].includes(event.key)) {
      event.preventDefault();
      if (!opened || !menu) api.open(event, "keyboard");
    } else if (event.key === "Escape" && opened && config.closeOnEscape !== false && !config.listbox) {
      event.preventDefault();
      api.close(event);
    }
  };
  const blur = (event: FocusEvent): void => {
    if (opened && (!menu || !focusWithin({ opener, items, layer: config.layer }, menu.element, event.relatedTarget as Node | null))) {
      api.close(event, false);
    }
  };
  const wireOpener = (add: boolean): void => {
    if (config.manualOpen) return;
    if (add) {
      opener.addEventListener("click", click);
      opener.addEventListener("keydown", key);
      opener.addEventListener("blur", blur);
    } else {
      opener.removeEventListener("click", click);
      opener.removeEventListener("keydown", key);
      opener.removeEventListener("blur", blur);
    }
  };
  const bridge = (name: string): void => {
    if (!menu || bridges.has(name) || name === "loaderror") return;
    const forward: EventCallback = (payload: unknown) => {
      if (destroyed || (replay && (name === "open" || name === "close"))) return;
      if (name === "close") {
        if (!opened) return;
        opened = false;
        generation++;
        stopPending();
        if (!config.listbox) {
          write("aria-expanded", "false");
          write("aria-controls", original.get("aria-controls") ?? null);
        }
      }
      const data = payload as Record<string, unknown>;
      if (name === "select") {
        selected = menu!.getSelected();
        const selection = payload as MenuSelectEvent;
        notify(name, { ...selection, menu: api,
          get defaultPrevented() { return selection.defaultPrevented; },
          set defaultPrevented(value: boolean) { selection.defaultPrevented = value; },
          preventDefault: () => selection.preventDefault() });
      } else notify(name, data && typeof data === "object" ? { ...data, menu: api } : payload);
    };
    bridges.set(name, forward);
    menu.on(name, forward);
  };
  const present = (): void => {
    if (!opened || destroyed || !menu) return;
    if (!usable()) { api.close(undefined, false); return; }
    const version = generation;
    stopPending(true);
    replay++;
    try { menu.open(...asked); } finally { replay--; }
    if (destroyed || !opened || version !== generation) return;
    if (!config.listbox) {
      write("aria-controls", menu.element.getRootNode() === opener.getRootNode() ? menu.element.id : null);
      write("aria-expanded", "true");
    }
  };
  const abortError = (): DOMException => new DOMException("Menu destroyed", "AbortError");
  const load = (): Promise<void> => {
    if (destroyed) return Promise.reject(abortError());
    if (menu) return Promise.resolve();
    if (inflight) return inflight;
    const request = new Promise<void>((resolve, reject) => {
      abortLoad = reject;
      import("./index").then(({ default: createMenu }) => {
        if (destroyed) return;
        menu = createMenu({ ...config, opener: openerTarget, items, position, on: undefined, visible: false, manualOpen: true });
        menu.setSelected(selected);
        // The eager opener prepares an IDREF at construction. A preloaded,
        // detached surface must not leave that dangling reference on the page.
        if (!config.listbox) {
          owned.set("aria-controls", opener.getAttribute("aria-controls"));
          write("aria-controls", original.get("aria-controls") ?? null);
        }
        for (const name of new Set(["close", "select", ...listeners.keys()])) bridge(name);
        if (opened) present();
        resolve();
      }).catch((error: unknown) => {
        if (destroyed) return;
        const failed = menu;
        menu = null;
        if (failed) preserveAttributes(() => failed.destroy());
        bridges.clear();
        if (!config.listbox) {
          if (!opener.hasAttribute("aria-haspopup")) write("aria-haspopup", "true");
          write("aria-expanded", "false");
        }
        inflight = null;
        abortLoad = undefined;
        try {
          if (opened) api.close(undefined, false);
          if (!destroyed) notify("loaderror", { menu: api, error });
        } finally { reject(error); }
      });
    });
    inflight = request;
    void request.then(() => {
      if (inflight === request) { inflight = null; abortLoad = undefined; }
    }, () => {
      if (inflight === request) { inflight = null; abortLoad = undefined; }
    });
    return request;
  };
  const api: DeferredMenuComponent = {
    get element() { return menu?.element ?? null; },
    isReady: () => menu !== null,
    preload: load,
    open(event, interactionType) {
      if (destroyed) return api;
      asked = [event, interactionType];
      if (opened) return api;
      opened = true;
      const version = ++generation;
      menuOpened(registry, event);
      if (destroyed || !opened || version !== generation) return api;
      if (!menu) startPending();
      else watchOpener();
      notify("open", { menu: api, originalEvent: event });
      if (destroyed || !opened || version !== generation) return api;
      if (menu) present();
      else void load().catch(() => {});
      return api;
    },
    close(event, restoreFocus = true, skipAnimation = false) {
      if (destroyed || !opened) return api;
      opened = false;
      generation++;
      stopPending();
      const version = generation;
      if (menu) {
        replay++;
        try { menu.close(event, restoreFocus && usable(), skipAnimation); } finally { replay--; }
      }
      if (destroyed) return api;
      if (version === generation && !config.listbox) {
        write("aria-expanded", "false");
        write("aria-controls", original.get("aria-controls") ?? null);
      }
      notify("close", { menu: api, originalEvent: event });
      return api;
    },
    toggle: (event) => opened ? api.close(event) : api.open(event),
    isOpen: () => opened,
    setItems(value) { if (!destroyed) { items = value; menu?.setItems(value); } return api; },
    getItems: () => items,
    setPosition(value) { if (!destroyed) { position = value; menu?.setPosition(value); } return api; },
    getPosition: () => position,
    setSelected(value) { if (!destroyed) { selected = value; menu?.setSelected(value); } return api; },
    getSelected: () => menu?.getSelected() ?? selected,
    setOpener(value) {
      if (destroyed) return api;
      const next = resolveOpener(value);
      if (next === opener) return api;
      const previous = opener;
      api.close(undefined, false);
      if (destroyed || opened || opener !== previous) return api;
      wireOpener(false);
      // Capture the new author's values before the controller writes them.
      const nextOriginal = new Map(attributes.map(name => [name, next.getAttribute(name)]));
      preserveAttributes(() => menu?.setOpener(next));
      original = nextOriginal; owned = new Map(); opener = next; openerTarget = next;
      if (!config.listbox) {
        if (original.get("aria-haspopup") === null) write("aria-haspopup", "true");
        write("aria-expanded", "false");
        write("aria-controls", original.get("aria-controls") ?? null);
      }
      wireOpener(true);
      return api;
    },
    getOpener: () => opener,
    on(name: string, callback: EventCallback) {
      if (!destroyed) { listeners.set(name, [...listeners.get(name) ?? [], callback]); bridge(name); }
      return api;
    },
    off(name: string, callback: EventCallback) {
      if (!destroyed) listeners.set(name, (listeners.get(name) ?? []).filter(value => value !== callback));
      return api;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; opened = false; generation++;
      stopPending(); wireOpener(false); listeners.clear();
      preserveAttributes(() => menu?.destroy()); menu = null;
      owned.clear(); original.clear(); bridges.clear();
      abortLoad?.(abortError()); abortLoad = undefined;
    },
  };
  capture(); wireOpener(true);
  for (const [name, callback] of Object.entries(config.on ?? {})) if (callback) api.on(name, callback);
  if (config.visible) api.open();
  return api;
};

export default createDeferredMenu;
