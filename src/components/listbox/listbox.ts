// src/components/listbox/listbox.ts

/**
 * The lean selection popup: a synchronous, single-selection combobox factory.
 *
 * Focus stays on the control; the popup is a `popover="manual"` surface in the
 * top layer, placed with fixed viewport coordinates. Arrow keys move the
 * active row without committing; Enter, Space and Alt+Up commit; Escape,
 * outside interaction, focus departure, scrolling, resizing and viewport
 * movement close without committing.
 *
 * @module components/listbox
 */
import { menuClosed, menuOpened } from "../menu/features/registry";
import type { ListboxComponent, ListboxConfig, ListboxEventHandlers, ListboxEvents, ListboxOption } from "./types";

/** An internal option record: a frozen snapshot of what the caller passed */
type Option<T> = Readonly<Required<Pick<ListboxOption<T>, "id" | "text" | "disabled">> & { data?: T }>;

/** What the factory owns on the control, with the value to put back */
interface OwnedAttribute {
  original: string | null;
  written: string | null;
}

type Binding = [EventTarget, string, EventListener, AddEventListenerOptions | boolean | undefined];

type Popup = HTMLElement & { showPopover: () => void; hidePopover: () => void };

/** Controls a live handle owns; a second handle on one is refused */
const attached = new WeakSet<Element>();
/** Generated ids are unique across instances within the realm */
let instances = 0;

/** The options, validated and snapshotted; throws before anything changes */
function snapshotOptions<T>(list: unknown): Option<T>[] {
  if (!Array.isArray(list)) throw new TypeError("listbox options must be an array");
  const seen = new Set<string>();
  return list.map((raw: unknown, index: number): Option<T> => {
    if (!raw || typeof raw !== "object") throw new TypeError(`listbox option ${index} must be an object`);
    const { id, text, disabled, data } = raw as Partial<ListboxOption<T>>;
    if (typeof id !== "string" || id === "") throw new TypeError(`listbox option ${index} needs a nonempty string id`);
    if (seen.has(id)) throw new TypeError(`listbox option id "${id}" is used twice`);
    seen.add(id);
    if (typeof text !== "string") throw new TypeError(`listbox option "${id}" needs a string text`);
    if (disabled !== undefined && typeof disabled !== "boolean") throw new TypeError(`listbox option "${id}" disabled must be a boolean`);
    return Object.freeze({ id, text, disabled: disabled === true, data });
  });
}

/** An option as the API returns it, so mutating it cannot bypass rendering */
function optionSnapshot<T>(option: Option<T>): ListboxOption<T> {
  return { id: option.id, text: option.text, disabled: option.disabled, data: option.data };
}

/**
 * Creates a listbox handle on a dedicated control.
 *
 * @param config - The control, its accessible name and the options
 * @returns The handle; focus stays on the control while the popup is explored
 * @throws TypeError for an invalid control, option or config value, before the DOM changes
 * @throws RangeError for an unknown initial `value`, before the DOM changes
 * @throws Error when the browser has no Popover API
 * @category Components
 */
