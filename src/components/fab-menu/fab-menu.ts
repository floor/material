// src/components/fab-menu/fab-menu.ts

import { pipe } from "../../core/compose/pipe";
import { createBase, withElement } from "../../core/compose/component";
import { withEvents, withLifecycle } from "../../core/compose/features";
import { getCleanup } from "../../core/compose/cleanup";
import { PREFIX } from "../../core/config";
import { setHTML } from "../../core/dom/html";
import { warnDev } from "../../core/utils/warn";
import createFab from "../fab";
import type { FabVariant } from "../fab/types";
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
        settings.class ?? "",
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
  setHTML(closeIcon, settings.closeIcon || CLOSE_ICON);
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
    const element = document.createElement("button");
    element.type = "button";
    element.className = `${block}__item`;
    element.setAttribute("role", "menuitem");
    element.tabIndex = -1;
    if (item.icon) {
      const icon = document.createElement("span");
      icon.className = `${block}__item-icon`;
      icon.setAttribute("aria-hidden", "true");
      setHTML(icon, item.icon);
      element.appendChild(icon);
    }
    const label = document.createElement("span");
    label.className = `${block}__item-text`;
    label.textContent = item.text;
    element.appendChild(label);
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
      if (event.itemId !== undefined) component.emit(FAB_MENU_EVENTS.SELECT, { id: event.itemId });
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
  const stagger = (opening: boolean): number => {
    const delays = reduced() ? entries.map(() => 0) : staggerDelays(entries.length, opening);
    entries.forEach(({ element }, index) => element.style.setProperty(`--${PREFIX}-fab-menu-delay`, `${delays[index]}ms`));
    return Math.max(0, ...delays);
  };

  const onOutside = (event: PointerEvent) => {
    if (!event.composedPath().includes(root)) closeList(false);
  };

  const openList = () => {
    stagger(true);
    // The items scroll behind the close button when the window is short.
    const top = root.getBoundingClientRect().top;
    list.style.maxHeight = top > 0 ? `${Math.max(0, top - FAB_MENU_LIST_GAP - WINDOW_MARGIN)}px` : "";
    list.removeAttribute("inert");
    root.classList.add(`${block}--open`);
    document.addEventListener("pointerdown", onOutside, true);
    setOpened(true);
  };

  function closeList(restoreFocus: boolean) {
    if (!opened) return;
    const last = stagger(false);
    list.style.setProperty(`--${PREFIX}-fab-menu-exit`, `${last + FAB_MENU_ITEM_EXIT}ms`);
    const hadFocus = list.contains(document.activeElement);
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
    // A key's click (detail 0) opens the baseline menu on its first item.
    const interaction = event instanceof MouseEvent && event.detail > 0 ? "mouse" : "keyboard";
    void loadMenu().then((loaded) => {
      if (!loaded || destroyed || opened) return;
      loaded.open(event, interaction);
      setOpened(true);
    });
  };

  const close = () => {
    if (!opened) return;
    if (presentation === "list") closeList(false);
    else menu?.close();
  };

  button.addEventListener("click", (event) => (opened ? close() : open(event)));

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
    component.emit(FAB_MENU_EVENTS.SELECT, { id: entry.item.id });
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
      if (opened) close();
      else open(event);
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
