import createTextField from "../components/text-field/index.js";
import { checkTrailingLabel } from "../components/text-field/api.js";
import { defineElement } from "./define.js";
const create = (config) => {
    const field = createTextField(config);
    const input = field.input;
    if (config.ariaLabel)
        input.setAttribute("aria-label", config.ariaLabel);
    return Object.assign(field, { select: () => input.select() });
};
const inputAttribute = (name) => (c, v) => {
    if (v === null || v === false)
        c.removeAttribute(name);
    else
        c.setAttribute(name, v === true ? "" : String(v));
};
const textFieldSpec = {
    name: "text-field",
    create: (config) => create(config),
    styles: ["text-field"],
    hostStyles: ":host>*{width:100%}:host([type='hidden' i]){display:none}",
    attributes: {
        variant: {
            type: "string",
            config: "variant",
            update: (c, v) => void c.setVariant(v === "outlined" ? "outlined" : "filled"),
        },
        density: { type: "string", config: "density", update: (c, v) => void c.setDensity(String(v ?? "default")) },
        label: { type: "string", config: "label" },
        type: { type: "string", config: "type" },
        value: {
            type: "string",
            config: "value",
            update: (c, v) => {
                c.input.defaultValue = String(v ?? "");
                c.updatePositions();
            },
        },
        placeholder: { type: "string", config: "placeholder", update: (c, v) => void c.setAttribute("placeholder", String(v || " ")) },
        "supporting-text": {
            type: "string",
            config: "supportingText",
            update: (c, v) => void (v ? c.setSupportingText(String(v), c.isError()) : c.removeSupportingText()),
        },
        "prefix-text": {
            type: "string",
            config: "prefixText",
            update: (c, v) => void (v ? c.setPrefixText(String(v)) : c.removePrefixText()),
        },
        "suffix-text": {
            type: "string",
            config: "suffixText",
            update: (c, v) => void (v ? c.setSuffixText(String(v)) : c.removeSuffixText()),
        },
        "leading-icon": {
            type: "string",
            config: "leadingIcon",
            update: (c, v) => void (v ? c.setLeadingIcon(String(v)) : c.removeLeadingIcon()),
        },
        "trailing-icon": {
            type: "string",
            config: "trailingIcon",
            update: (c, v, host) => void (v ? c.setTrailingIcon(String(v), host.getAttribute("trailing-icon-label") ?? "") : c.removeTrailingIcon()),
        },
        "trailing-icon-label": {
            type: "string",
            config: "trailingIconLabel",
            update: (c, v, host) => {
                const icon = host.getAttribute("trailing-icon");
                if (!icon)
                    return;
                c.setTrailingIcon(icon, v === null ? "" : String(v));
            },
        },
        maxlength: { type: "number", config: "maxLength", update: inputAttribute("maxlength") },
        pattern: { type: "string", config: "pattern", update: inputAttribute("pattern") },
        required: { type: "boolean", config: "required", update: (c, v) => void c.setRequired(!!v) },
        readonly: { type: "boolean", config: "readonly", update: inputAttribute("readonly") },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        error: { type: "boolean", config: "error", update: (c, v) => void c.setError(!!v) },
        autocomplete: { type: "string", config: "autocomplete", update: inputAttribute("autocomplete") },
        inputmode: { type: "string", config: "inputMode", update: inputAttribute("inputmode") },
        enterkeyhint: { type: "string", config: "enterKeyHint", update: inputAttribute("enterkeyhint") },
        "aria-label": { type: "string", config: "ariaLabel", update: inputAttribute("aria-label") },
    },
    properties: {
        value: { get: (c) => c.getValue(), set: (c, v) => void c.setValue(String(v ?? "")) },
    },
    methods: ["select", "setError"],
    model: "value",
    events: {
        input: { detail: (payload) => ({ value: payload.value }) },
        change: { detail: (payload) => ({ value: payload.value }) },
        trailing: {
            detail: (payload) => {
                const { value, event } = payload;
                return { value, event };
            },
            state: true,
        },
    },
    form: {
        value: (c) => c.getValue(),
        control: (c) => c.input,
        events: ["input", "change"],
        activate: (c) => c.input.focus(),
        state: (c) => c.getValue(),
        restore: (c, state) => void c.setValue(state),
        disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
    },
    setup: (_host, c) => {
        const stop = (event) => event.stopPropagation();
        c.input.addEventListener("input", stop);
        return () => c.input.removeEventListener("input", stop);
    },
};
if ( /*#__PURE__*/(() => {
    try {
        return process.env.NODE_ENV !== "production";
    }
    catch {
        return false;
    }
})() && process.env.NODE_ENV !== "production")
    Object.assign(textFieldSpec.events.trailing, {
        listen: (host) => {
            if (host.getAttribute("trailing-icon") && !host.getAttribute("trailing-icon-label"))
                checkTrailingLabel(host);
        },
    });
export const textFieldElement = defineElement(textFieldSpec);
export const defineTextField = (options) => textFieldElement.define(options);
