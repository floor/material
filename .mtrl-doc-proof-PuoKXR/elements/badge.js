import createBadge from "../components/badge/index.js";
import { defineElement } from "./define.js";
const labelOf = (host) => host.getAttribute("label") ?? (host.textContent ?? "").trim();
const labels = new WeakMap();
const applyLabel = (component, label) => {
    if (labels.get(component) === label)
        return;
    labels.set(component, label);
    component.setLabel(label);
};
const badgeSpec = {
    name: "badge",
    create: (config) => createBadge(config),
    styles: ["badge"],
    hostStyles: ":host{display:inline-flex;vertical-align:middle}:host>*{position:relative}",
    attributes: {
        label: { type: "string", config: "label", update: (c, _v, host) => applyLabel(c, labelOf(host)) },
        max: { type: "number", config: "max" },
        variant: { type: "string", config: "variant", update: (c, v) => void c.setVariant(String(v ?? "large")) },
        color: { type: "string", config: "color", update: (c, v) => void c.setColor(String(v ?? "error")) },
    },
    properties: {
        visible: { get: (c) => c.isVisible(), set: (c, v) => void c.toggle(!!v), config: "visible" },
    },
    config: (host) => (host.hasAttribute("label") ? {} : { label: labelOf(host) }),
    setup: (host, component) => void labels.set(component, labelOf(host)),
    observeChildren: (host, component) => {
        applyLabel(component, labelOf(host));
        return true;
    },
};
export const badgeElement = defineElement(badgeSpec);
export const defineBadge = (options) => badgeElement.define(options);
