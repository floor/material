import createProgress from "../components/progress/index.js";
import { defineElement } from "./define.js";
const thickness = (value) => {
    if (value === "thick")
        return "thick";
    const pixels = Number(value);
    return value !== null && value !== undefined && value !== "" && Number.isFinite(pixels) ? pixels : "thin";
};
const progressSpec = {
    name: "progress",
    create: (config) => createProgress({
        ...config,
        ...(config.thickness !== undefined ? { thickness: thickness(config.thickness) } : {}),
    }),
    styles: ["progress"],
    hostStyles: ':host{display:block}:host([variant="circular"]:not([hidden])){display:inline-flex;vertical-align:middle}',
    attributes: {
        variant: { type: "string", config: "variant" },
        value: { type: "number", config: "value", update: (c, v) => void c.setValue(Number(v ?? 0)) },
        max: { type: "number", config: "max" },
        buffer: { type: "number", config: "buffer", update: (c, v) => void c.setBuffer(Number(v ?? 0)) },
        indeterminate: { type: "boolean", config: "indeterminate", update: (c, v) => void c.setIndeterminate(!!v) },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        shape: {
            type: "string",
            config: "shape",
            update: (c, v) => void c.setShape((v === "wavy" ? "wavy" : "flat")),
        },
        thickness: { type: "string", config: "thickness", update: (c, v) => void c.setThickness(thickness(v)) },
        size: { type: "number", config: "size" },
        "show-label": { type: "boolean", config: "showLabel", update: (c, v) => void (v ? c.showLabel() : c.hideLabel()) },
        "aria-label": { type: "string", config: "ariaLabel" },
    },
    properties: {
        value: { get: (c) => c.getValue(), set: (c, v) => void c.setValue(Number(v ?? 0)), config: "value" },
        indeterminate: { get: (c) => c.isIndeterminate(), set: (c, v) => void c.setIndeterminate(!!v), config: "indeterminate" },
    },
};
export const progressElement = defineElement(progressSpec);
export const defineProgress = (options) => progressElement.define(options);
