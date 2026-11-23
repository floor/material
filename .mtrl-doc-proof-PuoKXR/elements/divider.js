import { createDivider } from "../components/divider/index.js";
import { defineElement } from "./define.js";
const variant = (value) => (value === "inset" || value === "middle-inset" ? value : "full-width");
const dividerSpec = {
    name: "divider",
    create: (config) => createDivider(config),
    styles: ["divider"],
    hostStyles: ':host{display:block}:host([orientation="vertical"]:not([hidden])){display:inline-block;align-self:stretch}',
    attributes: {
        orientation: {
            type: "string",
            config: "orientation",
            update: (c, v) => void c.setOrientation(v === "vertical" ? "vertical" : "horizontal"),
        },
        variant: { type: "string", config: "variant", update: (c, v) => void c.setVariant(variant(v)) },
        "inset-start": { type: "number", config: "insetStart" },
        "inset-end": { type: "number", config: "insetEnd" },
        thickness: { type: "number", config: "thickness", update: (c, v) => void c.setThickness(Number(v ?? 1)) },
        color: { type: "string", config: "color", update: (c, v) => void c.setColor(String(v ?? "")) },
    },
};
export const dividerElement = defineElement(dividerSpec);
export const defineDivider = (options) => dividerElement.define(options);
