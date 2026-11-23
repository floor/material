// src/components/fab-menu/fab-menu.ts
import { processClassNames } from "../../core/config/component";

import { pipe } from "../../core/compose/pipe";
import { createBase, withElement } from "../../core/compose/component";
import { withEvents, withLifecycle } from "../../core/compose/features";
import { getCleanup } from "../../core/compose/cleanup";
import { PREFIX } from "../../core/config";
import { activeElementOf } from "../../core/dom/focus";
import { setHTML } from "../../core/dom/html";
import { getIcon } from "../../core/icons/registry";
import { warnDev } from "../../core/utils/warn";
import { composeButton } from "../button/compose";
import createFab from "../fab";
import type { FabVariant } from "../fab/types";
import { fitVertically } from "../../core/dom/placement";
import { createConfig, CLOSE_ICON } from "./config";
import { staggerDelays } from "./stagger";
import {
  FAB_MENU_EVENTS,
  FAB_MENU_ITEMS,
  FAB_MENU_ITEM_EXIT,
  FAB_MENU_MENU_FROM,
  FAB_MENU_MENU_GAP,
  FAB_MENU_LIST_GAP,
} from "./constants";
import type { FabMenuConfig, FabMenuComponent, FabMenuMenu } from "./types";

let ids = 0;

/** The margin a placed FAB menu keeps from the window's top, for the list's height. */
const WINDOW_MARGIN = 16;

const matches = (query: string): boolean =>
  typeof window.matchMedia === "function" && window.matchMedia(query).matches;

/**
 * Creates a FAB menu: M3 Expressive's FAB that opens a list of related
 * actions.
 *
 * Two presentations, as m3.material.io lays them out:
 * - the list (compact windows): the FAB turns into a 56dp close button and
 *   2 to 6 pill items rise above it, nearest first;
 * - the menu (the site's rule on the web, larger windows): the FAB opens the
 *   baseline menu, 4dp away. It is loaded on demand, in a chunk of its own.
 * `presentation: 'auto'` (the default) takes the list below 600px and the
 * menu from 600px.
 *
 * The FAB is a menu button (`aria-haspopup`, `aria-expanded`,
 * `aria-controls`) named after the menu; the items are `menuitem`s of a
 * `menu`. Opening the list keeps focus on the FAB, now the close button; the
 * arrow keys or Tab go into the list, Escape and Tab out come back to the FAB
 * and close it.
 *
 * @param config - FAB menu configuration
 * @returns A FAB menu component
 * @category Components
 * @see https://m3.material.io/components/fab-menu/overview
 *
 * @example
 * ```ts
 * const menu = createFabMenu({
 *   icon: editIcon,
 *   ariaLabel: 'Compose',
 *   items: [
 *     { id: 'reply', text: 'Reply', icon: replyIcon },
 *     { id: 'forward', text: 'Forward', icon: forwardIcon },
 *   ],
 * });
 * menu.on('select', ({ id }) => run(id));
 * ```
 */
