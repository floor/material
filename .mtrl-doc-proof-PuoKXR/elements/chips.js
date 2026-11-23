import createChips from "../components/chips/chips.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
const TYPES = ["assist", "filter", "input", "suggestion"];
const isMulti = (host) => host.getAttribute("selection") !== "single";
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
const removed = new WeakMap();
const declaredChips = (host) => {
    const chipTag = host.localName.replace(/chips$/, "chip");
    const gone = removed.get(host);
    const chips = [];
    for (const child of Array.from(host.children)) {
        if (child.localName !== chipTag)
            continue;
        const label = child.getAttribute("label") ?? (child.textContent ?? "").trim();
        const value = child.getAttribute("value") ?? label;
        if (gone?.has(value))
            continue;
        const variant = child.getAttribute("variant");
        chips.push({
            label,
            value,
            type: variant && TYPES.includes(variant) ? variant : "filter",
            leadingIcon: child.getAttribute("icon") ?? undefined,
            trailingIcon: child.getAttribute("trailing-icon") ?? undefined,
            avatar: child.getAttribute("avatar") ?? undefined,
            removeLabel: child.getAttribute("remove-label") ?? undefined,
            selected: child.hasAttribute("selected"),
            disabled: child.hasAttribute("disabled"),
            elevated: child.hasAttribute("elevated"),
        });
    }
    return chips;
};
const applied = new WeakMap();
const defaultSelection = (host, chips) => host.hasAttribute("value")
    ? parse(host.getAttribute("value"), isMulti(host))
    : parse(chips.filter((chip) => chip.selected).map((chip) => chip.value).slice(isMulti(host) ? 0 : -1), isMulti(host));
