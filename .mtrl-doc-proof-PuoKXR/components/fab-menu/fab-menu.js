import { processClassNames } from "../../core/config/component.js";
import { pipe } from "../../core/compose/pipe.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { getCleanup } from "../../core/compose/cleanup.js";
import { PREFIX } from "../../core/config.js";
import { activeElementOf } from "../../core/dom/focus.js";
import { setHTML } from "../../core/dom/html.js";
import { getIcon } from "../../core/icons/registry.js";
import { warnDev } from "../../core/utils/warn.js";
import createFab from "../fab/index.js";
import { createConfig, CLOSE_ICON } from "./config.js";
import { staggerDelays } from "./stagger.js";
import { FAB_MENU_EVENTS, FAB_MENU_ITEMS, FAB_MENU_ITEM_EXIT, FAB_MENU_MENU_FROM, FAB_MENU_MENU_GAP, FAB_MENU_LIST_GAP, } from "./constants.js";
let ids = 0;
const WINDOW_MARGIN = 16;
const matches = (query) => typeof window.matchMedia === "function" && window.matchMedia(query).matches;
const createFabMenu = (config) => {
    const settings = createConfig(config);
    const { color, size, placement, items } = settings;
    const block = `${PREFIX}-fab-menu`;
    const id = `${block}-${++ids}`;
    if (items.length < FAB_MENU_ITEMS.MIN || items.length > FAB_MENU_ITEMS.MAX) {
        warnDev("FAB menu", `${items.length} items; the spec asks for ${FAB_MENU_ITEMS.MIN} to ${FAB_MENU_ITEMS.MAX} related actions`);
    }
    const component = pipe(createBase, withEvents(), withElement({
        tag: "div",
        componentName: "fab-menu",
        className: [
            `${block}--${color}`,
            `${block}--${size}`,
            placement !== "none" ? `${block}--${placement}` : "",
            processClassNames(settings.className || ""),
        ].filter(Boolean),
    }), withLifecycle())(settings);
    const resources = getCleanup(component);
    const root = component.element;
    const fab = createFab({
        icon: settings.icon,
        ariaLabel: settings.ariaLabel,
        size,
        variant: `${color}-container`,
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
    const resolve = () => settings.presentation === "auto"
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
    let asked = [undefined, "keyboard"];
    const setOpened = (next) => {
        if (next === opened)
            return;
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
    let menu = null;
    let loading = null;
    const wire = (created) => {
        created.on("select", (event) => {
            if (event.itemId !== undefined)
                component.emit(FAB_MENU_EVENTS.SELECT, { id: event.itemId, value: event.itemId });
        });
        created.on("close", () => setOpened(false));
        if (created.element.id)
            button.setAttribute("aria-controls", created.element.id);
        resources.add(() => created.destroy());
        return created;
    };
    const loadMenu = () => {
        if (menu)
            return Promise.resolve(menu);
        if (settings.menu) {
            menu = wire(settings.menu(button, items));
            return Promise.resolve(menu);
        }
        loading ??= import("../menu/index.js").then(({ default: createMenu }) => {
            if (destroyed)
                return null;
            menu ??= wire(createMenu({
                opener: button,
                items: items.map(({ id, text, icon }) => ({ id, text, icon })),
                position: "top-end",
                offset: FAB_MENU_MENU_GAP,
                manualOpen: true,
                layer: "top",
            }));
            return menu;
        }, (error) => {
            loading = null;
            console.error("FAB menu: the menu failed to load:", error);
            return null;
        });
        return loading;
    };
    const preload = () => {
        if (!destroyed && resolve() === "menu")
            void loadMenu();
    };
    preload();
    button.addEventListener("pointerenter", preload, { once: true });
    button.addEventListener("focus", preload, { once: true });
    const reduced = () => matches("(prefers-reduced-motion: reduce)");
    const stagger = (opening) => {
        const delays = reduced() ? entries.map(() => 0) : staggerDelays(entries.length, opening);
        entries.forEach(({ element }, index) => element.style.setProperty(`--${PREFIX}-fab-menu-delay`, `${delays[index]}ms`));
        return Math.max(0, ...delays);
    };
    const onOutside = (event) => {
        if (!event.composedPath().includes(root))
            closeList(false);
    };
    const measure = () => entries.forEach(({ element }) => {
        const content = element.firstElementChild;
        element.style.setProperty(`--${PREFIX}-fab-menu-item-width`, `${content.offsetWidth}px`);
    });
    const openList = () => {
        measure();
        stagger(true);
        const top = root.getBoundingClientRect().top;
        list.style.maxHeight = top > 0 ? `${Math.max(0, top - FAB_MENU_LIST_GAP - WINDOW_MARGIN)}px` : "";
        list.removeAttribute("inert");
        root.classList.add(`${block}--open`);
        document.addEventListener("pointerdown", onOutside, true);
        setOpened(true);
    };
    function closeList(restoreFocus) {
        if (!opened)
            return;
        const last = stagger(false);
        list.style.setProperty(`--${PREFIX}-fab-menu-exit`, `${last + FAB_MENU_ITEM_EXIT}ms`);
        const hadFocus = list.contains(activeElementOf(list));
        list.setAttribute("inert", "");
        root.classList.remove(`${block}--open`);
        document.removeEventListener("pointerdown", onOutside, true);
        if (restoreFocus || hadFocus)
            button.focus();
        setOpened(false);
    }
    resources.add(() => document.removeEventListener("pointerdown", onOutside, true));
    const focusItem = (index) => {
        const count = entries.length;
        if (count)
            entries[((index % count) + count) % count].element.focus();
    };
    const open = (event) => {
        if (opened || destroyed)
            return;
        if (presentation === "list") {
            openList();
            return;
        }
        asked = [event, event instanceof MouseEvent && event.detail > 0 ? "mouse" : "keyboard"];
        const loaded = loadMenu();
        setOpened(true);
        void loaded.then((surface) => {
            if (!surface)
                setOpened(false);
            else if (opened && !destroyed && !surface.isOpen())
                surface.open(...asked);
        });
    };
    const close = () => {
        if (!opened)
            return;
        if (presentation === "list")
            closeList(false);
        else if (menu?.isOpen())
            menu.close();
        else
            setOpened(false);
    };
    const toggle = (event) => opened ? close() : open(event);
    button.addEventListener("click", toggle);
    button.addEventListener("keydown", (event) => {
        if (!opened || presentation !== "list")
            return;
        if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey))
            focusItem(0);
        else if (event.key === "ArrowUp")
            focusItem(entries.length - 1);
        else
            return;
        event.preventDefault();
    });
    list.addEventListener("keydown", (event) => {
        const from = entries.findIndex(({ element }) => element === event.target);
        if (event.key === "ArrowDown")
            focusItem(from + 1);
        else if (event.key === "ArrowUp")
            focusItem(from - 1);
        else if (event.key === "Home")
            focusItem(0);
        else if (event.key === "End")
            focusItem(entries.length - 1);
        else if (event.key === "Tab")
            closeList(true);
        else
            return;
        event.preventDefault();
    });
    root.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && opened && presentation === "list") {
            event.preventDefault();
            closeList(true);
        }
    });
    list.addEventListener("click", (event) => {
        const entry = entries.find(({ element }) => element.contains(event.target));
        if (!entry)
            return;
        component.emit(FAB_MENU_EVENTS.SELECT, { id: entry.item.id, value: entry.item.id });
        closeList(true);
    });
    if (settings.presentation === "auto") {
        const onResize = () => {
            if (opened)
                return;
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
    const fabMenu = {
        ...component,
        fab: button,
        list,
        addClass(...classes) {
            component.addClass(...classes);
            return this;
        },
        open(event) {
            open(event);
            return this;
        },
        close() {
            close();
            return this;
        },
        toggle(event) {
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
