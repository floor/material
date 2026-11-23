import createIconButton from "../components/icon-button/index.js";
import { defineElement } from "./define.js";
import { buttonAria, buttonForm, setupFormButton, typeAttribute } from "./form-button.js";
const iconButtonSpec = {
    name: "icon-button",
    create: (config) => createIconButton({ ariaLabel: "", ...config, type: "button" }),
    styles: ["icon-button"],
    hostStyles: ":host{display:inline-flex;vertical-align:middle}:host::before{content:'';align-self:stretch;width:0}",
    marker: "data-mtrl-icon-button",
    attributes: {
        variant: { type: "string", config: "variant", update: (c, v) => void c.setVariant(String(v ?? "standard")) },
        size: { type: "string", config: "size", update: (c, v) => void c.setSize(String(v ?? "s")) },
        shape: { type: "string", config: "shape", update: (c, v) => void c.setShape(String(v ?? "round")) },
        width: { type: "string", config: "width", update: (c, v) => void c.setWidth(String(v ?? "default")) },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        icon: { type: "string", config: "icon", update: (c, v) => void c.setIcon(String(v ?? "")) },
        "selected-icon": {
            type: "string",
            config: "selectedIcon",
            update: (c, v) => void c.setSelectedIcon(String(v ?? "")),
        },
        toggle: { type: "boolean", config: "toggle" },
        selected: { type: "boolean", config: "selected", update: (c, v) => void (v ? c.select() : c.deselect()) },
        value: { type: "string", config: "value", update: (c, v) => void c.setValue(String(v ?? "")) },
        type: typeAttribute,
        ...buttonAria,
        "aria-label": { type: "string", config: "ariaLabel", update: (c, v) => void c.setAriaLabel(String(v ?? "")) },
    },
    properties: {
        selected: {
            get: (c) => c.isSelected(),
            set: (c, v) => void (v ? c.select() : c.deselect()),
            config: "selected",
        },
    },
    methods: ["select", "deselect", "toggleSelected"],
    model: "selected",
    events: {
        change: {
            detail: (payload) => {
                const { selected, value } = payload;
                return { selected, value };
            },
        },
    },
    form: buttonForm(),
    setup: setupFormButton,
};
export const iconButtonElement = defineElement(iconButtonSpec);
export const defineIconButton = (options) => iconButtonElement.define(options);