const readChips = (host) => {
    const chips = declaredChips(host);
    const chosen = defaultSelection(host, chips);
    applied.set(host, chips);
    return {
        chips: chips.map((chip) => ({ ...chip, selected: chosen.includes(chip.value) })),
        multiSelect: isMulti(host),
    };
};
const select = (c, value, multi) => {
    const wanted = parse(value, multi);
    for (const chip of c.getChips()) {
        const selected = wanted.includes(chip.getValue() ?? "");
        if (chip.isSelected() !== selected)
            chip.setSelected(selected);
    }
};
const isMultiSet = (c) => c.element.getAttribute("aria-multiselectable") !== "false";
const nameCells = (c) => {
    for (const chip of c.getChips()) {
        if (chip.element.hasAttribute("tabindex"))
            chip.element.setAttribute("aria-label", chip.getLabel());
    }
};
const create = (config) => {
    const chips = createChips(config);
    nameCells(chips);
    return chips;
};
const byValue = (component) => new Map(component.getChips().map((chip) => [chip.getValue() ?? "", chip]));
const updateChips = (host, component) => {
    const gone = removed.get(host);
    if (gone) {
        const chipTag = host.localName.replace(/chips$/, "chip");
        const present = new Set(Array.from(host.children)
            .filter((child) => child.localName === chipTag)
            .map((child) => child.getAttribute("value") ?? child.getAttribute("label") ?? (child.textContent ?? "").trim()));
        for (const value of gone)
            if (!present.has(value))
                gone.delete(value);
    }
    const declared = declaredChips(host);
    const values = declared.map((chip) => chip.value);
    if (new Set(values).size !== values.length)
        return false;
    const previous = new Map((applied.get(host) ?? []).map((chip) => [chip.value, chip]));
    const chips = byValue(component);
    const current = component.getChips().map((chip) => chip.getValue() ?? "");
    const existing = new Set(current);
    const kept = current.filter((value) => values.includes(value));
    const firstNew = values.findIndex((value) => !existing.has(value));
    const declaredKept = (firstNew === -1 ? values : values.slice(0, firstNew)).filter((value) => existing.has(value));
    if (kept.join("\u0000") !== declaredKept.join("\u0000"))
        return false;
    if (firstNew !== -1 && values.slice(firstNew).some((value) => existing.has(value)))
        return false;
    const bySelected = !host.hasAttribute("value");
    for (const chip of declared) {
        const before = previous.get(chip.value);
        if (!before) {
            if (chip.selected && bySelected)
                return false;
            continue;
        }
        if (chip.type !== before.type || chip.avatar !== before.avatar || chip.elevated !== before.elevated)
            return false;
        if (chip.removeLabel !== before.removeLabel || (chip.selected !== before.selected && bySelected))
            return false;
    }
    for (const [value, chip] of chips)
        if (!values.includes(value))
            component.removeChip(chip);
    const added = firstNew === -1 ? [] : declared.slice(firstNew);
    for (const chip of added)
        component.addChip({ ...chip, selected: false });
    for (const chip of declared) {
        const before = previous.get(chip.value);
        const instance = byValue(component).get(chip.value);
        if (!before || !instance)
            continue;
        if (instance.getLabel() !== chip.label)
            instance.setLabel(chip.label);
        if (chip.leadingIcon !== before.leadingIcon)
            instance.setIcon(chip.leadingIcon ?? "");
        if (chip.trailingIcon !== before.trailingIcon)
            instance.setTrailingIcon(chip.trailingIcon ?? "");
        if (chip.disabled !== instance.isDisabled()) {
            if (chip.disabled)
                instance.disable();
            else
                instance.enable();
        }
    }
    nameCells(component);
    applied.set(host, declared);
    return true;
};
const chipsSpec = {
    name: "chips",
    create: (config) => create(config),
    styles: ["chips"],
    hostStyles: ":host{display:block}",
    attributes: {
        selection: { type: "string" },
        "selection-required": { type: "boolean", config: "selectionRequired" },
        scrollable: { type: "boolean", config: "scrollable", update: (c, v) => void c.setScrollable(!!v) },
        vertical: { type: "boolean", config: "vertical", update: (c, v) => void c.setVertical(!!v) },
        label: { type: "string", config: "label", update: (c, v) => void c.setLabel(v === null ? "" : String(v)) },
        "label-position": {
            type: "string",
            config: "labelPosition",
            update: (c, v) => void c.setLabelPosition(v === "end" ? "end" : "start"),
        },
        "aria-label": {
            type: "string",
            config: "ariaLabel",
            update: (c, v) => (v === null ? c.element.removeAttribute("aria-label") : c.element.setAttribute("aria-label", String(v))),
        },
        value: { type: "string", update: (c, v) => select(c, v, isMultiSet(c)) },
    },
    properties: {
        value: { get: (c) => c.getValue(), set: (c, v) => select(c, v, isMultiSet(c)) },
    },
    model: "value",
    events: {
        change: {
            detail: (payload) => ({ value: payload.value }),
        },
        remove: {
            detail: (payload) => {
                const { chipValue, value } = payload;
                return { chipValue, value };
            },
        },
    },
    config: readChips,
    setup: (host, component) => {
        const onRemove = ({ chipValue }) => {
            const set = removed.get(host) ?? new Set();
            set.add(chipValue ?? "");
            removed.set(host, set);
        };
        component.on("remove", onRemove);
        return () => void component.off("remove", onRemove);
    },
    observeChildren: updateChips,
};
export const chipsElement = defineElement(chipsSpec);
export const chipDeclaration = {
    name: "chip",
    attributes: {
        value: { type: "string" },
        label: { type: "string" },
        variant: { type: "string" },
        icon: { type: "string" },
        "trailing-icon": { type: "string" },
        avatar: { type: "string" },
        "remove-label": { type: "string" },
        selected: { type: "boolean" },
        disabled: { type: "boolean" },
        elevated: { type: "boolean" },
    },
};
export const defineChips = (options) => {
    const chipTag = `${options?.prefix ?? DEFAULT_PREFIX}-${chipDeclaration.name}`;
    if (!customElements.get(chipTag))
        customElements.define(chipTag, createDeclarationClass(chipDeclaration.attributes));
    return chipsElement.define(options);
};
