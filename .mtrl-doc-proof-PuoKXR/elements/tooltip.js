import createTooltip from "../components/tooltip/index.js";
import { defineElement } from "./define.js";
const textOf = (host) => host.getAttribute("text") ?? (host.textContent ?? "").trim();
const wirings = new WeakMap();
const explicit = new WeakMap();
let ids = 0;
const idrefs = (el) => (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
const setIdrefs = (el, list) => {
    if (list.length)
        el.setAttribute("aria-describedby", list.join(" "));
    else
        el.removeAttribute("aria-describedby");
};
const reaches = (tree, node) => {
    for (let root = node.getRootNode();; root = root.host.getRootNode()) {
        if (root === tree)
            return true;
        if (!root.host)
            return false;
    }
};
const describe = (host, target, component) => {
    setIdrefs(target, idrefs(target).filter((id) => id !== component.element.id));
    host.setAttribute("aria-hidden", "true");
    host.setAttribute("aria-label", component.getText());
    const tree = host.getRootNode();
    if (target.getRootNode() === tree) {
        if (!host.id)
            host.id = `m-tooltip-${++ids}`;
        const id = host.id;
        if (!idrefs(target).includes(id))
            setIdrefs(target, [...idrefs(target), id]);
        return () => setIdrefs(target, idrefs(target).filter((ref) => ref !== id));
    }
    const reflecting = target;
    if (reaches(tree, target) && "ariaDescribedByElements" in reflecting) {
        const previous = reflecting.ariaDescribedByElements;
        reflecting.ariaDescribedByElements = [...(previous ?? []), host];
        return () => void (reflecting.ariaDescribedByElements = previous);
    }
    if (target.hasAttribute("aria-description"))
        return () => { };
    target.setAttribute("aria-description", component.getText());
    return () => target.removeAttribute("aria-description");
};
const forTarget = (host) => {
    const id = host.getAttribute("for");
    if (!id)
        return null;
    const root = host.getRootNode();
    const found = root.getElementById?.(id) ?? host.ownerDocument.getElementById(id);
    return found instanceof HTMLElement ? found : null;
};
const retarget = (component, force = false) => {
    const wiring = wirings.get(component);
    if (!wiring)
        return;
    const target = explicit.get(component) ?? forTarget(wiring.host);
    if (target === component.target && wiring.undescribe && !force)
        return;
    wiring.undescribe?.();
    wiring.undescribe = null;
    if (!target)
        return;
    if (target !== component.target)
        component.setTarget(target);
    wiring.undescribe = describe(wiring.host, target, component);
};
const tooltipSpec = {
    name: "tooltip",
    create: (config) => {
        const { noShowOnHover, noShowOnFocus, ...rest } = config;
        return createTooltip({ ...rest, showOnHover: !noShowOnHover, showOnFocus: !noShowOnFocus, layer: "top" });
    },
    styles: ["tooltip"],
    hostStyles: ":host{display:contents}",
    attributes: {
        for: { type: "string", update: (c) => retarget(c) },
        text: {
            type: "string",
            config: "text",
            update: (c, _v, host) => {
                c.setText(textOf(host));
                retarget(c, true);
            },
        },
        position: {
            type: "string",
            config: "position",
            update: (c, v) => void c.setPosition((v ?? "bottom")),
        },
        variant: { type: "string", config: "variant" },
        "show-delay": { type: "number", config: "showDelay" },
        "hide-delay": { type: "number", config: "hideDelay" },
        "no-show-on-hover": { type: "boolean", config: "noShowOnHover" },
        "no-show-on-focus": { type: "boolean", config: "noShowOnFocus" },
    },
    properties: {
        target: {
            get: (c) => c.target,
            set: (c, v) => {
                if (v instanceof HTMLElement)
                    explicit.set(c, v);
                else
                    explicit.delete(c);
                retarget(c);
            },
        },
    },
    methods: ["show", "hide"],
    config: (host) => (host.hasAttribute("text") ? {} : { text: textOf(host) }),
    setup: (host, component) => {
        if (explicit.get(component) === forTarget(host))
            explicit.delete(component);
        const wiring = { host, undescribe: null };
        wirings.set(component, wiring);
        retarget(component);
        return () => {
            wiring.undescribe?.();
            wirings.delete(component);
        };
    },
    observeChildren: (host, component) => {
        if (!host.hasAttribute("text")) {
            component.setText(textOf(host));
            retarget(component, true);
        }
        return true;
    },
};
export const tooltipElement = defineElement(tooltipSpec);
export const defineTooltip = (options) => tooltipElement.define(options);
