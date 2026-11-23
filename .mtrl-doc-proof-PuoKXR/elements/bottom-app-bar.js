import createBottomAppBar from "../components/bottom-app-bar/index.js";
import { defineElement } from "./define.js";
const fabClass = (component) => `${component.getClass("bottom-app-bar")}--with-fab`;
const create = (config) => {
    const bar = createBottomAppBar(config);
    bar.addAction(document.createElement("slot"));
    const fab = document.createElement("slot");
    fab.name = "fab";
    bar.element.querySelector(`.${bar.getClass("bottom-app-bar")}__fab-container`)?.append(fab);
    return bar;
};
const readBar = (host) => ({
    hasFab: Array.from(host.children).some((child) => child.getAttribute("slot") === "fab"),
});
const bottomAppBarSpec = {
    name: "bottom-app-bar",
    slots: ["fab"],
    create: (config) => create(config),
    styles: ["bottom-app-bar"],
    hostStyles: ":host{display:block}",
    attributes: {
        "fab-position": { type: "string", config: "fabPosition" },
        "auto-hide": { type: "boolean", config: "autoHide" },
        "transition-duration": { type: "number", config: "transitionDuration" },
        "aria-label": {
            type: "string",
            update: (c, v) => c.element.setAttribute("aria-label", v === null ? "Bottom app bar" : String(v)),
        },
    },
    methods: ["show", "hide"],
    config: readBar,
    setup: (host, component) => {
        const label = host.getAttribute("aria-label");
        if (label !== null)
            component.element.setAttribute("aria-label", label);
        const slot = component.element.querySelector('slot[name="fab"]');
        const onSlotChange = () => void component.element.classList.toggle(fabClass(component), !!slot?.assignedElements().length);
        slot?.addEventListener("slotchange", onSlotChange);
        return () => slot?.removeEventListener("slotchange", onSlotChange);
    },
};
export const bottomAppBarElement = defineElement(bottomAppBarSpec);
export const defineBottomAppBar = (options) => bottomAppBarElement.define(options);
