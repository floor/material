import createTopAppBar from "../components/top-app-bar/index.js";
import { TOP_APP_BAR_DEFAULTS } from "../components/top-app-bar/constants.js";
import { defineElement } from "./define.js";
const namedSlot = (name) => {
    const slot = document.createElement("slot");
    slot.name = name;
    return slot;
};
const create = (config) => {
    const bar = createTopAppBar(config);
    const headline = bar.getHeadlineElement();
    const text = document.createElement("span");
    text.textContent = headline.textContent;
    headline.replaceChildren(document.createElement("slot"), text);
    bar.addLeadingElement(namedSlot("leading"));
    bar.addTrailingElement(namedSlot("trailing"));
    return bar;
};
const headlineText = (component) => component.getHeadlineElement().querySelector("span");
const leadingEmptiness = (component) => {
    const leading = component.getLeadingContainer();
    const slot = leading.querySelector("slot");
    const sync = () => {
        leading.toggleAttribute("data-empty", slot.assignedElements().length === 0);
    };
    sync();
    slot.addEventListener("slotchange", sync);
    return () => slot.removeEventListener("slotchange", sync);
};
const headlineFallback = (component) => {
    const slot = component.getHeadlineElement().querySelector("slot");
    const sync = () => {
        const text = headlineText(component);
        if (text) {
            text.hidden = slot
                .assignedNodes()
                .some((node) => node.nodeType === Node.ELEMENT_NODE || (node.textContent ?? "").trim() !== "");
        }
    };
    sync();
    slot.addEventListener("slotchange", sync);
    return () => slot.removeEventListener("slotchange", sync);
};
const readBar = (host) => ({
    scrollable: !host.hasAttribute("no-scroll") && !host.hasAttribute("scroll-target"),
    compressible: !host.hasAttribute("no-compress"),
});
const threshold = (host) => {
    const value = Number(host.getAttribute("scroll-threshold") ?? TOP_APP_BAR_DEFAULTS.SCROLL_THRESHOLD);
    return Number.isNaN(value) ? TOP_APP_BAR_DEFAULTS.SCROLL_THRESHOLD : value;
};
const followScrollTarget = (host, component) => {
    const id = host.getAttribute("scroll-target");
    if (!id || host.hasAttribute("no-scroll"))
        return () => undefined;
    const update = (target) => void component.setScrollState(target.scrollTop > threshold(host));
    const onScroll = (event) => {
        const target = event.composedPath()[0];
        if (target instanceof Element && target.id === id)
            update(target);
    };
    const initial = host.ownerDocument.getElementById(id);
    if (initial)
        update(initial);
    host.ownerDocument.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => host.ownerDocument.removeEventListener("scroll", onScroll, { capture: true });
};
export const createBarSpec = (name) => ({
    name,
    slots: ["leading", "trailing"],
    create: (config) => create(config),
    styles: ["top-app-bar"],
    hostStyles: ":host{display:block}",
    attributes: {
        type: { type: "string", config: "type", update: (c, v) => void c.setType((v ?? "small")) },
        headline: {
            type: "string",
            config: "title",
            update: (c, v) => {
                const text = headlineText(c);
                if (text)
                    text.textContent = v === null ? "" : String(v);
            },
        },
        "no-scroll": { type: "boolean" },
        "no-compress": { type: "boolean" },
        "scroll-threshold": { type: "number", config: "scrollThreshold" },
        "scroll-target": { type: "string" },
        "aria-label": {
            type: "string",
            update: (c, v) => c.element.setAttribute("aria-label", v === null ? "Top app bar" : String(v)),
        },
    },
    methods: ["setScrollState"],
    config: readBar,
    setup: (host, component) => {
        const label = host.getAttribute("aria-label");
        if (label !== null)
            component.element.setAttribute("aria-label", label);
        const cleanups = [headlineFallback(component), leadingEmptiness(component), followScrollTarget(host, component)];
        return () => cleanups.forEach((cleanup) => cleanup());
    },
});
export const appBarSpec = createBarSpec("app-bar");
export const appBarElement = defineElement(appBarSpec);
export const defineAppBar = (options) => appBarElement.define(options);
