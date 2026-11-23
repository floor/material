import createSplitButton from "../components/split-button/index.js";
import { innerMenu } from "../components/menu/inner.js";
import { defineElement } from "./define.js";
import { buttonAria, syncButtonAria } from "./form-button.js";
import { declaredMenuItems, defineMenuItem } from "./menu.js";
const ALIASES = {
    open: ["expand"],
    close: ["collapse"],
};
const itemTag = (host) => host.localName.replace(/split-button$/, "menu-item");
const labelOf = (host) => host.getAttribute("label") ??
    Array.from(host.childNodes)
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent ?? "")
        .join("")
        .trim();
const applied = new WeakMap();
const create = (config) => {
    const button = createSplitButton({ ...config, layer: "top" });
    const { on, off } = button;
    const component = Object.assign(button, {
        on: (event, handler) => {
            for (const name of ALIASES[event] ?? [event])
                on(name, handler);
            return component;
        },
        off: (event, handler) => {
            for (const name of ALIASES[event] ?? [event])
                off(name, handler);
            return component;
        },
    });
    applied.set(component, JSON.stringify(config.items ?? []));
    return component;
};
const readSplitButton = (host) => {
    const items = declaredMenuItems(host, itemTag(host));
    return { text: labelOf(host), ...(items.length ? { items } : {}) };
};
const updateSplitButton = (host, c) => {
    const items = declaredMenuItems(host, itemTag(host));
    const menu = innerMenu(c);
    if (!items.length !== !menu)
        return false;
    const label = labelOf(host);
    if (c.getText() !== label)
        c.setText(label);
    const key = JSON.stringify(items);
    if (menu && applied.get(c) !== key) {
        applied.set(c, key);
        c.setItems(items);
    }
    return true;
};
const splitButtonSpec = {
    name: "split-button",
    ssr: (host) => {
        const item = host.localName.replace(/split-button$/, "menu-item");
        return !host.querySelector(`${item} ${item}`);
    },
    create: (config) => create(config),
    styles: ["progress", "button", "menu", "split-button"],
    hostStyles: ":host{display:inline-flex;vertical-align:middle}",
    attributes: {
        label: { type: "string", update: (c, _v, host) => void c.setText(labelOf(host)) },
        icon: { type: "string", config: "icon", update: (c, v) => void c.setIcon(v === null ? "" : String(v)) },
        variant: { type: "string", config: "variant" },
        size: { type: "string", config: "size" },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => void (v ? c.disable() : c.enable()) },
        "trailing-label": { type: "string", config: "trailingLabel" },
        "group-label": { type: "string", config: "groupLabel" },
        ...buttonAria,
        "aria-label": {
            type: "string",
            config: "ariaLabel",
            update: (c, v) => v === null ? c.leadingElement.removeAttribute("aria-label") : c.leadingElement.setAttribute("aria-label", String(v)),
        },
    },
    events: {
        open: { detail: () => ({}), state: true },
        close: { detail: () => ({}), state: true },
        select: {
            detail: (payload) => {
                const item = payload.item;
                return { value: item && "id" in item ? (item.id ?? null) : null };
            },
        },
    },
    config: readSplitButton,
    setup: (host, c) => {
        syncButtonAria(host, c);
        const contain = (event) => {
            if (!c.leadingElement.contains(event.target))
                event.stopPropagation();
        };
        c.element.addEventListener("click", contain);
        return () => c.element.removeEventListener("click", contain);
    },
    observeChildren: updateSplitButton,
};
export const splitButtonElement = defineElement(splitButtonSpec);
export const defineSplitButton = (options) => {
    defineMenuItem(options);
    return splitButtonElement.define(options);
};
