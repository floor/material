import createSideSheet from "../components/side-sheet/index.js";
import { defineElement } from "./define.js";
import { headlineSlot, setHeadline, setSheetOpen, sheetSetup, syncSheet } from "./sheet.js";
const PARTS = {
    container: "side-sheet__container",
    header: "side-sheet__header",
    title: "side-sheet__title",
};
const create = (config) => {
    const { host, headline, modal, noCloseButton, noCloseOnScrimClick, noCloseOnEscape, ...rest } = config;
    const isModal = modal || host?.getAttribute("variant") === "modal";
    const content = document.createElement("slot");
    const sheet = createSideSheet({
        ...rest,
        title: " ",
        content,
        closeButton: !noCloseButton,
        closeOnScrimClick: !noCloseOnScrimClick,
        closeOnEscape: !noCloseOnEscape,
        variant: isModal ? "modal" : "standard",
        layer: isModal ? "top" : undefined,
    });
    headlineSlot(sheet, PARTS, headline);
    return Object.assign(sheet, { show: () => sheet.open() });
};
const sideSheetSpec = {
    name: "side-sheet",
    slots: ["headline"],
    create: (config) => create(config),
    styles: ["side-sheet"],
    hostStyles: ":host{display:contents}",
    attributes: {
        open: { type: "boolean", update: (c, v) => setSheetOpen(c, !!v) },
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
        position: { type: "string", config: "position" },
        width: { type: "number", config: "width" },
        "no-close-button": { type: "boolean", config: "noCloseButton" },
        "no-close-on-scrim-click": { type: "boolean", config: "noCloseOnScrimClick" },
        "no-close-on-escape": { type: "boolean", config: "noCloseOnEscape" },
        "aria-label": { type: "string", update: (c, _v, host) => syncSheet(host, c, PARTS) },
    },
    methods: ["show", "close"],
    events: {
        open: { detail: () => null, state: true },
        close: { detail: () => null, state: true },
    },
    config: (host) => ({ host }),
    setup: (host, component) => sheetSetup(host, component, PARTS, (handler) => {
        component.on("open", handler);
        component.on("close", handler);
        return () => {
            component.off("open", handler);
            component.off("close", handler);
        };
    }),
};
export const sideSheetElement = defineElement(sideSheetSpec);
export const defineSideSheet = (options) => sideSheetElement.define(options);
