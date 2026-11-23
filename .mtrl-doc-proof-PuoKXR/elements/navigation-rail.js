import createNavigationRail from "../components/navigation-rail/index.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
export const declaredItems = (host, active) => {
    const itemTag = `${host.localName}-item`;
    const items = [];
    const ids = new Set();
    for (const child of Array.from(host.children)) {
        if (child.localName !== itemTag)
            continue;
        const label = child.getAttribute("label") ?? (child.textContent ?? "").trim();
        const id = child.getAttribute("value") ?? label;
        const icon = child.getAttribute("icon") ?? "";
        if (!label || !icon || !id || ids.has(id))
            continue;
        ids.add(id);
        const badge = child.getAttribute("badge");
        items.push({
            id,
            label,
            icon,
            activeIcon: child.getAttribute("selected-icon") ?? undefined,
            href: child.getAttribute("href") ?? undefined,
            badge: badge === null ? undefined : badge === "" ? true : badge,
            badgeLabel: child.getAttribute("badge-label") ?? undefined,
            disabled: child.hasAttribute("disabled"),
            active: id === active,
        });
    }
    return items;
};
const headerSlot = (host) => {
    if (!Array.from(host.children).some((child) => child.getAttribute("slot") === "header"))
        return undefined;
    const slot = document.createElement("slot");
    slot.name = "header";
    return slot;
};
const readRail = (host) => ({
    items: declaredItems(host, host.getAttribute("value")),
    showToggle: !host.hasAttribute("no-toggle"),
    ripple: !host.hasAttribute("no-ripple"),
    header: headerSlot(host),
});
const withoutActive = (items) => JSON.stringify(items.map(({ active: _active, ...item }) => item));
const updateRail = (host, component) => {
    const header = component.element.querySelector('slot[name="header"]') !== null;
    if (header !== !!headerSlot(host))
        return false;
    const items = declaredItems(host, host.dirty ? component.getActive() : host.getAttribute("value"));
    if (withoutActive(items) === withoutActive(component.getItems()))
        return true;
    component.setItems(items);
    return true;
};
const setAriaLabel = (component, value) => {
    component.element.setAttribute("aria-label", value === null || value === undefined ? "Primary navigation" : String(value));
};
const navigationRailSpec = {
    name: "navigation-rail",
    slots: ["header"],
    create: (config) => {
        const { layout, host, ...rest } = config;
        const rail = createNavigationRail({ ...rest, layout: layout === "modal" ? "modal" : "standard" });
        const reflect = () => void host.toggleAttribute("expanded", rail.isExpanded());
        rail.on("expand", reflect);
        rail.on("collapse", reflect);
        return rail;
    },
    styles: ["navigation-rail"],
    hostStyles: ":host{display:block;flex-shrink:0}",
    attributes: {
        value: { type: "string", update: (c, v) => void c.setActive(v === null ? null : String(v)) },
        expanded: { type: "boolean", config: "expanded", update: (c, v) => void (v ? c.expand() : c.collapse()) },
        "hide-when-collapsed": { type: "boolean", config: "hideWhenCollapsed" },
        layout: { type: "string", config: "layout" },
        "expanded-width": { type: "number", config: "expandedWidth" },
        "no-toggle": { type: "boolean" },
        "no-ripple": { type: "boolean" },
        "expand-label": { type: "string", config: "expandLabel" },
        "collapse-label": { type: "string", config: "collapseLabel" },
        "expand-icon": { type: "string", config: "expandIcon" },
        "collapse-icon": { type: "string", config: "collapseIcon" },
        "aria-label": { type: "string", config: "ariaLabel", update: (c, v) => setAriaLabel(c, v) },
    },
    properties: {
        value: {
            get: (c) => c.getActive(),
            set: (c, v) => void c.setActive(v === null || v === undefined ? null : String(v)),
        },
    },
    methods: ["expand", "collapse", "toggle"],
    model: "value",
    events: {
        change: {
            detail: (payload) => ({ value: payload.value }),
        },
        expand: { detail: () => null, state: true },
        collapse: { detail: () => null, state: true },
    },
    config: (host) => ({ ...readRail(host), host }),
    setup: (host, component) => {
        const onSelect = ({ id }) => {
            host.dispatchEvent(new CustomEvent("change", { detail: { value: id }, bubbles: true, composed: true }));
        };
        component.on("select", onSelect);
        return () => component.off("select", onSelect);
    },
    observeChildren: updateRail,
};
export const navigationRailElement = defineElement(navigationRailSpec);
export const navigationRailItemDeclaration = {
    name: "navigation-rail-item",
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
export const defineNavigationRail = (options) => {
    const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${navigationRailItemDeclaration.name}`;
    if (!customElements.get(itemTag)) {
        customElements.define(itemTag, createDeclarationClass(navigationRailItemDeclaration.attributes));
    }
    return navigationRailElement.define(options);
};
