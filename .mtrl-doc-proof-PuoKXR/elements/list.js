import createList from "../components/list/index.js";
import { safeUrl } from "../core/utils/url.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
const defaultSelected = new WeakMap();
const modes = new WeakMap();
const itemSlot = (child, position) => {
    const icon = child.getAttribute(`${position}-icon`);
    if (icon !== null)
        return { type: "icon", content: icon };
    if (position === "trailing") {
        const text = child.getAttribute("trailing-text");
        return text === null ? undefined : { type: "text", content: text };
    }
    const avatar = child.getAttribute("leading-avatar");
    if (avatar !== null)
        return { type: "avatar", content: avatar };
    const src = child.getAttribute("leading-image");
    if (src === null)
        return undefined;
    const image = document.createElement("img");
    image.src = safeUrl(src);
    image.alt = "";
    return { type: "image", content: image };
};
const declaredItems = (host) => {
    const itemTag = `${host.localName}-item`;
    const disabled = host.hasAttribute("disabled");
    const items = [];
    const values = new Set();
    for (const child of Array.from(host.children)) {
        if (child.localName !== itemTag)
            continue;
        const headline = child.getAttribute("headline") ?? (child.textContent ?? "").trim();
        const kind = child.getAttribute("kind");
        if (kind === "divider" || kind === "subheader") {
            items.push({ kind, headline, inset: child.hasAttribute("inset") });
            continue;
        }
        const value = child.getAttribute("value") ?? headline;
        if (values.has(value)) {
            console.warn(`<${host.localName}>: more than one item has the value "${value}"; keeping the first.`);
            continue;
        }
        values.add(value);
        items.push({
            id: value,
            headline,
            overline: child.getAttribute("overline") ?? undefined,
            supportingText: child.getAttribute("supporting-text") ?? undefined,
            leading: itemSlot(child, "leading"),
            trailing: itemSlot(child, "trailing"),
            disabled: disabled || child.hasAttribute("disabled"),
            selected: child.hasAttribute("selected"),
        });
    }
    return items;
};
const selectedKey = (items) => items.filter((item) => item.selected).map((item) => String(item.id)).join("\u0000");
const readList = (host) => ({ items: declaredItems(host) });
const create = (config) => {
    const { selection, selectedValue, selectedValues, ...rest } = config;
    const items = rest.items ?? [];
    const mode = selection === "none" || selection === "multiple" ? selection : "single";
    let initial;
    if (selectedValues)
        initial = selectedValues;
    else {
        initial = items.filter((item) => item.selected).map((item) => String(item.id));
        if (selectedValue !== undefined)
            initial = mode === "multiple" ? [...initial, selectedValue] : [selectedValue];
    }
    const component = createList({
        ...rest,
        items: items.map((item) => ({ ...item, selected: undefined })),
        trackSelection: mode !== "none",
        multiSelect: mode === "multiple",
        initialSelection: mode === "multiple" ? initial : initial.slice(0, 1),
    });
    defaultSelected.set(component, selectedKey(items));
    modes.set(component, mode);
    return component;
};
const selectedValues = (component) => component.getSelectedItems().map((item) => String(item.id));
const select = (component, values) => {
    component.setSelection(modes.get(component) === "multiple" ? values : values.slice(0, 1));
};
const toValues = (value) => value === null || value === undefined || value === "" ? [] : Array.isArray(value) ? value.map(String) : [String(value)];
const updateList = (host, component) => {
    const declared = declaredItems(host);
    if (selectedKey(declared) !== defaultSelected.get(component))
        return false;
    const items = component.getAllItems();
    items.splice(0, items.length, ...declared.map((item) => ({ ...item, selected: undefined })));
    void component.refresh();
    return true;
};
const detail = (component) => {
    const values = selectedValues(component);
    return { value: values[0] ?? null, values };
};
const dispatchActivation = (host, component) => {
    let before = "";
    let activated = null;
    const onSelect = (event) => {
        activated = String(event.item.id);
    };
    const capture = () => {
        activated = null;
        before = selectedValues(component).join("\u0000");
    };
    const after = () => {
        const value = activated;
        activated = null;
        if (value === null)
            return;
        const dispatch = (type, detail) => host.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
        dispatch("activate", { value });
        if (selectedValues(component).join("\u0000") !== before)
            dispatch("change", detail(component));
    };
    component.on("select", onSelect);
    component.element.addEventListener("click", capture, true);
    component.element.addEventListener("click", after);
    return () => {
        component.off("select", onSelect);
        component.element.removeEventListener("click", capture, true);
        component.element.removeEventListener("click", after);
    };
};
const listSpec = {
    name: "list",
    create: (config) => create(config),
    styles: ["list"],
    hostStyles: ":host{display:block}",
    attributes: {
        variant: { type: "string", config: "variant" },
        selection: { type: "string", config: "selection" },
        value: { type: "string", config: "selectedValue", update: (c, v) => select(c, toValues(v)) },
        disabled: { type: "boolean", update: (c, _v, host) => void updateList(host, c) },
        "aria-label": {
            type: "string",
            config: "ariaLabel",
            update: (c, v) => (v === null ? c.element.removeAttribute("aria-label") : c.element.setAttribute("aria-label", String(v))),
        },
    },
    properties: {
        value: {
            get: (c) => selectedValues(c)[0] ?? null,
            set: (c, v) => select(c, toValues(v)),
            config: "selectedValue",
        },
        values: {
            get: (c) => selectedValues(c),
            set: (c, v) => select(c, toValues(v)),
            config: "selectedValues",
        },
    },
    model: "value",
    defaults: ["values"],
    events: {
        activate: { detail: (payload) => payload, state: true },
        change: { detail: (payload) => payload },
    },
    config: readList,
    setup: dispatchActivation,
    observeChildren: updateList,
};
export const listElement = defineElement(listSpec);
export const listItemDeclaration = {
    name: "list-item",
    attributes: {
        value: { type: "string" },
        headline: { type: "string" },
        overline: { type: "string" },
        "supporting-text": { type: "string" },
        "leading-icon": { type: "string" },
        "leading-avatar": { type: "string" },
        "leading-image": { type: "string" },
        "trailing-icon": { type: "string" },
        "trailing-text": { type: "string" },
        kind: { type: "string" },
        inset: { type: "boolean" },
        disabled: { type: "boolean" },
        selected: { type: "boolean" },
    },
};
export const defineList = (options) => {
    const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${listItemDeclaration.name}`;
    if (!customElements.get(itemTag))
        customElements.define(itemTag, createDeclarationClass(listItemDeclaration.attributes));
    return listElement.define(options);
};
