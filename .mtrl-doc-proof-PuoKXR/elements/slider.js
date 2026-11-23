import createSlider from "../components/slider/index.js";
import { SLIDER_SIZES } from "../components/slider/constants.js";
import { defineElement } from "./define.js";
const COLORS = ["primary", "secondary", "tertiary", "error"];
const color = (value) => COLORS.find((c) => c === value) ?? "primary";
const size = (value) => {
    const pixels = Number(value);
    if (value !== null && value !== undefined && value !== "" && Number.isFinite(pixels))
        return pixels;
    const name = String(value ?? "").toUpperCase();
    return name in SLIDER_SIZES ? name : "XS";
};
const number = (value) => {
    const n = typeof value === "number" ? value : typeof value === "string" && value !== "" ? Number(value) : NaN;
    return Number.isFinite(n) ? n : null;
};
const setRange = (c, low, high) => {
    c.setSecondValue(c.getMax(), false);
    c.setValue(low, false);
    c.setSecondValue(high, false);
};
const nameHandles = (c, host) => {
    const name = host.getAttribute("aria-label") ?? c.getLabel();
    const handles = c.element.querySelectorAll('[role="slider"]');
    handles.forEach((handle, i) => {
        const text = name && handles.length > 1 ? `${name} ${i ? "maximum" : "minimum"}` : name;
        if (text)
            handle.setAttribute("aria-label", text);
        else
            handle.removeAttribute("aria-label");
    });
};
const detail = (payload) => {
    const { value, secondValue } = payload;
    return secondValue === null ? { value } : { value, secondValue };
};
const sliderSpec = {
    name: "slider",
    create: (config) => createSlider({
        ...config,
        showValue: config.showValue === true,
        ...(config.size !== undefined ? { size: size(config.size) } : {}),
        ...(config.color !== undefined ? { color: color(config.color) } : {}),
    }),
    styles: ["slider"],
    hostStyles: ':host{display:block}:host([orientation="vertical"]:not([hidden])){display:inline-block}',
    attributes: {
        value: { type: "number", config: "value", update: (c, v) => void c.setValue(number(v) ?? c.getMin(), false) },
        "second-value": {
            type: "number",
            config: "secondValue",
            update: (c, v) => void c.setSecondValue(number(v) ?? c.getMax(), false),
        },
        min: { type: "number", config: "min", update: (c, v) => void c.setMin(number(v) ?? 0) },
        max: { type: "number", config: "max", update: (c, v) => void c.setMax(number(v) ?? 100) },
        step: { type: "number", config: "step", update: (c, v) => void c.setStep(number(v) ?? 1) },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        range: { type: "boolean", config: "range" },
        centered: { type: "boolean", config: "centered" },
        ticks: { type: "boolean", config: "ticks", update: (c, v) => void c.showTicks(!!v) },
        "show-value": { type: "boolean", config: "showValue", update: (c, v) => void c.showCurrentValue(!!v) },
        color: { type: "string", config: "color", update: (c, v) => void c.setColor(color(v)) },
        size: { type: "string", config: "size", update: (c, v) => void c.setSize(size(v)) },
        orientation: { type: "string", config: "orientation" },
        "top-to-bottom": { type: "boolean", config: "topToBottom" },
        label: { type: "string", config: "label" },
        "label-position": { type: "string", config: "labelPosition" },
        icon: { type: "string", config: "icon" },
        "icon-position": { type: "string", config: "iconPosition" },
        "inset-icon": {
            type: "string",
            config: "insetIcon",
            update: (c, _v, host) => void c.setInsetIcon(host.getAttribute("inset-icon") ?? "", host.getAttribute("inset-icon-at-min") ?? ""),
        },
        "inset-icon-at-min": {
            type: "string",
            config: "insetIconAtMin",
            update: (c, _v, host) => void c.setInsetIcon(host.getAttribute("inset-icon") ?? "", host.getAttribute("inset-icon-at-min") ?? ""),
        },
        "aria-label": { type: "string", update: (c, _v, host) => nameHandles(c, host) },
    },
    properties: {
        value: {
            get: (c) => c.getValue(),
            set: (c, v) => {
                const n = number(v);
                if (n !== null)
                    c.setValue(n, false);
            },
            config: "value",
        },
        secondValue: {
            get: (c) => c.getSecondValue(),
            set: (c, v) => {
                const n = number(v);
                if (n !== null)
                    c.setSecondValue(n, false);
            },
        },
    },
    model: "value",
    defaults: ["secondValue"],
    events: {
        input: { detail },
        change: { detail },
    },
    form: {
        value: (c, host) => {
            const second = c.getSecondValue();
            if (second === null)
                return String(c.getValue());
            const name = host.getAttribute("name");
            if (!name)
                return null;
            const data = new FormData();
            data.append(name, String(c.getValue()));
            data.append(name, String(second));
            return data;
        },
        events: ["input", "change"],
        state: (c) => [c.getValue(), c.getSecondValue()].filter((v) => v !== null).join(" "),
        restore: (c, state) => {
            const [low, high] = state.split(" ").map(Number);
            if (!Number.isFinite(low))
                return;
            if (c.getSecondValue() !== null && Number.isFinite(high))
                setRange(c, low, high);
            else
                c.setValue(low, false);
        },
        disable: (c, disabled) => void (disabled ? c.disable() : c.enable()),
    },
    setup: (host, component) => nameHandles(component, host),
};
export const sliderElement = defineElement(sliderSpec);
export const defineSlider = (options) => sliderElement.define(options);
