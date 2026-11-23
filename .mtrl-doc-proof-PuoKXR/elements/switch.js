import createSwitch from "../components/switch/index.js";
import { defineElement } from "./define.js";
const switchSpec = {
    name: "switch",
    create: (config) => createSwitch(config),
    styles: ["switch"],
    hostStyles: ":host{display:inline-flex}",
    attributes: {
        checked: { type: "boolean", config: "checked", update: (c, v) => void c.setValue(!!v) },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        required: { type: "boolean", config: "required" },
        "aria-label": { type: "string", config: "ariaLabel" },
        value: { type: "string", config: "value", update: (c, v) => void c.setValueAttribute(String(v ?? "")) },
        icon: { type: "string", config: "icon" },
        error: { type: "boolean", config: "error", update: (c, v) => void c.setError(!!v) },
        "supporting-text": {
            type: "string",
            config: "supportingText",
            update: (c, v) => void (v ? c.setSupportingText(String(v), c.isError()) : c.removeSupportingText()),
        },
    },
    properties: {
        checked: { get: (c) => c.isChecked(), set: (c, v) => void c.setValue(!!v), config: "checked" },
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
export const switchElement = defineElement(switchSpec);
export const defineSwitch = (options) => switchElement.define(options);
