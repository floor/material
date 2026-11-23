import createFab from "../components/fab/index.js";
import { defineElement } from "./define.js";
import { buttonAria, buttonForm, setupFormButton, typeAttribute } from "./form-button.js";
import { FLOATING_HOST_STYLES } from "./floating-placement.js";
const fabSpec = {
    name: "fab",
    create: (config) => createFab({ ...config, type: "button" }),
    styles: ["fab"],
    hostStyles: ":host{vertical-align:middle}" + FLOATING_HOST_STYLES,
    attributes: {
        variant: { type: "string", config: "variant" },
        size: { type: "string", config: "size" },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        icon: { type: "string", config: "icon", update: (c, v) => void c.setIcon(String(v ?? "")) },
        position: { type: "string", config: "position" },
        placement: { type: "string", config: "placement" },
        value: { type: "string", config: "value", update: (c, v) => void c.setValue(String(v ?? "")) },
        type: typeAttribute,
        ...buttonAria,
        "aria-label": { type: "string", config: "ariaLabel" },
    },
    methods: ["lower", "raise"],
    form: buttonForm(),
    setup: setupFormButton,
};
export const fabElement = defineElement(fabSpec);
export const defineFab = (options) => fabElement.define(options);
