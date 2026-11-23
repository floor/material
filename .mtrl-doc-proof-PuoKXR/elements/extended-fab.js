import createExtendedFab from "../components/extended-fab/index.js";
import { defineElement } from "./define.js";
import { buttonAria, buttonForm, setupFormButton, typeAttribute } from "./form-button.js";
import { FLOATING_HOST_STYLES } from "./floating-placement.js";
const create = (config) => createExtendedFab({ ...config, type: "button" });
const extendedFabSpec = {
    name: "extended-fab",
    create: (config) => create(config),
    styles: ["extended-fab"],
    hostStyles: ":host{vertical-align:middle}" + FLOATING_HOST_STYLES,
    attributes: {
        variant: { type: "string", config: "variant" },
        size: { type: "string", config: "size" },
        width: { type: "string", config: "width" },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        icon: { type: "string", config: "icon", update: (c, v) => void c.setIcon(String(v ?? "")) },
        "icon-position": { type: "string", config: "iconPosition" },
        position: { type: "string", config: "position" },
        placement: { type: "string", config: "placement" },
        "collapse-on-scroll": { type: "boolean", config: "collapseOnScroll" },
        value: { type: "string", config: "value", update: (c, v) => void c.setValue(String(v ?? "")) },
        type: typeAttribute,
        ...buttonAria,
        "aria-label": { type: "string", config: "ariaLabel" },
    },
    methods: ["lower", "raise", "collapse", "expand"],
    events: {
        collapse: { detail: () => null },
        expand: { detail: () => null },
    },
    slot: {
        attribute: "label",
        config: "text",
    },
    form: buttonForm(),
    setup: setupFormButton,
};
export const extendedFabElement = defineElement(extendedFabSpec);
export const defineExtendedFab = (options) => extendedFabElement.define(options);
