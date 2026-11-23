import createDatePicker from "../components/datepicker/index.js";
import { toIsoValue } from "../components/datepicker/utils.js";
import { defineElement } from "./define.js";
const toValue = toIsoValue;
const hosts = new WeakMap();
let missing = null;
const valueMissingMessage = () => (missing ??= Object.assign(document.createElement("input"), { type: "date", required: true }).validationMessage ||
    "Please fill out this field.");
const validate = (c) => {
    const internals = hosts.get(c)?.internals;
    if (!internals)
        return;
    if (!c.checkValidity())
        internals.setValidity({ valueMissing: true }, valueMissingMessage(), c.input);
    else
        internals.setValidity({});
};
const setValue = (c, value) => {
    const text = value === null || value === undefined ? "" : String(value);
    const [start, end] = text.split("/");
    if (start)
        c.setValue(end === undefined ? start : [start, end]);
    const held = c.getValue();
    const expected = Array.isArray(held) && end === undefined ? `${text}/${text}` : text;
    if (held !== null && toValue(held) !== expected)
        c.clear();
    validate(c);
};
const create = (config) => {
    const { value, ...rest } = config;
    const picker = createDatePicker(rest);
    const component = Object.assign(picker, {
        show: () => void picker.open(),
    });
    if (value)
        setValue(component, value);
    return component;
};
const isOpen = (c) => !!c.element.querySelector("dialog")?.open;
const setOpen = (c, open, host) => {
    if (open)
        c.show();
    else
        c.close();
    host.toggleAttribute("open", isOpen(c));
};
const datepickerSpec = {
    name: "datepicker",
    create: (config) => create(config),
    styles: ["datepicker"],
    hostStyles: ":host{display:inline-flex}",
    attributes: {
        variant: { type: "string", config: "variant" },
        "selection-mode": { type: "string", config: "selectionMode" },
        value: { type: "string", config: "value", update: (c, v) => setValue(c, v) },
        min: { type: "string", config: "minDate" },
        max: { type: "string", config: "maxDate" },
        "date-format": { type: "string", config: "dateFormat" },
        locale: { type: "string", config: "locale" },
        "initial-view": { type: "string", config: "initialView" },
        "close-on-select": { type: "boolean", config: "closeOnSelect" },
        label: { type: "string", config: "label" },
        "aria-label": { type: "string", config: "ariaLabel", update: (c, v) => void c.setAriaLabel(v === null ? "" : String(v)) },
        "supporting-text": {
            type: "string",
            config: "supportingText",
            update: (c, v) => void c.setSupportingText(v === null ? null : String(v)),
        },
        required: {
            type: "boolean",
            config: "required",
            update: (c, v) => {
                c.setRequired(!!v);
                validate(c);
            },
        },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        readonly: { type: "boolean", config: "readOnly", update: (c, v) => void c.setReadOnly(!!v) },
        open: { type: "boolean", update: (c, v, host) => setOpen(c, !!v, host) },
    },
    properties: {
        value: { get: (c) => toValue(c.getValue()), set: setValue },
    },
    model: "value",
    methods: ["show", "close"],
    events: {
        change: {
            detail: (payload) => {
                const { value, rangeEndDate } = payload;
                const date = Array.isArray(value) ? value : value && rangeEndDate ? [value, rangeEndDate] : (value ?? null);
                return { value: toValue(value, rangeEndDate), date };
            },
        },
        open: { detail: () => null, state: true },
        close: { detail: () => null, state: true },
    },
    form: {
        value: (c) => toValue(c.getValue()),
        events: ["change"],
        activate: (c) => c.input.focus(),
        state: (c) => toValue(c.getValue()),
        restore: (c, state) => setValue(c, state),
        disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
    },
    setup: (host, c) => {
        hosts.set(c, host);
        validate(c);
        const reflect = () => void host.toggleAttribute("open", isOpen(c));
        const onChange = () => validate(c);
        c.on("open", reflect);
        c.on("close", reflect);
        c.on("change", onChange);
        if (host.hasAttribute("open"))
            setOpen(c, true, host);
        return () => {
            c.off("open", reflect);
            c.off("close", reflect);
            c.off("change", onChange);
        };
    },
};
export const datepickerElement = defineElement(datepickerSpec);
export const defineDatepicker = (options) => datepickerElement.define(options);
