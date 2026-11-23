import createButton from "../components/button/index.js";
import { defineElement } from "./define.js";
import { buttonAria, buttonForm, setupFormButton, typeAttribute } from "./form-button.js";
const buttonSpec = {
    name: "button",
    create: (config) => createButton({ ...config, type: "button" }),
    styles: ["progress", "button"],
    hostStyles: ":host{display:inline-flex;vertical-align:middle}",
    attributes: {
        variant: { type: "string", config: "variant", update: (c, v) => void c.setVariant(String(v ?? "filled")) },
        size: { type: "string", config: "size", update: (c, v) => void c.setSize(String(v ?? "s")) },
        shape: { type: "string", config: "shape", update: (c, v) => void c.setShape(String(v ?? "round")) },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        loading: { type: "boolean", config: "loading" },
        icon: { type: "string", config: "icon" },
        "icon-position": { type: "string", config: "iconPosition" },
        toggle: { type: "boolean", config: "toggle" },
        selected: { type: "boolean", config: "selected", update: (c, v) => void c.setSelected(Boolean(v)) },
        value: { type: "string", config: "value", update: (c, v) => void c.setValue(String(v ?? "")) },
        type: typeAttribute,
        ...buttonAria,
        "aria-label": { type: "string", config: "ariaLabel", update: (c, v) => void c.setAriaLabel(String(v ?? "")) },
    },
    properties: {
        selected: {
            get: (c) => c.isSelected(),
            set: (c, v) => void c.setSelected(Boolean(v)),
            config: "selected",
        },
    },
    methods: ["setSelected"],
    model: "selected",
    slot: {
        attribute: "label",
        config: "text",
    },
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
export const buttonElement = defineElement(buttonSpec);
export const defineButton = (options) => buttonElement.define(options);
