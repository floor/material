import createSelect from "../components/select/index.js";
import { innerMenu } from "../components/menu/inner.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
const declaredOptions = (host) => {
    const optionTag = `${host.localName}-option`;
    const options = [];
    for (const child of Array.from(host.children)) {
        if (child.localName !== optionTag)
            continue;
        const text = child.getAttribute("label") ?? (child.textContent ?? "").trim();
        options.push({
            id: child.getAttribute("value") ?? text,
            text,
            icon: child.getAttribute("icon") ?? undefined,
            disabled: child.hasAttribute("disabled"),
        });
    }
    return options;
};
const hosts = new WeakMap();
const applied = new WeakMap();
let missing = null;
const valueMissingMessage = () => (missing ??= Object.assign(document.createElement("select"), { required: true }).validationMessage ||
    "Please select an item in the list.");
const validate = (c) => {
    const internals = hosts.get(c)?.internals;
    if (!internals)
        return;
    if (c.textField.input.required && c.getValue() === null) {
        internals.setValidity({ valueMissing: true }, valueMissingMessage(), c.textField.input);
    }
    else {
        internals.setValidity({});
    }
};
const setValue = (c, value) => {
    c.setValue(value === null || value === undefined ? null : String(value));
    validate(c);
};
const inputAttribute = (name) => (c, v) => {
    if (v === null || v === false)
        c.textField.input.removeAttribute(name);
    else
        c.textField.input.setAttribute(name, v === true ? "" : String(v));
};
const create = (config) => {
    const { ariaLabel, ...rest } = config;
    const select = createSelect({ ...rest, layer: "top" });
    applied.set(select, JSON.stringify(select.getOptions()));
    if (ariaLabel)
        select.textField.input.setAttribute("aria-label", ariaLabel);
    return select;
};
const updateOptions = (host, c) => {
    const options = declaredOptions(host);
    const key = JSON.stringify(options);
    if (applied.get(c) === key)
        return true;
    applied.set(c, key);
    const value = c.getValue();
    c.setOptions(options);
    if (value !== null && options.some((option) => option.id === value))
        c.setValue(value);
    validate(c);
    return true;
};
const selectSpec = {
    name: "select",
    create: (config) => create(config),
    styles: ["text-field", "menu", "select"],
    hostStyles: ":host{display:inline-flex}:host>:first-child{width:100%}",
    attributes: {
        variant: {
            type: "string",
            config: "variant",
            update: (c, v) => void c.textField.setVariant((v === "outlined" ? "outlined" : "filled")),
        },
        density: { type: "string", config: "density", update: (c, v) => void c.setDensity(String(v ?? "default")) },
        label: { type: "string", config: "label" },
        value: { type: "string", config: "value", update: (c, v) => setValue(c, v) },
        placement: {
            type: "string",
            config: "placement",
            update: (c, v) => void innerMenu(c)?.setPosition((v ?? "bottom-start")),
        },
        "supporting-text": {
            type: "string",
            config: "supportingText",
            update: (c, v) => {
                const field = c.textField;
                if (v)
                    field.setSupportingText(String(v), field.isError());
                else
                    field.removeSupportingText().setError(field.isError(), "");
            },
        },
        required: {
            type: "boolean",
            config: "required",
            update: (c, v) => {
                inputAttribute("required")(c, v);
                validate(c);
            },
        },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        error: { type: "boolean", config: "error", update: (c, v) => void c.setError(!!v) },
        "aria-label": { type: "string", config: "ariaLabel", update: inputAttribute("aria-label") },
    },
    properties: {
        value: { get: (c) => c.getValue(), set: setValue },
    },
    model: "value",
    events: {
        change: { detail: (payload) => ({ value: payload.value }) },
    },
    form: {
        value: (c) => c.getValue(),
        events: ["change"],
        activate: (c) => c.textField.input.focus(),
        state: (c) => c.getValue() ?? "",
        restore: (c, state) => setValue(c, state || null),
        disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
    },
    config: (host) => ({ options: declaredOptions(host) }),
    setup: (host, c) => {
        hosts.set(c, host);
        validate(c);
        const onChange = () => validate(c);
        c.on("change", onChange);
        return () => void c.off("change", onChange);
    },
    observeChildren: updateOptions,
};
export const selectElement = defineElement(selectSpec);
export const selectOptionDeclaration = {
    name: "select-option",
    attributes: {
        value: { type: "string" },
        label: { type: "string" },
        icon: { type: "string" },
        disabled: { type: "boolean" },
    },
};
export const defineSelect = (options) => {
    const optionTag = `${options?.prefix ?? DEFAULT_PREFIX}-${selectOptionDeclaration.name}`;
    if (!customElements.get(optionTag)) {
        customElements.define(optionTag, createDeclarationClass(selectOptionDeclaration.attributes));
    }
    return selectElement.define(options);
};
