import createToolbar from "../components/toolbar/index.js";
import { defineElement } from "./define.js";
const slotted = (host, name) => Array.from(host.children).some((child) => child.getAttribute("slot") === name);
const namedSlot = (name) => {
    const slot = document.createElement("slot");
    slot.name = name;
    return slot;
};
const create = (config) => {
    const { hasFab, hasOverflow, ...rest } = config;
    const toolbar = createToolbar({
        ...rest,
        items: [document.createElement("slot")],
        fab: hasFab ? namedSlot("fab") : undefined,
        overflow: hasOverflow ? () => null : undefined,
    });
    if (hasOverflow)
        toolbar.element.append(namedSlot("overflow"));
    return toolbar;
};
const readToolbar = (host) => ({
    hasFab: slotted(host, "fab"),
    hasOverflow: slotted(host, "overflow"),
    elevated: !host.hasAttribute("flat"),
});
const anchorMenus = (component) => {
    const slot = component.element.querySelector('slot[name="overflow"]');
    for (const menu of slot?.assignedElements() ?? []) {
        menu.anchor = component.overflowButton;
    }
};
const toolbarSpec = {
    name: "toolbar",
    slots: ["fab", "overflow"],
    create: (config) => create(config),
    styles: ["icon-button", "toolbar"],
    hostStyles: ":host{display:block}:host([variant=floating]){width:fit-content}",
    attributes: {
        variant: { type: "string", config: "variant" },
        color: { type: "string", config: "color", update: (c, v) => c.setColor(v === null ? "standard" : String(v)) },
        orientation: { type: "string", config: "orientation" },
        placement: { type: "string", config: "placement" },
        arrangement: { type: "string", config: "arrangement" },
        flat: {
            type: "boolean",
            update: (c, v) => void c.element.classList.toggle(`${c.getClass("toolbar")}--elevated`, !v && c.element.classList.contains(`${c.getClass("toolbar")}--floating`)),
        },
        "fab-position": { type: "string", config: "fabPosition" },
        "scroll-behavior": { type: "string", config: "scrollBehavior" },
        "scroll-threshold": { type: "number", config: "scrollThreshold" },
        "overflow-label": { type: "string", config: "overflowLabel" },
        "aria-label": {
            type: "string",
            update: (c, v) => c.bar.setAttribute("aria-label", v === null ? "Toolbar" : String(v)),
        },
    },
    methods: ["show", "hide"],
    events: {
        show: { detail: () => null, state: true },
        hide: { detail: () => null, state: true },
        collapse: { detail: () => null, state: true },
        expand: { detail: () => null, state: true },
    },
    config: readToolbar,
    observeChildren: (host, component) => slotted(host, "fab") === !!component.element.querySelector('slot[name="fab"]') &&
        slotted(host, "overflow") === !!component.overflowButton,
    setup: (host, component) => {
        const label = host.getAttribute("aria-label");
        if (label !== null)
            component.bar.setAttribute("aria-label", label);
        const overflow = component.element.querySelector('slot[name="overflow"]');
        const onOverflow = () => anchorMenus(component);
        overflow?.addEventListener("slotchange", onOverflow);
        anchorMenus(component);
        component.bar.dispatchEvent(new Event("slotchange"));
        const collapsedClass = `${component.getClass("toolbar")}--collapsed`;
        host.classList.remove(collapsedClass);
        const onCollapse = () => host.classList.add(collapsedClass);
        const onExpand = () => host.classList.remove(collapsedClass);
        component.on("collapse", onCollapse);
        component.on("expand", onExpand);
        return () => {
            overflow?.removeEventListener("slotchange", onOverflow);
            component.off("collapse", onCollapse);
            component.off("expand", onExpand);
        };
    },
};
export const toolbarElement = defineElement(toolbarSpec);
export const defineToolbar = (options) => toolbarElement.define(options);
