import createMenu from "../components/menu/index.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
const itemText = (child, tag) => child.getAttribute("label") ??
    Array.from(child.childNodes)
        .filter((node) => !(node.nodeType === 1 && node.localName === tag))
        .map((node) => node.textContent ?? "")
        .join("")
        .trim();
export const declaredMenuItems = (parent, tag) => {
    const items = [];
    for (const child of Array.from(parent.children)) {
        if (child.localName !== tag)
            continue;
        if (child.hasAttribute("divider")) {
            items.push({ type: "divider" });
            continue;
        }
        if (child.hasAttribute("gap")) {
            items.push({ type: "gap" });
            continue;
        }
        const text = itemText(child, tag);
        const submenu = declaredMenuItems(child, tag);
        items.push({
            id: child.getAttribute("value") ?? text,
            text,
            icon: child.getAttribute("icon") ?? undefined,
            shortcut: child.getAttribute("shortcut") ?? undefined,
            supportingText: child.getAttribute("supporting-text") ?? undefined,
            disabled: child.hasAttribute("disabled"),
            ...(submenu.length ? { hasSubmenu: true, submenu: submenu } : {}),
        });
    }
    return items;
};
const hosts = new WeakMap();
const standIns = new WeakMap();
const applied = new WeakMap();
const findAnchor = (host, anchor) => {
    if (anchor instanceof HTMLElement)
        return anchor;
    if (typeof anchor !== "string" || anchor === "")
        return null;
    const root = host.getRootNode();
    return (root.getElementById?.(anchor) ?? document.getElementById(anchor));
};
const unlinkSurface = (c) => {
    c.getOpener().removeAttribute("aria-controls");
};
const setAnchor = (c, anchor) => {
    const host = hosts.get(c);
    const standIn = standIns.get(c);
    if (!host || !standIn)
        return;
    const element = findAnchor(host, anchor) ?? standIn;
    if (c.getOpener() !== element) {
        c.setOpener(element);
        unlinkSurface(c);
    }
};
const findPending = (c) => {
    const host = hosts.get(c);
    if (host && c.getOpener() === standIns.get(c) && host.hasAttribute("anchor"))
        setAnchor(c, host.getAttribute("anchor"));
};
const create = (config) => {
    const { host, anchor, noCloseOnSelect, ...rest } = config;
    const standIn = document.createElement("span");
    const opener = findAnchor(host, anchor) ?? findAnchor(host, host.getAttribute("anchor")) ?? standIn;
    const menu = createMenu({
        ...rest,
        items: rest.items ?? [],
        opener,
        closeOnSelect: !noCloseOnSelect,
        layer: "top",
    });
    unlinkSurface(menu);
    hosts.set(menu, host);
    standIns.set(menu, standIn);
    applied.set(menu, JSON.stringify(menu.getItems()));
    menu.on("open", () => host.toggleAttribute("open", true));
    menu.on("close", () => host.removeAttribute("open"));
    const toggle = menu.toggle.bind(menu);
    return Object.assign(menu, {
        show: () => {
            findPending(menu);
            menu.open();
        },
        hide: () => void menu.close(undefined, menu.element.matches(":focus-within")),
        toggle: (event) => {
            findPending(menu);
            return toggle(event);
        },
    });
};
const updateItems = (host, c) => {
    const items = declaredMenuItems(host, `${host.localName}-item`);
    const key = JSON.stringify(items);
    if (applied.get(c) !== key) {
        applied.set(c, key);
        c.setItems(items);
    }
    return true;
};
const menuSpec = {
    name: "menu",
    ssr: (host) => {
        const item = host.localName.replace(/menu$/, "menu-item");
        return !host.querySelector(`${item} ${item}`);
    },
    create: (config) => create(config),
    styles: ["menu"],
    hostStyles: ":host{display:contents}",
    attributes: {
        open: {
            type: "boolean",
            update: (c, v) => {
                if (!!v !== c.isOpen())
                    (v ? c.show : c.hide)();
            },
        },
        anchor: { type: "string", config: "anchor", update: (c, v) => setAnchor(c, v === null ? null : String(v)) },
        position: {
            type: "string",
            config: "position",
            update: (c, v) => void c.setPosition((v ?? "bottom-start")),
        },
        offset: { type: "number", config: "offset" },
        variant: { type: "string", config: "variant" },
        color: { type: "string", config: "color" },
        "no-close-on-select": { type: "boolean", config: "noCloseOnSelect" },
        dense: { type: "boolean", config: "dense" },
        "max-height": { type: "string", config: "maxHeight", update: (c, v) => void (c.element.style.maxHeight = v === null ? "" : String(v)) },
        "aria-label": {
            type: "string",
            update: (c, v) => {
                const list = c.element.querySelector(".mtrl-menu__list");
                if (v === null) {
                    c.element.removeAttribute("aria-label");
                    list?.removeAttribute("aria-label");
                }
                else {
                    const text = String(v);
                    c.element.setAttribute("aria-label", text);
                    list?.setAttribute("aria-label", text);
                }
            },
        },
    },
    properties: {
        anchor: {
            get: (c) => {
                const opener = c.getOpener();
                return opener === standIns.get(c) ? null : opener;
            },
            set: (c, v) => setAnchor(c, v),
            config: "anchor",
        },
    },
    methods: ["show", "hide", "toggle"],
    events: {
        open: { detail: () => ({}), state: true },
        close: { detail: () => ({}), state: true },
        select: { detail: (payload) => ({ value: payload.itemId }) },
    },
    config: (host) => ({ host, items: declaredMenuItems(host, `${host.localName}-item`) }),
    setup: (host, c) => {
        const root = host.shadowRoot;
        const keep = new MutationObserver(() => {
            if (!c.element.parentNode)
                root.append(c.element);
        });
        keep.observe(root, { childList: true });
        const frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => findPending(c)) : null;
        if (host.hasAttribute("open"))
            c.show();
        if (host.hasAttribute("aria-label")) {
            const label = host.getAttribute("aria-label") ?? "";
            c.element.setAttribute("aria-label", label);
            c.element.querySelector(".mtrl-menu__list")?.setAttribute("aria-label", label);
        }
        return () => {
            keep.disconnect();
            if (frame !== null)
                cancelAnimationFrame(frame);
        };
    },
    observeChildren: updateItems,
};
export const menuElement = defineElement(menuSpec);
export const menuItemDeclaration = {
    name: "menu-item",
    attributes: {
        value: { type: "string" },
        label: { type: "string" },
        icon: { type: "string" },
        shortcut: { type: "string" },
        "supporting-text": { type: "string" },
        disabled: { type: "boolean" },
        divider: { type: "boolean" },
        gap: { type: "boolean" },
    },
};
export const defineMenuItem = (options) => {
    const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${menuItemDeclaration.name}`;
    if (!customElements.get(itemTag))
        customElements.define(itemTag, createDeclarationClass(menuItemDeclaration.attributes));
};
export const defineMenu = (options) => {
    defineMenuItem(options);
    return menuElement.define(options);
};
