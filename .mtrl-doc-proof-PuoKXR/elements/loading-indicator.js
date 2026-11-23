import createLoadingIndicator from "../components/loading-indicator/index.js";
import { LOADING_INDICATOR_DEFAULTS } from "../components/loading-indicator/constants.js";
import { defineElement } from "./define.js";
const loadingIndicatorSpec = {
    name: "loading-indicator",
    create: (config) => createLoadingIndicator(config),
    styles: ["loading-indicator"],
    hostStyles: ":host{display:inline-flex;vertical-align:middle}",
    attributes: {
        size: {
            type: "number",
            config: "size",
            update: (c, v) => void c.setSize(v === null ? LOADING_INDICATOR_DEFAULTS.SIZE : Number(v)),
        },
        contained: { type: "boolean", config: "contained" },
        value: { type: "number", config: "value", update: (c, v) => void c.setValue(v === null ? null : Number(v)) },
        "aria-label": {
            type: "string",
            config: "ariaLabel",
            update: (c, v) => void c.setLabel(v === null ? LOADING_INDICATOR_DEFAULTS.LABEL : String(v)),
        },
    },
    methods: ["start", "stop"],
};
export const loadingIndicatorElement = defineElement(loadingIndicatorSpec);
export const defineLoadingIndicator = (options) => loadingIndicatorElement.define(options);
