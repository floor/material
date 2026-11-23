import createDialog from "../components/dialog/index.js";
import { createDivider } from "../components/divider/index.js";
import { PREFIX } from "../core/config.js";
import { defineElement } from "./define.js";
const FOOTER_ALIGNMENTS = ["left", "center", "space-between"];
const setFooterAlignment = (footer, alignment) => {
    for (const name of FOOTER_ALIGNMENTS) {
        footer.classList.toggle(`${PREFIX}-dialog__footer--${name}`, name === alignment);
    }
};
const setSubtitle = (component, value) => {
    component.setSubtitle(value === null || value === undefined ? "" : String(value));
    const subtitle = component.element.querySelector(`.${PREFIX}-dialog__header-subtitle`);
    if (subtitle && !subtitle.textContent)
        subtitle.remove();
};
const slot = (name, fallback) => {
    const element = document.createElement("slot");
    if (name)
        element.name = name;
    if (fallback)
        element.textContent = fallback;
    return element;
};
const create = (config) => {
    const { headline, fullscreen, noCloseOnScrimClick, noCloseOnEscape, footerAlignment, ...rest } = config;
    const dialog = createDialog({
        ...rest,
        title: " ",
        content: " ",
        ...(fullscreen ? { size: "fullscreen" } : {}),
        closeOnOverlayClick: !noCloseOnScrimClick,
        closeOnEscape: !noCloseOnEscape,
        open: false,
        layer: "top",
    });
    dialog.element.querySelector(`.${PREFIX}-dialog__header-title`)?.replaceChildren(slot("headline", headline));
    dialog.getContentElement()?.replaceChildren(slot());
    const footer = document.createElement("div");
    footer.className = `${PREFIX}-dialog__footer`;
    footer.append(slot("actions"));
    setFooterAlignment(footer, footerAlignment);
    if (config.divider) {
        dialog.element.append(createDivider({ variant: "full-width", class: `${PREFIX}-dialog__divider ${PREFIX}-dialog__footer-divider` }).element);
    }
    dialog.element.append(footer);
    return Object.assign(dialog, { show: () => dialog.open() });
};
const hasContent = (node) => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "");
const syncRegions = (host, component) => {
    const { element } = component;
    const title = element.querySelector(`.${PREFIX}-dialog__header-title`);
    const headline = title?.querySelector("slot");
    const footer = element.querySelector(`.${PREFIX}-dialog__footer`);
    const actions = footer?.querySelector("slot");
    const named = !!headline && (headline.assignedNodes().some(hasContent) || (headline.textContent ?? "") !== "");
    if (title)
        title.style.display = named ? "" : "none";
    const shown = actions?.assignedElements().length ? "" : "none";
    if (footer)
        footer.style.display = shown;
    const divider = element.querySelector(`.${PREFIX}-dialog__footer-divider`);
    if (divider)
        divider.style.display = shown;
    const label = host.getAttribute("aria-label");
    if (label !== null) {
        element.setAttribute("aria-label", label);
        element.removeAttribute("aria-labelledby");
    }
    else {
        element.removeAttribute("aria-label");
        if (named && title)
            element.setAttribute("aria-labelledby", title.id);
        else
            element.removeAttribute("aria-labelledby");
    }
};
const setOpen = (component, open) => {
    if (open === component.isOpen())
        return;
    if (open)
        component.open();
    else
        component.close();
};
const dialogSpec = {
    name: "dialog",
    slots: ["headline", "actions"],
    create: (config) => create(config),
    styles: ["progress", "button", "divider", "dialog"],
    hostStyles: ":host{display:contents}",
    attributes: {
        open: { type: "boolean", update: (c, v) => setOpen(c, !!v) },
        headline: {
            type: "string",
            config: "headline",
            update: (c, v, host) => {
                const headline = c.element.querySelector('slot[name="headline"]');
                if (headline)
                    headline.textContent = v === null ? "" : String(v);
                syncRegions(host, c);
            },
        },
        subtitle: { type: "string", config: "subtitle", update: (c, v) => setSubtitle(c, v) },
        size: { type: "string", config: "size" },
        animation: { type: "string", config: "animation" },
        fullscreen: { type: "boolean", config: "fullscreen" },
        "close-button": { type: "boolean", config: "closeButton" },
        divider: { type: "boolean", config: "divider" },
        "footer-alignment": {
            type: "string",
            config: "footerAlignment",
            update: (c, v) => {
                const footer = c.element.querySelector(`.${PREFIX}-dialog__footer`);
                if (footer)
                    setFooterAlignment(footer, v);
            },
        },
        "no-close-on-scrim-click": { type: "boolean", config: "noCloseOnScrimClick" },
        "no-close-on-escape": { type: "boolean", config: "noCloseOnEscape" },
        "aria-label": { type: "string", update: (c, _v, host) => syncRegions(host, c) },
    },
    methods: ["show", "close"],
    events: {
        open: { detail: () => null, state: true },
        close: { detail: () => null, state: true },
        cancel: { detail: () => null },
    },
    setup: (host, component) => {
        const { element } = component;
        const sync = () => syncRegions(host, component);
        const slots = Array.from(element.querySelectorAll("slot"));
        slots.forEach((s) => s.addEventListener("slotchange", sync));
        sync();
        const reflect = () => void host.toggleAttribute("open", component.isOpen());
        component.on("open", reflect);
        component.on("close", reflect);
        const onCancel = (event) => {
            if (host.dispatchEvent(new CustomEvent("cancel", { detail: null, cancelable: true, bubbles: true, composed: true })))
                return;
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        element.addEventListener("cancel", onCancel, true);
        if (host.hasAttribute("open"))
            component.open();
        return () => {
            slots.forEach((s) => s.removeEventListener("slotchange", sync));
            component.off("open", reflect);
            component.off("close", reflect);
            element.removeEventListener("cancel", onCancel, true);
        };
    },
};
export const dialogElement = defineElement(dialogSpec);
export const defineDialog = (options) => dialogElement.define(options);
