import createNavigationBar from "../components/navigation-bar/index.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
import { declaredItems } from "./navigation-rail.js";
const readBar = (host) => ({
    items: declaredItems(host, host.getAttribute("value")),
    ripple: !host.hasAttribute("no-ripple"),
});
const withoutActive = (items) => JSON.stringify(items.map(({ active: _active, ...item }) => item));
const updateBar = (host, component) => {
    const items = declaredItems(host, host.dirty ? component.getActive() : host.getAttribute("value"));
    if (withoutActive(items) !== withoutActive(component.getItems()))
        component.setItems(items);
    return true;
};
const navigationBarSpec = {
    name: "navigation-bar",
    create: (config) => createNavigationBar(config),
    styles: ["navigation-bar"],
    hostStyles: ":host{display:block}",
    attributes: {
        value: { type: "string", update: (c, v) => void c.setActive(v === null ? null : String(v)) },
        "item-layout": { type: "string", config: "itemLayout" },
        "hide-on-scroll": { type: "boolean", config: "hideOnScroll" },
        "no-ripple": { type: "boolean" },
        "aria-label": {
            type: "string",
            config: "ariaLabel",
            update: (c, v) => void c.element.setAttribute("aria-label", v === null || v === undefined ? "Primary navigation" : String(v)),
        },
    },
    properties: {
        value: {
            get: (c) => c.getActive(),
            set: (c, v) => void c.setActive(v === null || v === undefined ? null : String(v)),
        },
    },
    methods: ["hide", "show"],
    model: "value",
    events: {
        change: { detail: (payload) => ({ value: payload.value }) },
        visibility: { detail: (payload) => ({ hidden: payload.hidden }), state: true },
    },
    config: (host) => readBar(host),
    setup: (host, component) => {
        const onSelect = ({ id }) => {
            host.dispatchEvent(new CustomEvent("change", { detail: { value: id }, bubbles: true, composed: true }));
        };
        component.on("select", onSelect);
        return () => component.off("select", onSelect);
    },
    observeChildren: updateBar,
};
export const navigationBarElement = defineElement(navigationBarSpec);
export const navigationBarItemDeclaration = {
    name: "navigation-bar-item",
    attributes: {
        value: { type: "string" },
        label: { type: "string" },
        icon: { type: "string" },
        "selected-icon": { type: "string" },
        href: { type: "string" },
        badge: { type: "string" },
        "badge-label": { type: "string" },
        disabled: { type: "boolean" },
    },
};
export const defineNavigationBar = (options) => {
    const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${navigationBarItemDeclaration.name}`;
    if (!customElements.get(itemTag)) {
        customElements.define(itemTag, createDeclarationClass(navigationBarItemDeclaration.attributes));
    }
    return navigationBarElement.define(options);
};