const createFabMenu = (config: FabMenuConfig): FabMenuComponent => {
  const settings = createConfig(config);
  const { color, size, placement, items } = settings;
  const block = `${PREFIX}-fab-menu`;
  const id = `${block}-${++ids}`;

  if (items.length < FAB_MENU_ITEMS.MIN || items.length > FAB_MENU_ITEMS.MAX) {
    warnDev("FAB menu", `${items.length} items; the spec asks for ${FAB_MENU_ITEMS.MIN} to ${FAB_MENU_ITEMS.MAX} related actions`);
  }

  const component = pipe(
    createBase,
    withEvents(),
    withElement({
      tag: "div",
      componentName: "fab-menu",
      className: [
        `${block}--${color}`,
        `${block}--${size}`,
        placement !== "none" ? `${block}--${placement}` : "",
        processClassNames(settings.className || ""),
      ].filter(Boolean),
    }),
    withLifecycle()
  )(settings);
  const resources = getCleanup(component);
  const root = component.element;

  // The FAB: the role's container, as the site pairs the colour sets
  const fab = createFab({
    icon: settings.icon,
    ariaLabel: settings.ariaLabel,
    size,
    variant: `${color}-container` as FabVariant,
    class: `${block}__fab`,
  });
  resources.add(() => fab.destroy());
  const button = fab.element;
  button.id = `${id}-fab`;
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", `${id}-list`);
  const closeIcon = document.createElement("span");
  closeIcon.className = `${block}__close`;
  closeIcon.setAttribute("aria-hidden", "true");
  setHTML(closeIcon, settings.closeIcon || getIcon("close", CLOSE_ICON));
  button.appendChild(closeIcon);
  root.appendChild(button);

  // The list, above the FAB: after it in the DOM, so the focus order is the
  // close button, then the items from the top (m3.material.io accessibility)
  const list = document.createElement("div");
  list.className = `${block}__list`;
  list.id = `${id}-list`;
  list.setAttribute("role", "menu");
  list.setAttribute("aria-labelledby", button.id);
  list.setAttribute("inert", "");
  const entries = items.map((item) => {
    // The list item is a button, so it takes the button's ripple and state
    // layers. The pill, the content and the item class stay the item's.
    // composeButton is that button without the progress chunk: an item never
    // shows one, and createButton's public behaviour is unchanged.
    const itemButton = composeButton({
      variant: "text",
      size: "m",
      class: `${block}__item`,
    });
    resources.add(() => itemButton.destroy());
    const element = itemButton.element;
    element.setAttribute("role", "menuitem");
    element.tabIndex = -1;
    // The item is the pill, whose width reveals it; its content keeps its
    // natural width, anchored to the end, as Compose's Row is
    const content = document.createElement("span");
    content.className = `${block}__item-content`;
    if (item.icon) {
      const icon = document.createElement("span");
      icon.className = `${block}__item-icon`;
      icon.setAttribute("aria-hidden", "true");
      setHTML(icon, item.icon);
      content.appendChild(icon);
    }
    const label = document.createElement("span");
    label.className = `${block}__item-text`;
    label.textContent = item.text;
    content.appendChild(label);
    element.appendChild(content);
    list.appendChild(element);
    return { item, element };
  });
  root.appendChild(list);

  // Presentation: fixed, or by the window's width; never changed while open
  const resolve = (): "list" | "menu" =>
    settings.presentation === "auto"
      ? matches(`(min-width: ${FAB_MENU_MENU_FROM}px)`) ? "menu" : "list"
      : settings.presentation;
  let presentation = resolve();
  const present = () => {
    root.classList.toggle(`${block}--list`, presentation === "list");
    root.classList.toggle(`${block}--menu`, presentation === "menu");
  };
  present();

  let opened = false;
  let destroyed = false;
  // What the last open() of the menu presentation was called with
  let asked: [Event | undefined, "mouse" | "keyboard"] = [undefined, "keyboard"];

  const setOpened = (next: boolean) => {
    if (next === opened) return;
    opened = next;
    button.setAttribute("aria-expanded", String(next));
    component.emit(next ? FAB_MENU_EVENTS.OPEN : FAB_MENU_EVENTS.CLOSE);
    if (!next) {
      const now = resolve();
      if (now !== presentation) {
        presentation = now;
        present();
      }
    }
  };

  // ---- The menu presentation: the baseline menu, loaded when needed

  let menu: FabMenuMenu | null = null;
  let loading: Promise<FabMenuMenu | null> | null = null;
  const wire = (created: FabMenuMenu): FabMenuMenu => {
    created.on("select", (event) => {
      if (event.itemId !== undefined) component.emit(FAB_MENU_EVENTS.SELECT, { id: event.itemId, value: event.itemId });
    });
    created.on("close", () => setOpened(false));
    if (created.element.id) button.setAttribute("aria-controls", created.element.id);
    resources.add(() => created.destroy());
    return created;
  };
  const loadMenu = (): Promise<FabMenuMenu | null> => {
    if (menu) return Promise.resolve(menu);
    if (settings.menu) {
      menu = wire(settings.menu(button, items));
      return Promise.resolve(menu);
    }
    loading ??= import("../menu").then(
      ({ default: createMenu }) => {
        if (destroyed) return null;
        menu ??= wire(
          createMenu({
            opener: button,
            items: items.map(({ id, text, icon }) => ({ id, text, icon })),
            position: "top-end",
            offset: FAB_MENU_MENU_GAP,
            manualOpen: true,
            // In the top layer, next to the FAB: above everything, and in the
            // same tree, so <m-fab-menu>'s shadow root styles it
            layer: "top",
          }) as unknown as FabMenuMenu
        );
        return menu;
      },
      (error: unknown) => {
        loading = null;
        console.error("FAB menu: the menu failed to load:", error);
        return null;
      }
    );
    return loading;
  };
  // The chunk is fetched before it is needed: now in a wide window, or when
  // the FAB is first pointed at or focused.
  const preload = () => {
    if (!destroyed && resolve() === "menu") void loadMenu();
  };
  preload();
  button.addEventListener("pointerenter", preload, { once: true });
  button.addEventListener("focus", preload, { once: true });

  // ---- The list presentation

  const reduced = () => matches("(prefers-reduced-motion: reduce)");
  // The side this opening chose. The close keeps it, so the items leave where
  // they appeared; the next open decides again.
  let opensDownward = false;
  const stagger = (opening: boolean, downward = false): number => {
    // Distance is from the FAB. Above it the last item is the nearest; below
    // it the first is. Reversing puts the nearest first on open and the
    // farthest first on close, in either direction.
    const byDistance = reduced() ? entries.map(() => 0) : staggerDelays(entries.length, opening);
    const delays = downward ? [...byDistance].reverse() : byDistance;
    entries.forEach(({ element }, index) => element.style.setProperty(`--${PREFIX}-fab-menu-delay`, `${delays[index]}ms`));
    return Math.max(0, ...delays);
  };

  const onOutside = (event: PointerEvent) => {
    if (!event.composedPath().includes(root)) closeList(false);
  };

  // Each item's width to reveal: its content's, measured as the list opens
  // (the closed items are laid out at no width, their content overflowing).
  const measure = () =>
    entries.forEach(({ element }) => {
      // The ripple is the button's first child. The width is the content's.
      const content = element.querySelector(`.${block}__item-content`) as HTMLElement;
      element.style.setProperty(`--${PREFIX}-fab-menu-item-width`, `${content.offsetWidth}px`);
    });

  /**
   * Where the list opens, decided once per opening: above the FAB while it
   * fits there, otherwise on the side with more room (the shared vertical
   * rule), scrolling only when neither side holds it; and horizontally, per
   * placeHorizontally. The placement classes say which. They stay through the
   * close, so the list does not jump while the items are still leaving, and
   * the next open rewrites them.
   */
  const placeList = (): boolean => {
    const fab = root.getBoundingClientRect();
    // Without layout (a tree that has not been rendered) the list keeps the
    // upward opening it has always had.
    if (fab.height === 0) return false;
    const above = fab.top - FAB_MENU_LIST_GAP - WINDOW_MARGIN;
    const below = window.innerHeight - fab.bottom - FAB_MENU_LIST_GAP - WINDOW_MARGIN;
    // The list's own height, measured while closed: the items are laid out
    // at their full 56dp, only their width is held at 0.
    const fit = fitVertically({ preferred: "top", height: list.scrollHeight, above, below });
    const downward = fit.side === "bottom";
    root.classList.toggle(`${block}--list-down`, downward);
    placeHorizontally(fab);
    // Upward, the room above is the ceiling it has always had; downward, only
    // when that side cannot hold it.
    list.style.maxHeight = downward
      ? fit.maxHeight === null ? "" : `${fit.maxHeight}px`
      : above > 0 ? `${above}px` : "";
    return downward;
  };

  /**
   * The list's horizontal placement, decided once per opening: end-aligned
   * while the whole list stays inside the window; otherwise start-aligned
   * while that fits; when neither alignment fits, the end alignment shifts
   * just enough to stay inside — to the window's start edge when the list
   * would cross it, to its end edge when it crosses that. The shift rides a
   * custom property the stylesheet applies to the list and holds through the
   * close, like the placement classes. The test is the window's edge itself,
   * so a list that fits is not moved for a margin's few pixels. A list wider
   * than the window takes the start-edge pin and its end edge overflows.
   */
  const placeHorizontally = (fab: DOMRect): void => {
    const width = widest();
    const rtl = getComputedStyle(root).direction === "rtl";
    // The end-aligned list's left edge; the start-aligned one is its mirror.
    const endLeft = rtl ? fab.left : fab.right - width;
    const startLeft = rtl ? fab.right - width : fab.left;
    const inside = (left: number): boolean => left >= 0 && left + width <= window.innerWidth;
    let start = false;
    let shift = 0;
    if (width > 0 && !inside(endLeft)) {
      if (inside(startLeft)) {
        start = true;
      } else {
        // Neither alignment holds the list: keep the end alignment and move
        // it the minimum that brings both edges inside.
        shift = endLeft < 0 ? -endLeft : window.innerWidth - (endLeft + width);
      }
    }
    root.classList.toggle(`${block}--list-start`, start);
    root.style.setProperty(`--${PREFIX}-fab-menu-shift`, `${shift}px`);
  };

  /** The widest item, as it will be revealed (its content's width). */
  const widest = (): number =>
    entries.reduce((widest, { element }) => {
      const content = element.querySelector(`.${block}__item-content`) as HTMLElement | null;
      return Math.max(widest, content?.offsetWidth ?? 0);
    }, 0);

  const openList = () => {
    measure();
    opensDownward = placeList();
    stagger(true, opensDownward);
    list.removeAttribute("inert");
    root.classList.add(`${block}--open`);
    document.addEventListener("pointerdown", onOutside, true);
    setOpened(true);
  };

  function closeList(restoreFocus: boolean) {
    if (!opened) return;
    // The farthest item leaves first, on the side this opening chose.
    const last = stagger(false, opensDownward);
    list.style.setProperty(`--${PREFIX}-fab-menu-exit`, `${last + FAB_MENU_ITEM_EXIT}ms`);
    // document.activeElement stops at the shadow host, so an item focused
    // inside the element would look unfocused and stay in the inert list.
    const hadFocus = list.contains(activeElementOf(list));
    list.setAttribute("inert", "");
    root.classList.remove(`${block}--open`);
    document.removeEventListener("pointerdown", onOutside, true);
    if (restoreFocus || hadFocus) button.focus();
    setOpened(false);
  }
  resources.add(() => document.removeEventListener("pointerdown", onOutside, true));

  const focusItem = (index: number) => {
    const count = entries.length;
    if (count) entries[((index % count) + count) % count]!.element.focus();
  };

  // ---- Opening and closing

  const open = (event?: Event) => {
    if (opened || destroyed) return;
    if (presentation === "list") {
      openList();
      return;
    }
    // A key's click (detail 0) opens the baseline menu on its first item. Kept
    // outside the call: opened again while the menu loads, it opens as the
    // last call asked.
    asked = [event, event instanceof MouseEvent && event.detail > 0 ? "mouse" : "keyboard"];
    // Open from here on: the state and `open` are there when open() returns.
    // The menu is a lazy module, so its surface is shown when it has arrived.
    const loaded = loadMenu();
    setOpened(true);
    void loaded.then((surface) => {
      // The module did not load: there is nothing to show
      if (!surface) setOpened(false);
      // Closed, or destroyed, while it loaded: nothing is shown. Opened again
      // meanwhile: shown once.
      else if (opened && !destroyed && !surface.isOpen()) surface.open(...asked);
    });
  };

  const close = () => {
    if (!opened) return;
    if (presentation === "list") closeList(false);
    // The menu's `close` brings the state back with it
    else if (menu?.isOpen()) menu.close();
    // Closed before the surface arrived: it never will
    else setOpened(false);
  };

  const toggle = (event?: Event) => opened ? close() : open(event);
  button.addEventListener("click", toggle);

  // The FAB, now the close button, keeps focus; the keys go into the list.
  button.addEventListener("keydown", (event) => {
    if (!opened || presentation !== "list") return;
    if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) focusItem(0);
    else if (event.key === "ArrowUp") focusItem(entries.length - 1);
    else return;
    event.preventDefault();
  });

  list.addEventListener("keydown", (event) => {
    const from = entries.findIndex(({ element }) => element === event.target);
    if (event.key === "ArrowDown") focusItem(from + 1);
    else if (event.key === "ArrowUp") focusItem(from - 1);
    else if (event.key === "Home") focusItem(0);
    else if (event.key === "End") focusItem(entries.length - 1);
    else if (event.key === "Tab") closeList(true);
    else return;
    event.preventDefault();
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && opened && presentation === "list") {
      event.preventDefault();
      closeList(true);
    }
  });

  list.addEventListener("click", (event) => {
    const entry = entries.find(({ element }) => element.contains(event.target as Node));
    if (!entry) return;
    component.emit(FAB_MENU_EVENTS.SELECT, { id: entry.item.id, value: entry.item.id });
    closeList(true);
  });

  // `auto` follows the window, but never while open: the next close re-resolves.
  if (settings.presentation === "auto") {
    const onResize = () => {
      if (opened) return;
      const now = resolve();
      if (now !== presentation) {
        presentation = now;
        present();
        preload();
      }
    };
    window.addEventListener("resize", onResize);
    resources.add(() => window.removeEventListener("resize", onResize));
  }

  resources.add(() => {
    destroyed = true;
  });

  const fabMenu: FabMenuComponent = {
    ...component,
    fab: button,
    list,

    addClass(...classes: string[]) {
      component.addClass(...classes);
      return this;
    },

    open(event?: Event) {
      open(event);
      return this;
    },

    close() {
      close();
      return this;
    },

    toggle(event?: Event) {
      toggle(event);
      return this;
    },

    isOpen() {
      return opened;
    },

    getPresentation() {
      return presentation;
    },

    on(event, handler) {
      component.on(event, handler);
      return this;
    },

    off(event, handler) {
      component.off(event, handler);
      return this;
    },

    destroy() {
      component.lifecycle.destroy();
    },
  };

  return fabMenu;
};

export default createFabMenu;
export { createFabMenu };
