import createRadios from "../components/radios/index.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
const declaredRadios = (host) => {
    const radioTag = host.localName.replace(/radios$/, "radio");
    const radios = [];
    for (const child of Array.from(host.children)) {
        if (child.localName !== radioTag)
            continue;
        const label = child.getAttribute("label") ?? (child.textContent ?? "").trim();
        radios.push({
            label,
            value: child.getAttribute("value") ?? label,
            disabled: child.hasAttribute("disabled"),
        });
    }
    return radios;
};
const readRadios = (host) => ({ options: declaredRadios(host) });
const select = (component, value) => {
    if (value === null || value === undefined || value === "") {
        component.setValue(null);
    }
    else {
        component.setValue(String(value));
    }
};
const applyRequired = (component, required) => {
    if (required)
        component.element.setAttribute("aria-required", "true");
    else
        component.element.removeAttribute("aria-required");
    for (const radio of component.radios)
        radio.input.required = required;
};
const isDisabled = (component) => component.element.classList.contains(`${component.getClass("radios")}--disabled`);
const updateRadios = (host, component) => {
    const declared = declaredRadios(host);
    const values = declared.map((radio) => radio.value);
    if (new Set(values).size !== values.length)
        return false;
    const current = component.radios.map((radio) => radio.config.value);
    const existing = new Set(current);
    const kept = current.filter((value) => values.includes(value));
    const firstNew = values.findIndex((value) => !existing.has(value));
    const declaredKept = (firstNew === -1 ? values : values.slice(0, firstNew)).filter((value) => existing.has(value));
    if (kept.join("\u0000") !== declaredKept.join("\u0000"))
        return false;
    if (firstNew !== -1 && values.slice(firstNew).some((value) => existing.has(value)))
        return false;
    for (const value of current)
        if (!values.includes(value))
            component.removeOption(value);
    const added = firstNew === -1 ? [] : declared.slice(firstNew);
    for (const option of added)
        component.addOption({ ...option });
    if (added.length && isDisabled(component))
        component.disable();
    if (added.length)
        applyRequired(component, host.hasAttribute("required"));
    const textClass = `${component.getClass("radios")}__text`;
    for (const config of declared) {
        const radio = component.radios.find((candidate) => candidate.config.value === config.value);
        if (!radio)
            continue;
        const text = radio.label.querySelector(`.${textClass}`);
        if (text && text.textContent !== config.label)
            text.textContent = config.label;
        radio.config.label = config.label;
        if (config.disabled && !radio.config.disabled)
            component.disableOption(config.value);
        else if (!config.disabled && radio.config.disabled)
            component.enableOption(config.value);
    }
    return true;
};
const validityControl = (component) => (component.radios.find((radio) => !radio.input.disabled) ?? component.radios[0])?.input ?? null;
const radiosSpec = {
    name: "radios",
    create: (config) => createRadios(config),
    styles: ["radios"],
    hostStyles: ":host{display:block}",
    attributes: {
        value: { type: "string", config: "value", update: (c, v) => select(c, v) },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        required: { type: "boolean", config: "required", update: (c, v) => applyRequired(c, !!v) },
        direction: { type: "string", config: "direction" },
        "aria-label": {
            type: "string",
            config: "ariaLabel",
            update: (c, v) => (v === null ? c.element.removeAttribute("aria-label") : c.element.setAttribute("aria-label", String(v))),
        },
    },
    properties: {
        value: { get: (c) => c.getValue(), set: (c, v) => select(c, v), config: "value" },
    },
    model: "value",
    events: {
        change: {
            detail: (payload) => ({ value: payload.value }),
        },
    },
    form: {
        value: (c) => c.getValue(),
        control: validityControl,
        events: ["change"],
        activate: (c) => validityControl(c)?.focus(),
        state: (c) => c.getValue() ?? "",
        restore: (c, state) => select(c, state),
        disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
    },
    config: readRadios,
    setup: (host, c) => applyRequired(c, host.hasAttribute("required")),
    observeChildren: updateRadios,
};
export const radiosElement = defineElement(radiosSpec);
export const radioDeclaration = {
    name: "radio",
    attributes: {
        value: { type: "string" },
        label: { type: "string" },
        disabled: { type: "boolean" },
    },
};
export const defineRadios = (options) => {
    const radioTag = `${options?.prefix ?? DEFAULT_PREFIX}-${radioDeclaration.name}`;
    if (!customElements.get(radioTag))
        customElements.define(radioTag, createDeclarationClass(radioDeclaration.attributes));
    return radiosElement.define(options);
};
