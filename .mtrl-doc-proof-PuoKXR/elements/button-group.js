import createButtonGroup from "../components/button-group/index.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
const parse = (value, multi) => {
    if (value === null || value === undefined || value === "")
        return [];
    const all = Array.isArray(value)
        ? value.map(String)
        : multi
            ? String(value).split(",").map((part) => part.trim()).filter(Boolean)
            : [String(value)];
    return multi ? all : all.slice(0, 1);
};
const declaredItems = (host) => {
    const itemTag = `${host.localName}-item`;
    const items = [];
    for (const child of Array.from(host.children)) {
        if (child.localName !== itemTag)
            continue;
        const text = child.getAttribute("label") ?? (child.textContent ?? "").trim();
        const icon = child.getAttribute("icon") ?? undefined;
        const ariaLabel = child.getAttribute("aria-label") ?? undefined;
        const value = child.getAttribute("value") ?? (text || ariaLabel || String(items.length));
        const base = {
            value,
            icon,
            selectedIcon: child.getAttribute("selected-icon") ?? undefined,
            disabled: child.hasAttribute("disabled"),
            selected: child.hasAttribute("selected"),
        };
        items.push(text || !icon ? { ...base, text, ariaLabel } : { ...base, ariaLabel: ariaLabel ?? value });
    }
    return items;
};
const applied = new WeakMap();
const readGroup = (host) => {
    const items = declaredItems(host);
    const multi = host.getAttribute("selection") === "multi";
    const chosen = host.hasAttribute("value")
        ? parse(host.getAttribute("value"), multi)
        : parse(items.filter((item) => item.selected).map((item) => item.value), multi);
    applied.set(host, items);
    return { buttons: items.map((item) => ({ ...item, selected: chosen.includes(item.value) })) };
};
const model = (c) => {
    const selection = c.getSelection();
    if (selection === "none")
        return null;
    const selected = c.getSelected();
    return selection === "multi" ? selected : (selected[0] ?? null);
};
const select = (c, value) => {
    const selection = c.getSelection();
    if (selection === "none")
        return;
    const wanted = parse(value, selection === "multi");
    for (const next of wanted)
        c.select(next);
    for (const current of c.getSelected())
        if (!wanted.includes(current))
            c.deselect(current);
};
const applyDisabled = (host, c, items) => {
    const group = host.hasAttribute("disabled");
    items.forEach((item, index) => void (group || item.disabled ? c.disableButton(index) : c.enableButton(index)));
};
const updateGroup = (host, component) => {
    const items = declaredItems(host);
    const previous = applied.get(host) ?? [];
    if (items.length !== previous.length || items.length !== component.buttons.length)
        return false;
    for (const [index, item] of items.entries()) {
        const before = previous[index];
        if (item.value !== before.value || !item.text !== !before.text || item.selectedIcon !== before.selectedIcon)
            return false;
        if (item.selected !== before.selected && !host.hasAttribute("value"))
            return false;
        if (item.ariaLabel === undefined && before.ariaLabel !== undefined)
            return false;
    }
    for (const [index, item] of items.entries()) {
        const before = previous[index];
        const button = component.buttons[index];
        if (item.text && item.text !== before.text)
            button.setText(item.text);
        if (item.icon !== before.icon)
            button.setIcon(item.icon ?? "");
        if (item.ariaLabel !== undefined && item.ariaLabel !== before.ariaLabel)
            button.setAriaLabel(item.ariaLabel);
    }
    applied.set(host, items);
    applyDisabled(host, component, items);
    return true;
};
const buttonGroupSpec = {
    name: "button-group",
    create: (config) => createButtonGroup(config),
    styles: ["progress", "button", "icon-button", "button-group"],
    hostStyles: ":host{display:inline-flex}",
    attributes: {
        variant: { type: "string", config: "variant", update: (c, v) => void c.setVariant(String(v ?? "outlined")) },
        kind: { type: "string", config: "kind" },
        selection: { type: "string", config: "selection" },
        required: { type: "boolean", config: "required" },
        size: { type: "string", config: "size" },
        shape: { type: "string", config: "shape" },
        labels: { type: "string", config: "labels" },
        orientation: {
            type: "string",
            config: "orientation",
            update: (c, v) => void c.setOrientation(v === "vertical" ? "vertical" : "horizontal"),
        },
        density: { type: "string", config: "density", update: (c, v) => void c.setDensity(String(v ?? "default")) },
        "equal-width": { type: "boolean", config: "equalWidth" },
        "expanded-ratio": { type: "number", config: "expandedRatio" },
        disabled: {
            type: "boolean",
            config: "disabled",
            update: (c, v, host) => {
                if (v)
                    c.disable();
                else
                    c.enable();
                applyDisabled(host, c, applied.get(host) ?? []);
            },
        },
        "aria-label": {
            type: "string",
            config: "ariaLabel",
            update: (c, v) => c.element.setAttribute("aria-label", v === null ? "Button group" : String(v)),
        },
        value: { type: "string", update: (c, v) => select(c, v) },
    },
    properties: {
        value: { get: (c) => model(c), set: (c, v) => select(c, v) },
    },
    model: "value",
    events: {
        change: {
            detail: (payload) => ({ value: model(payload.buttonGroup) }),
        },
        action: {
            detail: (payload) => payload,
            state: true,
        },
    },
    config: readGroup,
    setup: (host, component) => {
        const onClick = (event) => {
            const value = applied.get(host)?.[event.index]?.value ?? String(event.index);
            host.dispatchEvent(new CustomEvent("action", { detail: { value, index: event.index }, bubbles: true, composed: true }));
        };
        component.on("click", onClick);
        return () => void component.off("click", onClick);
    },
    observeChildren: updateGroup,
};
export const buttonGroupElement = defineElement(buttonGroupSpec);
export const buttonGroupItemDeclaration = {
    name: "button-group-item",
    attributes: {
        value: { type: "string" },
        label: { type: "string" },
        icon: { type: "string" },
        "selected-icon": { type: "string" },
        "aria-label": { type: "string" },
        disabled: { type: "boolean" },
        selected: { type: "boolean" },
    },
};
export const defineButtonGroup = (options) => {
    const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${buttonGroupItemDeclaration.name}`;
    if (!customElements.get(itemTag))
        customElements.define(itemTag, createDeclarationClass(buttonGroupItemDeclaration.attributes));
    return buttonGroupElement.define(options);
};
