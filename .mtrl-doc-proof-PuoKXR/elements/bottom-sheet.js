import createBottomSheet from "../components/bottom-sheet/index.js";
import { defineElement } from "./define.js";
import { headlineSlot, setHeadline, setSheetOpen, sheetSetup, syncSheet } from "./sheet.js";
const PARTS = {
    container: "bottom-sheet__container",
    header: "bottom-sheet__header",
    title: "bottom-sheet__title",
};
const create = (config) => {
    const { host, headline, modal, noDragHandle, noCloseOnScrimClick, noCloseOnEscape, ...rest } = config;
    const isModal = modal || host.getAttribute("variant") === "modal";
    const content = document.createElement("slot");
    const sheet = createBottomSheet({
        ...rest,
        title: " ",
        content,
        dragHandle: !noDragHandle,
        closeOnScrimClick: !noCloseOnScrimClick,
        closeOnEscape: !noCloseOnEscape,
        variant: isModal ? "modal" : "standard",
        layer: isModal ? "top" : undefined,
    });
    headlineSlot(sheet, PARTS, headline);
    const handlers = { expand: new Set(), collapse: new Set() };
    sheet.on("stateChange", ({ state, previous }) => {
        const event = state === "expanded" ? "expand" : previous === "expanded" ? "collapse" : null;
        if (!event)
            return;
        host.toggleAttribute("expanded", state === "expanded");
        handlers[event].forEach((handler) => handler());
    });
    const own = (event) => event === "expand" || event === "collapse";
    const { on, off } = sheet;
    return Object.assign(sheet, {
        show: () => sheet.open(),
        on: (event, handler) => own(event) ? handlers[event].add(handler) : on.call(sheet, event, handler),
        off: (event, handler) => own(event) ? handlers[event].delete(handler) : off.call(sheet, event, handler),
    });
};
const setOpen = (component, open, host) => {
    if (open && !component.isOpen() && host.hasAttribute("expanded"))
        component.expand();
    else
        setSheetOpen(component, open);
};
const setExpanded = (component, expanded) => {
    if (!component.isOpen() || expanded === (component.getState() === "expanded"))
        return;
    if (expanded)
        component.expand();
    else
        component.collapse();
};
const bottomSheetSpec = {
    name: "bottom-sheet",
    slots: ["headline"],
    create: (config) => create(config),
    styles: ["bottom-sheet"],
    hostStyles: ":host{display:contents}",
    attributes: {
        open: { type: "boolean", update: (c, v, host) => setOpen(c, !!v, host) },
        expanded: { type: "boolean", update: (c, v) => setExpanded(c, !!v) },
        modal: { type: "boolean", config: "modal" },
        variant: { type: "string" },
        headline: {
            type: "string",
            config: "headline",
            update: (c, v, host) => {
                setHeadline(c, v);
                syncSheet(host, c, PARTS);
            },
        },
        "peek-height": { type: "number", config: "peekHeight" },
        "max-width": { type: "number", config: "maxWidth" },
        "no-drag-handle": { type: "boolean", config: "noDragHandle" },
        "no-close-on-scrim-click": { type: "boolean", config: "noCloseOnScrimClick" },
        "no-close-on-escape": { type: "boolean", config: "noCloseOnEscape" },
        "aria-label": { type: "string", update: (c, _v, host) => syncSheet(host, c, PARTS) },
    },
    methods: ["show", "close", "expand", "collapse"],
    events: {
        open: { detail: () => null, state: true },
        close: { detail: () => null, state: true },
        expand: { detail: () => null, state: true },
        collapse: { detail: () => null, state: true },
    },
    config: (host) => ({ host }),
    setup: (host, component) => sheetSetup(host, component, PARTS, (handler) => {
        component.on("open", handler);
        component.on("close", handler);
        return () => {
            component.off("open", handler);
            component.off("close", handler);
        };
    }, () => setOpen(component, true, host)),
};
export const bottomSheetElement = defineElement(bottomSheetSpec);
export const defineBottomSheet = (options) => bottomSheetElement.define(options);