export function createListbox<T = unknown>(config: ListboxConfig<T>): ListboxComponent<T> {
  if (!config || typeof config !== "object") throw new TypeError("createListbox needs a config object");
  const control = config.control;
  if (!control || control.nodeType !== 1 || control.localName !== "div") {
    throw new TypeError("listbox control must be a div, not a native input, button or select");
  }
  const element = control as HTMLDivElement;
  if (element.isContentEditable || element.hasAttribute("contenteditable")) {
    throw new TypeError("listbox control must not be editable");
  }
  const interactive = element.querySelector(
    "a[href],button,input,select,textarea,audio[controls],video[controls],summary,[tabindex],[contenteditable]",
  );
  if (interactive) throw new TypeError(`listbox control contains an interactive ${interactive.localName} element`);
  const role = element.getAttribute("role");
  if (role && role !== "combobox" && role !== "none" && role !== "presentation") {
    throw new TypeError(`listbox control has the conflicting role "${role}"`);
  }
  if (attached.has(element)) throw new TypeError("this control already has a listbox");
  if (!element.isConnected) throw new TypeError("listbox control must be connected to a document");
  if (typeof (HTMLElement.prototype as Partial<Popup>).showPopover !== "function") {
    throw new Error("createListbox needs the Popover API: this browser has no showPopover()");
  }
  const ariaLabel = config.ariaLabel;
  if (typeof ariaLabel !== "string" || ariaLabel.trim() === "") {
    throw new TypeError("listbox ariaLabel must be a nonempty string");
  }
  const placeholder = config.placeholder ?? "";
  if (typeof placeholder !== "string") throw new TypeError("listbox placeholder must be a string");
  if (config.disabled !== undefined && typeof config.disabled !== "boolean") throw new TypeError("listbox disabled must be a boolean");
  if (config.on !== undefined && (typeof config.on !== "object" || config.on === null)) throw new TypeError("listbox on must be an object");
  let options = snapshotOptions<T>(config.options);
  const initial = config.value ?? null;
  if (initial !== null && (typeof initial !== "string" || !options.some((option) => option.id === initial))) {
    throw new RangeError(`listbox has no option "${String(initial)}"`);
  }
  const selected = initial === null ? undefined : options.find((option) => option.id === initial);
  if (selected && selected.text === ariaLabel) throw new TypeError("listbox ariaLabel must name the field, not its value");

  const originalText = element.textContent;
  let writtenText = originalText;
  let valueId: string | null = initial;
  let disabled = config.disabled === true;
  let activeIndex = -1;
  let isOpen = false;
  let destroyed = false;
  let generation = 0;
  let buffer = "";
  let bufferAt = 0;
  let observer: MutationObserver | null = null;

  const listeners = new Map<string, Set<(detail: never) => void>>();
  const owned = new Map<string, OwnedAttribute>();
  const rows: HTMLElement[] = [];
  const bound: Binding[] = [];
  const temporary: Binding[] = [];
  const domIds = new Map<string, string>();
  let domCounter = 0;

  const popup = document.createElement("div") as Popup;
  popup.id = `mtrl-listbox-${++instances}`;
  popup.className = "mtrl-listbox";
  popup.setAttribute("popover", "manual");
  popup.setAttribute("role", "listbox");
  popup.setAttribute("aria-label", ariaLabel);

  const setAttr = (name: string, value: string | null): void => {
    const entry = owned.get(name) ?? { original: element.getAttribute(name), written: null };
    owned.set(name, entry);
    entry.written = value;
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  };
  const setText = (text: string): void => {
    writtenText = text;
    element.textContent = text;
  };
  const optionOf = (id: string | null): Option<T> | undefined => (id === null ? undefined : options.find((option) => option.id === id));
  const optionIds = (): Set<string> => new Set(options.map((option) => option.id));
  const subscript = (type: string, handler: (detail: never) => void): void => {
    let set = listeners.get(type);
    if (!set) listeners.set(type, (set = new Set()));
    set.add(handler);
  };
  const bind = (list: Binding[], target: EventTarget, type: string, handler: EventListener, options?: AddEventListenerOptions | boolean): void => {
    target.addEventListener(type, handler, options);
    list.push([target, type, handler, options]);
  };
  const unbind = (list: Binding[]): void => {
    for (const [target, type, handler, options] of list.splice(0)) target.removeEventListener(type, handler, options);
  };
  const pathHas = (event: Event, node: Node): boolean => event.composedPath().includes(node);
  const onlyEnabled = (index: number): boolean => index >= 0 && index < options.length && !options[index]!.disabled;

  const domId = (option: Option<T>): string => {
    let id = domIds.get(option.id);
    if (!id) {
      const taken = optionIds();
      do id = `${popup.id}-o-${++domCounter}`;
      while (taken.has(id));
      domIds.set(option.id, id);
    }
    return id;
  };

  const syncActive = (): void => {
    rows.forEach((row, index) => row.classList.toggle("mtrl-listbox__option--active", index === activeIndex));
    if (!isOpen) return;
    const row = rows[activeIndex];
    setAttr("aria-activedescendant", row && onlyEnabled(activeIndex) ? row.id : null);
  };

  const setActive = (index: number): void => {
    if (index === activeIndex) return;
    activeIndex = index;
    syncActive();
    if (isOpen) rows[index]?.scrollIntoView({ block: "nearest" });
  };

  const updateValue = (): void => {
    const option = optionOf(valueId);
    setText(option ? option.text : placeholder);
    rows.forEach((row, index) => row.setAttribute("aria-selected", String(options[index]?.id === valueId)));
  };

  const render = (): void => {
    rows.length = 0;
    popup.replaceChildren(
      ...options.map((option) => {
        const row = document.createElement("div");
        row.className = "mtrl-listbox__option";
        row.id = domId(option);
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", String(option.id === valueId));
        if (option.disabled) row.setAttribute("aria-disabled", "true");
        row.textContent = option.text;
        rows.push(row);
        return row;
      }),
    );
    syncActive();
  };

  const firstEnabled = (): number => options.findIndex((option) => !option.disabled);
  const lastEnabled = (): number => {
    for (let index = options.length - 1; index >= 0; index--) if (!options[index]!.disabled) return index;
    return -1;
  };
  const selectedEnabled = (): number => {
    const index = options.findIndex((option) => option.id === valueId);
    return onlyEnabled(index) ? index : -1;
  };
  const nextEnabled = (from: number, step: number): number => {
    for (let index = from + step; index >= 0 && index < options.length; index += step) if (!options[index]!.disabled) return index;
    return -1;
  };
  const moveActive = (distance: number): void => {
    const step = Math.sign(distance);
    let index = activeIndex;
    for (let remaining = Math.abs(distance); remaining > 0; remaining--) {
      const next = nextEnabled(index, step);
      if (next < 0) break;
      index = next;
    }
    if (index >= 0) setActive(index);
  };

  type Start = "selected-first" | "selected-last" | "first" | "last";
  const startIndex = (start: Start): number => {
    const chosen = start === "first" || start === "last" ? -1 : selectedEnabled();
    if (chosen >= 0) return chosen;
    return start === "last" || start === "selected-last" ? lastEnabled() : firstEnabled();
  };

  const emit = <K extends keyof ListboxEvents<T>>(type: K, detail: ListboxEvents<T>[K]): void => {
    for (const handler of [...(listeners.get(type) ?? [])]) (handler as (value: ListboxEvents<T>[K]) => void)(detail);
  };

  const hide = (): void => {
    try {
      if (popup.matches(":popover-open")) popup.hidePopover();
    } catch {
      // Removed from the document while open: there is nothing left to hide
    }
  };

  /** Puts back what the factory owns, where it still holds the current value */
  const restore = (): void => {
    for (const [name, entry] of owned) {
      if (element.getAttribute(name) !== entry.written) continue;
      if (entry.original === null) element.removeAttribute(name);
      else element.setAttribute(name, entry.original);
    }
    if (element.textContent === writtenText) element.textContent = originalText;
  };

  /** Places the popup: below the control, flipped above when that has more room */
  const place = (): void => {
    const viewport = document.documentElement;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const rect = element.getBoundingClientRect();
    const rtl = getComputedStyle(element).direction === "rtl";
    popup.style.minWidth = `${rect.width}px`;
    popup.style.maxWidth = `${width}px`;
    popup.style.maxHeight = "";
    popup.style.left = `${rtl ? rect.right : rect.left}px`;
    popup.style.top = `${rect.bottom}px`;
    const natural = popup.getBoundingClientRect().height;
    const below = Math.max(0, height - rect.bottom);
    const above = Math.max(0, rect.top);
    const flip = natural > below && above > below;
    popup.style.maxHeight = `${flip ? above : below}px`;
    const placed = popup.getBoundingClientRect();
    popup.style.left = `${Math.max(0, Math.min(rtl ? rect.right - placed.width : rect.left, width - placed.width))}px`;
    popup.style.top = `${flip ? Math.max(0, rect.top - placed.height) : rect.bottom}px`;
  };

  const observe = (): void => {
    observer = new MutationObserver(() => {
      if (!element.isConnected) close();
    });
    observer.observe(element.getRootNode(), { childList: true, subtree: true });
  };
  const listenForDismissal = (opening: Event | undefined): void => {
    bind(temporary, document, "pointerdown", (event: Event) => {
      // The opening event itself is not a dismissal
      if (event === opening || pathHas(event, element) || pathHas(event, popup)) return;
      close(event);
    }, true);
    bind(temporary, element, "focusout", () => close());
    bind(temporary, window, "scroll", (event: Event) => {
      if (!pathHas(event, popup)) close(event);
    }, { capture: true, passive: true });
    bind(temporary, window, "resize", () => close());
    const visual = window.visualViewport;
    if (visual) {
      bind(temporary, visual, "resize", () => close());
      bind(temporary, visual, "scroll", () => close());
    }
    const dialog = element.closest("dialog");
    if (dialog) bind(temporary, dialog, "close", () => close());
    observe();
  };

  const open = (event?: Event, start: Start = "selected-first"): ListboxComponent<T> => {
    if (destroyed || isOpen || disabled || !element.isConnected) return handle;
    const before = ++generation;
    try {
      activeIndex = startIndex(start);
      popup.showPopover();
      place();
      listenForDismissal(event);
      isOpen = true;
      syncActive();
      element.focus({ preventScroll: true });
      setAttr("aria-expanded", "true");
      setAttr("aria-controls", popup.id);
      menuOpened(handle, event);
    } catch (error) {
      unbind(temporary);
      observer?.disconnect();
      observer = null;
      hide();
      isOpen = false;
      activeIndex = -1;
      setAttr("aria-expanded", "false");
      setAttr("aria-controls", null);
      setAttr("aria-activedescendant", null);
      throw error;
    }
    if (generation === before && isOpen && !destroyed) emit("open", { listbox: handle, originalEvent: event });
    return handle;
  };

  const close = (event?: Event): ListboxComponent<T> => {
    if (destroyed || !isOpen) return handle;
    isOpen = false;
    generation++;
    activeIndex = -1;
    buffer = "";
    unbind(temporary);
    observer?.disconnect();
    observer = null;
    hide();
    setAttr("aria-expanded", "false");
    setAttr("aria-controls", null);
    setAttr("aria-activedescendant", null);
    syncActive();
    menuClosed(handle);
    emit("close", { listbox: handle, originalEvent: event });
    return handle;
  };

  const commit = (event?: Event): void => {
    const option = options[activeIndex];
    if (!option || option.disabled) {
      close(event);
      return;
    }
    const previousValue = valueId;
    const before = generation;
    if (option.id !== previousValue) {
      valueId = option.id;
      updateValue();
      emit("change", { listbox: handle, originalEvent: event, value: option.id, previousValue, option: optionSnapshot(option) });
    }
    // A change handler's newer open request wins over this automatic close
    if (generation === before) close(event);
  };

  const search = (text: string): number => {
    const query = text.toLowerCase();
    const cycling = [...text].every((character) => character === text[0]);
    const length = options.length;
    if (!length) return -1;
    const start = activeIndex < 0 ? 0 : cycling ? activeIndex + 1 : activeIndex;
    for (let offset = 0; offset < length; offset++) {
      const index = (start + offset) % length;
      const option = options[index]!;
      if (!option.disabled && option.text.toLowerCase().startsWith(query)) return index;
    }
    return -1;
  };

  const typeahead = (character: string): void => {
    const now = performance.now();
    if (now - bufferAt > 500) buffer = "";
    buffer += character;
    bufferAt = now;
    let match = search(buffer);
    if (match < 0 && buffer.length > 1) {
      buffer = character;
      match = search(buffer);
    }
    if (match >= 0) setActive(match);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (destroyed || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
    if (event.ctrlKey || event.metaKey) return;
    const key = event.key;
    if (event.altKey) {
      if (key === "ArrowDown" && !isOpen) {
        event.preventDefault();
        open(event);
      } else if (key === "ArrowUp" && isOpen) {
        event.preventDefault();
        commit(event);
      }
      return;
    }
    if (!isOpen) {
      if (disabled) return;
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        open(event);
      } else if (key === "ArrowDown") {
        event.preventDefault();
        open(event, "selected-first");
      } else if (key === "ArrowUp") {
        event.preventDefault();
        open(event, "selected-last");
      } else if (key === "Home") {
        event.preventDefault();
        open(event, "first");
      } else if (key === "End") {
        event.preventDefault();
        open(event, "last");
      } else if (key.length === 1) {
        event.preventDefault();
        open(event);
        if (isOpen) typeahead(key);
      }
      return;
    }
    if (key === "Enter") {
      event.preventDefault();
      commit(event);
    } else if (key === " ") {
      event.preventDefault();
      if (buffer && performance.now() - bufferAt <= 500) typeahead(" ");
      else commit(event);
    } else if (key === "ArrowDown" || key === "PageDown") {
      event.preventDefault();
      moveActive(key === "ArrowDown" ? 1 : 10);
    } else if (key === "ArrowUp" || key === "PageUp") {
      event.preventDefault();
      moveActive(key === "ArrowUp" ? -1 : -10);
    } else if (key === "Home") {
      event.preventDefault();
      setActive(firstEnabled());
    } else if (key === "End") {
      event.preventDefault();
      setActive(lastEnabled());
    } else if (key === "Escape") {
      event.preventDefault();
      close(event);
    } else if (key === "Tab") {
      commit(event);
    } else if (key.length === 1) {
      event.preventDefault();
      typeahead(key);
    }
  };

  const rowAt = (event: Event): number => {
    const target = event.target as Node | null;
    const row = target && target.nodeType === 1 ? (target as Element).closest(".mtrl-listbox__option") : null;
    return row ? rows.indexOf(row as HTMLElement) : -1;
  };
  const onPointerDown = (event: PointerEvent): void => {
    // Keep the control focused: a press on a plain row would move focus off it
    // for every pointer type, and the control's focusout would close the popup
    // before the choice lands. Canceling also suppresses the compatibility
    // mouse events a touch tap would follow with, so touch and pen complete on
    // the pointerup below; a pan takes the gesture over with pointercancel and
    // commits nothing
    event.preventDefault();
  };
  const onPointerUp = (event: PointerEvent): void => {
    // Touch and pen select here: after the canceled pointerdown there is no
    // compatibility mousedown, and the row's click is not guaranteed to land
    if (event.pointerType === "mouse") return;
    const index = rowAt(event);
    if (onlyEnabled(index)) {
      activeIndex = index;
      commit(event);
    }
  };
  const onPointerMove = (event: PointerEvent): void => {
    const index = rowAt(event);
    if (onlyEnabled(index)) setActive(index);
  };
  const onClick = (event: Event): void => {
    const index = rowAt(event);
    if (onlyEnabled(index)) {
      activeIndex = index;
      commit(event);
    }
  };
  const onControlClick = (event: Event): void => {
    if (destroyed || disabled) return;
    if (isOpen) close(event);
    else open(event);
  };

  const handle: ListboxComponent<T> = {
    element: popup,
    open,
    close,
    toggle: (event?: Event) => (isOpen ? close(event) : open(event)),
    isOpen: () => isOpen,
    getValue: () => valueId,
    setValue: (id: string | null) => {
      if (destroyed) return handle;
      if (id !== null && typeof id !== "string") throw new TypeError("listbox value must be a string or null");
      if (id !== null && !optionOf(id)) throw new RangeError(`listbox has no option "${id}"`);
      valueId = id;
      updateValue();
      if (isOpen) {
        const index = options.findIndex((option) => option.id === id);
        if (onlyEnabled(index)) setActive(index);
      }
      return handle;
    },
    getOptions: () => options.map(optionSnapshot),
    setOptions: (next: readonly ListboxOption<T>[]) => {
      if (destroyed) return handle;
      const snapshot = snapshotOptions<T>(next);
      const previousActive = options[activeIndex]?.id;
      options = snapshot;
      const ids = optionIds();
      for (const id of [...domIds.keys()]) if (!ids.has(id)) domIds.delete(id);
      if (valueId !== null && !optionOf(valueId)) valueId = null;
      activeIndex = -1;
      render();
      updateValue();
      if (isOpen) {
        const kept = previousActive === undefined ? -1 : options.findIndex((option) => option.id === previousActive);
        setActive(onlyEnabled(kept) ? kept : startIndex("selected-first"));
      }
      return handle;
    },
    setDisabled: (next: boolean) => {
      if (destroyed) return handle;
      disabled = next === true;
      setAttr("aria-disabled", disabled ? "true" : null);
      if (disabled) close();
      return handle;
    },
    isDisabled: () => disabled,
    on: <K extends keyof ListboxEvents<T>>(type: K, handler: (detail: ListboxEvents<T>[K]) => void) => {
      if (!destroyed) subscript(type, handler as (detail: never) => void);
      return handle;
    },
    off: <K extends keyof ListboxEvents<T>>(type: K, handler: (detail: ListboxEvents<T>[K]) => void) => {
      listeners.get(type)?.delete(handler as (detail: never) => void);
      return handle;
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      generation++;
      buffer = "";
      if (isOpen) {
        isOpen = false;
        menuClosed(handle);
      }
      unbind(temporary);
      unbind(bound);
      observer?.disconnect();
      observer = null;
      hide();
      popup.remove();
      restore();
      attached.delete(element);
    },
  };

  attached.add(element);
  try {
    element.after(popup);
    setAttr("role", "combobox");
    setAttr("tabindex", "0");
    setAttr("aria-haspopup", "listbox");
    setAttr("aria-label", ariaLabel);
    setAttr("aria-expanded", "false");
    if (disabled) setAttr("aria-disabled", "true");
    bind(bound, element, "keydown", onKeyDown as EventListener);
    bind(bound, element, "click", onControlClick as EventListener);
    bind(bound, popup, "pointerdown", onPointerDown as EventListener);
    bind(bound, popup, "pointerup", onPointerUp as EventListener);
    bind(bound, popup, "pointermove", onPointerMove as EventListener);
    bind(bound, popup, "click", onClick as EventListener);
    render();
    updateValue();
    const handlers = (config.on ?? {}) as Partial<ListboxEventHandlers<T>>;
    for (const [type, handler] of Object.entries(handlers)) {
      if (typeof handler === "function") subscript(type, handler as (detail: never) => void);
    }
  } catch (error) {
    destroyed = true;
    unbind(bound);
    popup.remove();
    restore();
    attached.delete(element);
    throw error;
  }
  return handle;
}

export default createListbox;
