import createSnackbar from "../components/snackbar/index.js";
import { defineElement } from "./define.js";
const messageOf = (host) => host.getAttribute("message") ?? (host.textContent ?? "").trim();
const duration = (value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    const ms = Number(value);
    return Number.isFinite(ms) ? ms : String(value);
};
const snackbarSpec = {
    name: "snackbar",
    create: (config) => createSnackbar({
        ...config,
        message: typeof config.message === "string" && config.message ? config.message : " ",
        duration: duration(config.duration),
        layer: "top",
    }),
    styles: ["progress", "button", "icon-button", "snackbar"],
    hostStyles: ":host{display:contents}",
    attributes: {
        message: { type: "string", config: "message", update: (c, _v, host) => void c.setMessage(messageOf(host)) },
        action: { type: "string", config: "action" },
        dismissible: { type: "boolean", config: "dismissible" },
        "close-label": { type: "string", config: "closeLabel" },
        duration: { type: "string", config: "duration", update: (c, v) => void c.setDuration(duration(v) ?? "short") },
        position: {
            type: "string",
            config: "position",
            update: (c, v) => void c.setPosition((v ?? "center")),
        },
        "queue-behavior": { type: "string", config: "queueBehavior" },
        "focus-shortcut": { type: "string", config: "focusShortcut" },
    },
    properties: {
        open: { get: (c) => c.isOpen(), set: (c, v) => void (v ? c.show() : c.hide()) },
    },
    methods: ["show", "hide"],
    events: {
        open: { detail: () => null, state: true },
        action: { detail: () => null },
        close: { detail: (event) => ({ reason: event.reason }), state: true },
        focus: { detail: () => null },
    },
    config: (host) => (host.hasAttribute("message") ? {} : { message: messageOf(host) }),
    setup: (host, component) => {
        if (component.getMessage() !== messageOf(host))
            component.setMessage(messageOf(host));
    },
    observeChildren: (host, component) => {
        if (!host.hasAttribute("message"))
            component.setMessage(messageOf(host));
        return true;
    },
};
export const snackbarElement = defineElement(snackbarSpec);
export const defineSnackbar = (options) => snackbarElement.define(options);
