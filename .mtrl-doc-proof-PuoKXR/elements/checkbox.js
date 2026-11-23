import createCheckbox from "../components/checkbox/index.js";
import { defineElement } from "./define.js";
const checkboxSpec = {
    name: "checkbox",
    create: (config) => createCheckbox(config),
    styles: ["checkbox"],
    hostStyles: ":host{display:inline-flex}",
    attributes: {
        checked: { type: "boolean", config: "checked", update: (c, v) => void c.setValue(!!v) },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        required: { type: "boolean", config: "required" },
        value: { type: "string", config: "value", update: (c, v) => void c.setValueAttribute(String(v ?? "")) },
        error: { type: "boolean", config: "error", update: (c, v) => void c.setError(!!v) },
        "label-position": { type: "string", config: "labelPosition" },
        "aria-label": { type: "string", config: "ariaLabel" },
    },
    properties: {
        checked: { get: (c) => c.isChecked(), set: (c, v) => void c.setValue(!!v), config: "checked" },
        indeterminate: {
            get: (c) => c.input.indeterminate,
            set: (c, v) => void c.setIndeterminate(!!v),
            config: "indeterminate",
        },
    },
    methods: ["toggle", "check", "uncheck"],
    model: "checked",
    events: {
        change: {
            detail: (payload) => {
                const { checked, value, valueAttribute, nativeEvent } = payload;
                return { checked, value, valueAttribute, nativeEvent };
            },
        },
    },
    slot: {
        attribute: "label",
        config: "label",
    },
    form: {
        value: (c) => (c.isChecked() ? c.getValueAttribute() || "on" : null),
        control: (c) => c.input,
        events: ["change"],
        activate: (c) => c.input.click(),
        state: (c) => (c.isChecked() ? "checked" : "unchecked"),
        restore: (c, state) => void c.setValue(state === "checked"),
        disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
    },
};
export const checkboxElement = defineElement(checkboxSpec);
export const defineCheckbox = (options) => checkboxElement.define(options);
