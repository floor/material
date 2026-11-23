import createSearch from "../components/search/index.js";
import { PREFIX } from "../core/config.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
const ALIASES = {
    input: ["input"],
    change: ["submit"],
    select: ["suggestionSelect"],
    open: ["expand"],
    close: ["collapse"],
};
const declaredSuggestions = (host) => {
    const suggestionTag = `${host.localName}-suggestion`;
    const suggestions = [];
    for (const child of Array.from(host.children)) {
        if (child.localName !== suggestionTag)
            continue;
        const text = child.getAttribute("label") ?? (child.textContent ?? "").trim();
        suggestions.push({
            text,
            value: child.getAttribute("value") ?? text,
            icon: child.getAttribute("icon") ?? undefined,
            group: child.getAttribute("group") ?? undefined,
        });
    }
    return suggestions;
};
const applied = new WeakMap();
const setWidth = (c, edge, value) => {
    const name = `--${PREFIX}-search-${edge}-width`;
    if (value === null || value === undefined || value === "")
        c.element.style.removeProperty(name);
    else
        c.element.style.setProperty(name, /^\d+(\.\d+)?$/.test(String(value)) ? `${value}px` : String(value));
};
const create = (config) => {
    const { open, ariaLabel, trailingIcon, trailingLabel, avatar, avatarLabel, widthMin, widthMax, noClearButton, noExpandOnFocus, noCollapseOnBlur, ...rest } = config;
    const trailingItems = [];
    if (trailingIcon)
        trailingItems.push({ id: "trailing-icon", type: "icon", content: trailingIcon, ariaLabel: trailingLabel });
    if (avatar)
        trailingItems.push({ id: "avatar", type: "avatar", content: avatar, ariaLabel: avatarLabel, onClick: () => { } });
    if (avatar && !avatarLabel)
        console.warn("[mtrl] search: an avatar without avatar-label is a button with no accessible name.");
    const search = createSearch({
        ...rest,
        showClearButton: !noClearButton,
        expandOnFocus: !noExpandOnFocus,
        collapseOnBlur: !noCollapseOnBlur,
        ...(open ? { initialState: "view" } : {}),
        ...(trailingItems.length ? { trailingItems } : {}),
    });
    if (widthMin !== undefined)
        setWidth(search, "min", widthMin);
    if (widthMax !== undefined)
        setWidth(search, "max", widthMax);
    const input = search.element.querySelector("input");
    const surface = search.element.querySelector("dialog");
    if (ariaLabel) {
        input.setAttribute("aria-label", ariaLabel);
        if (surface?.hasAttribute("aria-label"))
            surface.setAttribute("aria-label", ariaLabel);
    }
    const { on, off } = search;
    const component = Object.assign(search, {
        input,
        show: () => {
            search.expand();
            return component;
        },
        close: () => {
            search.collapse();
            return component;
        },
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
    applied.set(component, JSON.stringify(search.getSuggestions()));
    return component;
};
const updateSuggestions = (host, c) => {
    const suggestions = declaredSuggestions(host);
    const key = JSON.stringify(suggestions);
    if (applied.get(c) !== key) {
        applied.set(c, key);
        c.setSuggestions(suggestions);
    }
    return true;
};
const setValue = (c, value) => void c.setValue(String(value ?? ""), false);
const setDisabled = (c, disabled) => {
    if (disabled)
        c.collapse().disable();
    else
        c.enable();
};
const setOpen = (c, open) => {
    if (open !== c.isExpanded())
        void (open ? c.expand() : c.collapse());
};
const searchSpec = {
    name: "search",
    create: (config) => create(config),
    styles: ["search"],
    hostStyles: ":host{display:block}",
    attributes: {
        placeholder: {
            type: "string",
            config: "placeholder",
            update: (c, v, host) => {
                c.setPlaceholder(v === null ? "Search" : String(v));
                const label = host.getAttribute("aria-label");
                if (label !== null) {
                    c.input.setAttribute("aria-label", label);
                    const surface = c.element.querySelector("dialog");
                    if (surface?.hasAttribute("aria-label")) {
                        surface.setAttribute("aria-label", label || "Search");
                    }
                }
            },
        },
        value: { type: "string", config: "value", update: (c, v) => setValue(c, v) },
        variant: {
            type: "string",
            config: "variant",
            update: (c, v) => void c.setVariant(v === "divided" ? "divided" : "contained"),
        },
        "view-mode": {
            type: "string",
            config: "viewMode",
            update: (c, v) => void c.setViewMode(v === "fullscreen" ? "fullscreen" : "docked"),
        },
        "min-width": { type: "string", config: "widthMin", update: (c, v) => setWidth(c, "min", v) },
        "max-width": { type: "string", config: "widthMax", update: (c, v) => setWidth(c, "max", v) },
        "no-clear-button": { type: "boolean", config: "noClearButton" },
        "no-expand-on-focus": { type: "boolean", config: "noExpandOnFocus" },
        "no-collapse-on-blur": { type: "boolean", config: "noCollapseOnBlur" },
        "full-width": {
            type: "boolean",
            config: "fullWidth",
            update: (c, v) => void c.element.classList.toggle(`${PREFIX}-search--full-width`, !!v),
        },
        "leading-icon": { type: "string", config: "leadingIcon" },
        "trailing-icon": { type: "string", config: "trailingIcon" },
        "trailing-label": { type: "string", config: "trailingLabel" },
        avatar: { type: "string", config: "avatar" },
        "avatar-label": { type: "string", config: "avatarLabel" },
        open: { type: "boolean", config: "open", update: (c, v) => setOpen(c, !!v) },
        disabled: { type: "boolean", config: "disabled", update: (c, v) => setDisabled(c, !!v) },
        "aria-label": {
            type: "string",
            config: "ariaLabel",
            update: (c, v) => {
                const label = v === null ? c.getPlaceholder() : String(v);
                c.input.setAttribute("aria-label", label);
                const surface = c.element.querySelector("dialog");
                if (surface?.hasAttribute("aria-label")) {
                    surface.setAttribute("aria-label", label || "Search");
                }
            },
        },
    },
    properties: {
        value: { get: (c) => c.getValue(), set: setValue },
    },
    methods: ["show", "close", "focus"],
    model: "value",
    events: {
        input: { detail: (payload) => ({ value: payload.value }) },
        change: { detail: (payload) => ({ value: payload.value }) },
        select: { detail: (payload) => ({ value: payload.value }) },
        open: { detail: () => null, state: true },
        close: { detail: () => null, state: true },
        action: { detail: (payload) => payload },
    },
    form: {
        value: (c) => c.getValue(),
        control: (c) => c.input,
        activate: (c) => void c.focus(),
        state: (c) => c.getValue(),
        restore: (c, state) => setValue(c, state),
        disable: (c, disabled) => setDisabled(c, disabled),
    },
    config: (host) => ({ suggestions: declaredSuggestions(host) }),
    setup: (host, c) => {
        const stop = (event) => event.stopPropagation();
        c.input.addEventListener("input", stop);
        const reflect = () => void host.toggleAttribute("open", c.isExpanded());
        c.on("open", reflect);
        c.on("close", reflect);
        const onClick = (event) => {
            const item = event.target.closest?.("[data-trailing-id]");
            const value = item?.getAttribute("data-trailing-id");
            if (!value || c.isDisabled())
                return;
            host.dispatchEvent(new CustomEvent("action", { detail: { value }, bubbles: true, composed: true }));
        };
        c.element.addEventListener("click", onClick);
        return () => {
            c.input.removeEventListener("input", stop);
            c.off("open", reflect);
            c.off("close", reflect);
            c.element.removeEventListener("click", onClick);
        };
    },
    observeChildren: updateSuggestions,
};
export const searchElement = defineElement(searchSpec);
export const searchSuggestionDeclaration = {
    name: "search-suggestion",
    attributes: {
        value: { type: "string" },
        label: { type: "string" },
        icon: { type: "string" },
        group: { type: "string" },
    },
};
export const defineSearch = (options) => {
    const suggestionTag = `${options?.prefix ?? DEFAULT_PREFIX}-${searchSuggestionDeclaration.name}`;
    if (!customElements.get(suggestionTag)) {
        customElements.define(suggestionTag, createDeclarationClass(searchSuggestionDeclaration.attributes));
    }
    return searchElement.define(options);
};
