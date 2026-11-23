import createFabMenu from "../components/fab-menu/index.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
const declaredItems = (host, tag) => Array.from(host.children)
    .filter((child) => child.localName === tag)
    .map((child) => {
    const text = child.getAttribute("label") ?? (child.textContent ?? "").trim();
    return { id: child.getAttribute("value") ?? text, text, icon: child.getAttribute("icon") ?? undefined };
});
const built = new WeakMap();
const create = (config) => {
    const { host, ...rest } = config;
    const menu = createFabMenu(rest);
    built.set(menu, JSON.stringify(rest.items));
    menu.on("open", () => host.toggleAttribute("open", true));
    menu.on("close", () => host.removeAttribute("open"));
    return Object.assign(menu, {
        show: () => void menu.open(),
        hide: () => void menu.close(),
    });
};
const fabMenuSpec = {
    name: "fab-menu",
    ssr: false,
    create: (config) => create(config),
    styles: ["fab", "menu", "fab-menu"],
    attributes: {
        open: {
            type: "boolean",
            update: (c, v) => {
                if (!!v !== c.isOpen())
                    (v ? c.show : c.hide)();
            },
        },
        icon: { type: "string", config: "icon" },
        "aria-label": {
            type: "string",
            config: "ariaLabel",
            update: (c, v) => c.fab.setAttribute("aria-label", v === null ? "" : String(v)),
        },
        color: { type: "string", config: "color" },
        size: { type: "string", config: "size" },
        presentation: { type: "string", config: "presentation" },
        placement: { type: "string", config: "placement" },
    },
    methods: ["show", "hide", "toggle"],
    events: {
        open: { detail: () => ({}), state: true },
        close: { detail: () => ({}), state: true },
        select: { detail: (payload) => ({ value: payload.value }) },
    },
    config: (host) => ({ host, items: declaredItems(host, `${host.localName}-item`) }),
    setup: (host, c) => {
        if (host.hasAttribute("open"))
            c.show();
    },
    observeChildren: (host, c) => built.get(c) === JSON.stringify(declaredItems(host, `${host.localName}-item`)),
};
export const fabMenuElement = defineElement(fabMenuSpec);
export const fabMenuItemDeclaration = {
    name: "fab-menu-item",
    attributes: {
        value: { type: "string" },
        label: { type: "string" },
        icon: { type: "string" },
    },
};
export const defineFabMenu = (options) => {
    const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${fabMenuItemDeclaration.name}`;
    if (!customElements.get(itemTag))
        customElements.define(itemTag, createDeclarationClass(fabMenuItemDeclaration.attributes));
    return fabMenuElement.define(options);
};
