import { createShadowDrawer } from "../components/drawer/drawer.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
const collapsedDeclarations = new WeakSet();
const previousDeclarations = new WeakMap();
const itemChildren = (host, tag) => Array.from(host.children).filter(child => child.localName === tag);
const itemLabel = (child, section) => child.getAttribute("label") ?? (section
    ? Array.from(child.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent).join("")
    : child.textContent ?? "").trim();
const declaredItems = (host, tag, active, sections) => {
    const items = [];
    for (const child of itemChildren(host, tag)) {
        const type = child.getAttribute("type");
        if (type === "divider") {
            items.push({ type: "divider" });
            continue;
        }
        const nested = itemChildren(child, tag);
        const children = sections && nested.length ? declaredItems(child, tag, active, false) : [];
        const label = itemLabel(child, nested.length > 0);
        if (type === "section" && !children.length) {
            items.push({ type: "section", label });
            continue;
        }
        if (!label)
            continue;
        const id = child.getAttribute("value") ?? label;
        const item = {
            id,
            label,
            icon: child.getAttribute("icon") ?? undefined,
            activeIcon: child.getAttribute("selected-icon") ?? undefined,
            badge: child.getAttribute("badge") ?? undefined,
            disabled: child.hasAttribute("disabled"),
        };
        if (children.length) {
            item.items = children;
            if (child.hasAttribute("expanded")) {
                collapsedDeclarations.delete(child);
                item.expanded = true;
            }
            else if (collapsedDeclarations.has(child))
                item.expanded = false;
        }
        else {
            item.active = id === active;
            item.href = child.getAttribute("href") ?? undefined;
        }
        items.push(item);
    }
    return items;
};
const reflectSection = (host, { id, expanded }) => {
    const tag = `${host.localName}-item`;
    const item = itemChildren(host, tag).find(child => itemChildren(child, tag).length && (child.getAttribute("value") ?? itemLabel(child, true)) === id);
    if (!item)
        return;
    if (expanded)
        collapsedDeclarations.delete(item);
    else
        collapsedDeclarations.add(item);
    const previous = previousDeclarations.get(host)?.find(section => section.items && section.id === id);
    if (previous)
        previous.expanded = expanded;
    item.toggleAttribute("expanded", expanded);
};
const readDrawer = (host) => {
    const items = declaredItems(host, `${host.localName}-item`, host.getAttribute("value"), true);
    previousDeclarations.set(host, items);
    const reflect = (event) => reflectSection(host, event);
    return { items, onExpand: reflect, onCollapse: reflect };
};
const withoutActive = (items) => JSON.stringify(items, (name, value) => name === "active" ? undefined : value);
const updateDrawer = (host, component) => {
    const active = component.getActive();
    const items = declaredItems(host, `${host.localName}-item`, host.dirty ? active : host.getAttribute("value"), true);
    const previous = previousDeclarations.get(host) ?? [];
    previousDeclarations.set(host, items);
    const signature = withoutActive(items);
    if (signature === withoutActive(previous) || signature === withoutActive(component.getItems()))
        return true;
    const settings = items.map(item => {
        if (!item.items || item.id === undefined || item.items.some(child => child.active && child.id !== active))
            return item;
        const old = previous.find(candidate => candidate.items && candidate.id === item.id);
        return old && old.expanded === item.expanded
            ? { ...item, expanded: component.isSectionExpanded(item.id) }
            : item;
    });
    const focused = host.shadowRoot?.activeElement?.dataset.id;
    component.setItems(settings);
    if (focused !== undefined) {
        const item = Array.from(component.element.querySelectorAll("[data-id]")).find(element => element.dataset.id === focused && !element.matches('[disabled], [aria-disabled="true"]') && !element.closest("[inert]"));
        item?.focus();
    }
    return true;
};
const sectionDetail = (payload) => {
    const { value, expanded } = payload;
    return { value, expanded };
};
const select = (component, value) => void component.setActive(value === null || value === undefined ? "" : String(value));
const create = ({ modal, ...config }) => {
    const width = typeof config.width === "string" && /^\d+(\.\d+)?$/.test(config.width) ? Number(config.width) : config.width;
    return createShadowDrawer({ ...config, width, ...(modal ? { variant: "modal", layer: "top" } : { variant: "standard" }) });
};
export const createDrawerSpec = (name) => ({
    name,
    create: (config) => create(config),
    styles: ["drawer"],
    hostStyles: ":host{display:block;flex-shrink:0}",
    attributes: {
        value: { type: "string", update: (c, v) => select(c, v) },
        open: { type: "boolean", config: "open", update: (c, v) => void (v ? c.open() : c.close()) },
        modal: { type: "boolean", config: "modal" },
        headline: { type: "string", config: "headline", update: (c, v) => void c.setHeadline(v === null ? "" : String(v)) },
        position: { type: "string", config: "position" },
        width: { type: "string", config: "width" },
        dense: { type: "boolean", config: "dense" },
        "no-close-on-scrim-click": { type: "boolean", update: () => undefined },
        "no-close-on-escape": { type: "boolean", update: () => undefined },
        "aria-label": {
            type: "string",
            config: "ariaLabel",
            update: (c, v) => c.element.setAttribute("aria-label", v === null ? c.getHeadline() || "Navigation" : String(v)),
        },
    },
    properties: {
        value: { get: (c) => c.getActive(), set: (c, v) => select(c, v) },
    },
    model: "value",
    methods: ["expandSection", "collapseSection", "toggleSection", "isSectionExpanded", "getExpandedSections"],
    events: {
        change: {
            detail: (payload) => ({ value: payload.value }),
        },
        open: { detail: () => null, state: true },
        close: { detail: () => null, state: true },
        expand: { detail: sectionDetail, state: true },
        collapse: { detail: sectionDetail, state: true },
    },
    config: readDrawer,
    setup: (host, component) => {
        const onSelect = ({ id }) => {
            host.dispatchEvent(new CustomEvent("change", { detail: { value: id }, bubbles: true, composed: true }));
        };
        const reflect = () => {
            if (host.hasAttribute("modal"))
                host.toggleAttribute("open", component.isOpen());
        };
        const root = component.element;
        const onClick = (event) => {
            if (event.target === root && host.hasAttribute("no-close-on-scrim-click"))
                event.stopImmediatePropagation();
        };
        const onCancel = (event) => {
            if (!host.hasAttribute("no-close-on-escape"))
                return;
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        root.addEventListener("click", onClick, true);
        root.addEventListener("cancel", onCancel, true);
        component.on("select", onSelect);
        component.on("open", reflect);
        component.on("close", reflect);
        return () => {
            root.removeEventListener("click", onClick, true);
            root.removeEventListener("cancel", onCancel, true);
            component.off("select", onSelect);
            component.off("open", reflect);
            component.off("close", reflect);
        };
    },
    observeChildren: updateDrawer,
});
export const navigationDrawerSpec = createDrawerSpec("navigation-drawer");
export const navigationDrawerElement = defineElement(navigationDrawerSpec);
export const navigationDrawerItemDeclaration = {
    name: "navigation-drawer-item",
    attributes: {
        type: { type: "string" },
        value: { type: "string" },
        label: { type: "string" },
        icon: { type: "string" },
        "selected-icon": { type: "string" },
        badge: { type: "string" },
        href: { type: "string" },
        expanded: { type: "boolean" },
        disabled: { type: "boolean" },
    },
};
export const defineNavigationDrawer = (options) => {
    const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${navigationDrawerItemDeclaration.name}`;
    if (!customElements.get(itemTag))
        customElements.define(itemTag, createDeclarationClass(navigationDrawerItemDeclaration.attributes));
    return navigationDrawerElement.define(options);
};
