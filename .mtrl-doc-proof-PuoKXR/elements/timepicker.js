import createTimePicker from "../components/timepicker/index.js";
import { TIME_FORMAT, TIME_PICKER_ORIENTATION, TIME_PICKER_TYPE, } from "../components/timepicker/types.js";
import { createEmitter } from "../core/state/emitter.js";
import { defineElement } from "./define.js";
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const steps = (step) => {
    if (!step || step <= 0)
        return {};
    if (step < 60)
        return { showSeconds: true, secondStep: Math.round(step) || 1 };
    return { minuteStep: Math.round(step / 60) };
};
const create = (config) => {
    const { step, required, value, ...rest } = config;
    const initial = value && TIME.test(value) ? value : "";
    const picker = createTimePicker({ ...rest, ...steps(step), value: initial || undefined });
    const changes = createEmitter();
    let empty = !initial;
    const onChange = (event) => {
        empty = false;
        changes.emit("change", event);
    };
    const onInput = (event) => {
        changes.emit("input", { value: empty ? "" : event.value, draftValue: event.draftValue });
    };
    const onConfirm = (event) => {
        if (empty)
            onChange(event);
    };
    picker.on("change", onChange);
    picker.on("input", onInput);
    picker.on("confirm", onConfirm);
    return {
        element: picker.element,
        picker,
        getValue: () => (empty ? "" : picker.getValue()),
        setValue: (next) => {
            if (next && TIME.test(next)) {
                empty = false;
                picker.setValue(next);
            }
            else {
                empty = true;
            }
        },
        show: () => void picker.open(),
        close: () => void picker.close(),
        isOpen: picker.isOpen,
        required: !!required,
        on: (event, handler) => void (event === "change" || event === "input" ? changes.on(event, handler) : picker.on(event, handler)),
        off: (event, handler) => void (event === "change" || event === "input" ? changes.off(event, handler) : picker.off(event, handler)),
        destroy: () => {
            picker.off("change", onChange);
            picker.off("input", onInput);
            picker.off("confirm", onConfirm);
            changes.clear();
            picker.destroy();
        },
    };
};
const hosts = new WeakMap();
let missing = null;
const valueMissingMessage = () => (missing ??= Object.assign(document.createElement("input"), { type: "time", required: true }).validationMessage ||
    "Please fill out this field.");
const validate = (c) => {
    const internals = hosts.get(c)?.internals;
    if (!internals)
        return;
    if (c.required && !c.getValue())
        internals.setValidity({ valueMissing: true }, valueMissingMessage());
    else
        internals.setValidity({});
};
const setValue = (c, value) => {
    c.setValue(value === null || value === undefined ? "" : String(value));
    validate(c);
};
const setDisabled = (c, disabled) => void (disabled ? c.picker.disable() : c.picker.enable());
const setOpen = (c, open, host) => {
    if (open)
        c.show();
    else
        c.close();
    host.toggleAttribute("open", c.isOpen());
};
const timepickerSpec = {
    name: "timepicker",
    create: (config) => create(config),
    styles: ["timepicker"],
    hostStyles: ":host{display:contents}",
    attributes: {
        value: { type: "string", config: "value", update: (c, v) => setValue(c, v) },
        format: {
            type: "string",
            config: "format",
            update: (c, v) => void c.picker.setFormat(v === "24h" ? TIME_FORMAT.MILITARY : TIME_FORMAT.AMPM),
        },
        type: {
            type: "string",
            config: "type",
            update: (c, v) => void c.picker.setType(v === "input" ? TIME_PICKER_TYPE.INPUT : TIME_PICKER_TYPE.DIAL),
        },
        orientation: {
            type: "string",
            config: "orientation",
            update: (c, v) => void c.picker.setOrientation(v === "horizontal" ? TIME_PICKER_ORIENTATION.HORIZONTAL : TIME_PICKER_ORIENTATION.VERTICAL),
        },
        min: { type: "string", config: "minTime" },
        max: { type: "string", config: "maxTime" },
        step: { type: "number", config: "step" },
        "show-seconds": { type: "boolean", config: "showSeconds" },
        label: { type: "string", config: "title", update: (c, v) => void c.picker.setTitle(v === null ? "" : String(v)) },
        "aria-label": { type: "string", config: "ariaLabel", update: (c, v) => void c.picker.setAriaLabel(v === null ? "" : String(v)) },
        required: {
            type: "boolean",
            config: "required",
            update: (c, v) => {
                c.required = !!v;
                validate(c);
            },
        },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => setDisabled(c, !!v) },
        open: { type: "boolean", update: (c, v, host) => setOpen(c, !!v, host) },
    },
    properties: {
        value: { get: (c) => c.getValue(), set: setValue },
    },
    model: "value",
    methods: ["show", "close"],
    events: {
        change: { detail: (payload) => ({ value: payload.value }) },
        input: { detail: (payload) => ({ value: payload.value, draftValue: payload.draftValue }) },
        confirm: { detail: (payload) => ({ value: payload.value }) },
        open: { detail: () => null, state: true },
        close: { detail: () => null, state: true },
    },
    form: {
        value: (c) => c.getValue(),
        events: ["change"],
        activate: (c) => c.show(),
        state: (c) => c.getValue(),
        restore: (c, state) => setValue(c, state),
        disable: (c, disabled) => setDisabled(c, disabled),
    },
    setup: (host, c) => {
        hosts.set(c, host);
        validate(c);
        const reflect = () => void host.toggleAttribute("open", c.isOpen());
        const onChange = () => validate(c);
        c.on("open", reflect);
        c.on("close", reflect);
        c.on("change", onChange);
        const stop = (event) => event.stopPropagation();
        c.element.addEventListener("input", stop);
        if (host.hasAttribute("open"))
            setOpen(c, true, host);
        return () => {
            c.off("open", reflect);
            c.off("close", reflect);
            c.off("change", onChange);
            c.element.removeEventListener("input", stop);
        };
    },
};
export const timepickerElement = defineElement(timepickerSpec);
export const defineTimepicker = (options) => timepickerElement.define(options);
