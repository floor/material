import { MOUNT, DISPOSE } from "./lifecycle.js";
import { PREFIX } from "../core/config.js";
import { trackDirection } from "../core/dom/direction.js";
import { bindSlotHost, syncSlottedIcon } from "../core/compose/features/icon-slot.js";
import { applyStyles, DEFAULT_PREFIX, hasStyles, registerStyles } from "./styles.js";
export { DEFAULT_PREFIX };
export const SHADOW_BASE_STYLES = ["ripple"];
const BASE_HOST_DISPLAY = ":host{display:inline-block}";
const BASE_HOST_ALWAYS = ":host([hidden]){display:none}*,*::before,*::after{box-sizing:border-box}" +
    "@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-property:opacity,color,background-color,border-color,box-shadow,visibility!important;scroll-behavior:auto!important}}";
export const BASE_HOST_STYLES = BASE_HOST_DISPLAY + BASE_HOST_ALWAYS;
const ownsHostDisplay = (hostStyles) => {
    const css = hostStyles
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, "");
    let depth = 0;
    for (let i = 0; i < css.length; i++) {
        const char = css[i];
        if (char === "{") {
            depth++;
            continue;
        }
        if (char === "}") {
            depth--;
            continue;
        }
        if (char !== ":" || depth !== 0 || !css.startsWith(":host", i))
            continue;
        let block = i + 5;
        while (/\s/.test(css[block] ?? ""))
            block++;
        if (css[block] !== "{")
            continue;
        let before = i;
        while (before > 0 && /\s/.test(css[before - 1]))
            before--;
        if (before > 0 && css[before - 1] !== "}")
            continue;
        let flat = "";
        let closed = false;
        for (let j = block + 1; j < css.length; j++) {
            const char2 = css[j];
            if (char2 === "}") {
                closed = true;
                break;
            }
            if (char2 === "{") {
                flat = "";
                break;
            }
            flat += char2;
        }
        if (closed && /(?:^|;)\s*display\s*:/.test(flat))
            return true;
    }
    return false;
};
export const hostStyleText = (spec) => {
    const own = spec.hostStyles ?? "";
    return (ownsHostDisplay(own) ? BASE_HOST_ALWAYS : BASE_HOST_STYLES) + own;
};
const camel = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const read = (host, name, type) => {
    const raw = host.getAttribute(name);
    if (type === "boolean")
        return raw !== null;
    if (raw === null)
        return null;
    if (type === "number") {
        const n = Number(raw);
        return Number.isNaN(n) ? null : n;
    }
    return raw;
};
const write = (host, name, type, value) => {
    if (type === "boolean")
        host.toggleAttribute(name, value !== false && value !== null && value !== undefined);
    else if (value === null || value === undefined)
        host.removeAttribute(name);
    else
        host.setAttribute(name, String(value));
};
const CLASS_PREFIX = `${PREFIX}-`;
const partNames = (node) => {
    const names = [];
    for (const name of Array.from(node.classList)) {
        if (!name.startsWith(CLASS_PREFIX) || /--/.test(name))
            continue;
        const bem = name.slice(CLASS_PREFIX.length);
        const at = bem.indexOf("__");
        const part = at < 0 ? bem : bem.slice(at + 2);
        if (!names.includes(part))
            names.push(part);
    }
    return names;
};
const isDeclarativeTemplate = (node) => node.nodeType === 1 && node.localName === "template" && node.hasAttribute("shadowrootmode");
const removeDeclarativeTemplates = (host) => {
    for (const child of Array.from(host.children))
        if (isDeclarativeTemplate(child))
            child.remove();
};
const hasContent = (host) => Array.from(host.childNodes).some((node) => (node.nodeType === 1 && !isDeclarativeTemplate(node)) || (node.nodeType === 3 && (node.textContent ?? "").trim() !== ""));
export const createElementClass = (spec) => {
    const backed = [...(spec.model ? [spec.model] : []), ...(spec.defaults ?? [])];
    const backing = new Set(backed.map(kebab));
    class MElement extends HTMLElement {
        static { this.formAssociated = !!spec.form; }
        static {
            this.observedAttributes = [
                ...Object.keys(spec.attributes ?? {}),
                ...(spec.slot ? [spec.slot.attribute] : []),
            ];
        }
        #pending;
        #restoreState;
        #silent;
        #dirty;
        #cleanup;
        #observer;
        #parts;
        #slot;
        get dirty() {
            return this.#dirty;
        }
        constructor() {
            super();
            this.component = null;
            this.#pending = new Map();
            this.#restoreState = null;
            this.#silent = 0;
            this.#dirty = false;
            this.#cleanup = [];
            this.#observer = null;
            this.#parts = null;
            this.#slot = null;
            this.attachShadow({ mode: "open", delegatesFocus: true });
            this.internals = spec.form && typeof this.attachInternals === "function" ? this.attachInternals() : null;
            if (backed.length) {
                for (const [event, eventSpec] of Object.entries(spec.events ?? {})) {
                    if (eventSpec.state)
                        continue;
                    this.addEventListener(event, (e) => {
                        if (e.target === this)
                            this.#dirty = true;
                    });
                }
            }
        }
        [MOUNT]() {
            this.connectedCallback();
            this.#exposeParts(this.shadowRoot);
        }
        [DISPOSE]() {
            this.#teardown();
        }
        connectedCallback() {
            if (spec.marker)
                this.toggleAttribute(spec.marker, true);
            removeDeclarativeTemplates(this);
            this.#upgradeProperties();
            if (!this.component)
                this.#build();
        }
        disconnectedCallback() {
            queueMicrotask(() => {
                if (!this.isConnected)
                    this.#teardown();
            });
        }
        attributeChangedCallback(name, previous, next) {
            if (!this.component || previous === next)
                return;
            if (spec.slot && name === spec.slot.attribute) {
                if (this.#slot) {
                    this.#slot.textContent = next ?? "";
                    this.#syncIcon();
                }
                else if (next)
                    this.#rebuild(true);
                return;
            }
            const attribute = spec.attributes?.[name];
            if (!attribute)
                return;
            if (this.#dirty && backing.has(name))
                return;
            if (attribute.update) {
                this.#quietly(() => attribute.update?.(this.component, read(this, name, attribute.type), this));
                this.#syncForm();
            }
            else {
                this.#rebuild(true);
            }
        }
        formResetCallback() {
            this.#dirty = false;
            this.#pending.clear();
            this.#rebuild(false);
        }
        formStateRestoreCallback(state) {
            if (typeof state !== "string" || !spec.form?.restore)
                return;
            this.#dirty = true;
            if (!this.component) {
                this.#restoreState = state;
                return;
            }
            this.#quietly(() => spec.form?.restore?.(this.component, state));
            this.#syncForm();
        }
        formDisabledCallback(disabled) {
            const form = spec.form;
            if (this.component && form?.disable)
                this.#quietly(() => form.disable?.(this.component, disabled));
        }
        getProperty(name) {
            const property = spec.properties?.[name];
            if (!property)
                return undefined;
            return this.component ? property.get(this.component) : this.#pending.get(name);
        }
        setProperty(name, value) {
            const property = spec.properties?.[name];
            if (!property)
                return;
            if (backed.includes(name))
                this.#dirty = true;
            if (!this.component) {
                this.#pending.set(name, value);
                return;
            }
            this.#quietly(() => property.set(this.component, value));
            this.#syncForm();
        }
        callMethod(name, args) {
            const component = this.component;
            const method = component?.[name];
            if (typeof method !== "function")
                return undefined;
            const before = backed.map((property) => this.getProperty(property));
            const result = method.apply(component, args);
            if (backed.some((property, i) => this.getProperty(property) !== before[i]))
                this.#dirty = true;
            this.#syncForm();
            return result === component ? this : result;
        }
        #quietly(fn) {
            this.#silent++;
            try {
                fn();
            }
            finally {
                this.#silent--;
            }
        }
        #upgradeProperties() {
            const names = [
                ...Object.keys(spec.attributes ?? {}).map(camel),
                ...Object.keys(spec.properties ?? {}),
                ...(spec.slot ? [camel(spec.slot.attribute)] : []),
            ];
            const self = this;
            for (const name of names) {
                if (Object.prototype.hasOwnProperty.call(this, name)) {
                    const value = self[name];
                    delete self[name];
                    self[name] = value;
                }
            }
        }
        #config() {
            const config = {};
            for (const [name, attribute] of Object.entries(spec.attributes ?? {})) {
                if (!attribute.config)
                    continue;
                const value = read(this, name, attribute.type);
                if (value !== null && value !== false)
                    config[attribute.config] = value;
            }
            if (spec.slot) {
                const text = this.getAttribute(spec.slot.attribute);
                if (text || hasContent(this)) {
                    const slot = document.createElement("slot");
                    slot.textContent = text ?? "";
                    bindSlotHost(slot, this);
                    config[spec.slot.config] = slot;
                    this.#slot = slot;
                }
            }
            Object.assign(config, spec.config?.(this));
            for (const [name, property] of Object.entries(spec.properties ?? {})) {
                if (property.config && this.#pending.has(name)) {
                    config[property.config] = this.#pending.get(name);
                    this.#pending.delete(name);
                }
            }
            return config;
        }
        #syncIcon() {
            if (this.component)
                syncSlottedIcon(this.component.element);
        }
        #build() {
            trackDirection(this);
            const root = this.shadowRoot;
            applyStyles(root, [`host:${spec.name}`, ...SHADOW_BASE_STYLES, ...spec.styles]);
            const component = spec.create(this.#config());
            this.component = component;
            if (this.#slot && !component.element.contains(this.#slot))
                this.#slot = null;
            root.append(component.element);
            this.#syncIcon();
            this.#exposeParts(root);
            const events = component;
            for (const [event, eventSpec] of Object.entries(spec.events ?? {})) {
                const handler = (payload) => {
                    this.#syncForm();
                    if (this.#silent)
                        return;
                    const detail = eventSpec.detail ? eventSpec.detail(payload) : payload;
                    this.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }));
                };
                if ( /*#__PURE__*/(() => {
                    try {
                        return process.env.NODE_ENV !== "production";
                    }
                    catch {
                        return false;
                    }
                })() && process.env.NODE_ENV !== "production")
                    Object.assign(handler, { __h: this });
                events.on?.(event, handler);
                this.#cleanup.push(() => events.off?.(event, handler));
            }
            for (const event of spec.form?.events ?? []) {
                if (spec.events?.[event])
                    continue;
                const handler = () => this.#syncForm();
                events.on?.(event, handler);
                this.#cleanup.push(() => events.off?.(event, handler));
            }
            for (const [name, value] of this.#pending) {
                const property = spec.properties?.[name];
                if (property)
                    this.#quietly(() => property.set(component, value));
            }
            this.#pending.clear();
            if (this.#restoreState !== null) {
                const state = this.#restoreState;
                this.#restoreState = null;
                this.#quietly(() => spec.form?.restore?.(component, state));
            }
            if (spec.form?.activate) {
                const onClick = (event) => {
                    if (event.composedPath()[0] === this)
                        spec.form?.activate?.(component);
                };
                this.addEventListener("click", onClick);
                this.#cleanup.push(() => this.removeEventListener("click", onClick));
            }
            const cleanup = spec.setup?.(this, component);
            if (cleanup)
                this.#cleanup.push(cleanup);
            {
                this.#observer = new MutationObserver(() => {
                    removeDeclarativeTemplates(this);
                    const observe = spec.observeChildren;
                    let updated = false;
                    const component = this.component;
                    if (typeof observe === "function" && component) {
                        this.#quietly(() => {
                            updated = observe(this, component);
                        });
                    }
                    if (updated) {
                        this.#syncForm();
                        return;
                    }
                    if (observe || (spec.slot && !this.#slot && hasContent(this)))
                        this.#rebuild(true);
                    else if (this.#slot)
                        this.#syncIcon();
                });
                this.#observer.observe(this, {
                    childList: true,
                    subtree: !!spec.observeChildren,
                    attributes: !!spec.observeChildren,
                    characterData: !!spec.observeChildren,
                });
            }
            this.#syncForm();
        }
        #exposeParts(root) {
            const name = (node) => {
                const names = partNames(node);
                if (spec.slot && this.#slot?.parentElement === node && !names.includes(spec.slot.attribute)) {
                    names.push(spec.slot.attribute);
                }
                const value = names.join(" ");
                if ((node.getAttribute("part") ?? "") === value)
                    return;
                if (value)
                    node.setAttribute("part", value);
                else
                    node.removeAttribute("part");
            };
            const nameAll = (node) => {
                name(node);
                for (const child of Array.from(node.querySelectorAll("*")))
                    name(child);
            };
            for (const child of Array.from(root.children))
                nameAll(child);
            this.#parts ??= new MutationObserver((records) => {
                for (const record of records) {
                    for (const node of Array.from(record.addedNodes))
                        if (node.nodeType === 1)
                            nameAll(node);
                }
            });
            this.#parts.observe(root, { childList: true, subtree: true });
        }
        #teardown() {
            const component = this.component;
            const observer = this.#observer;
            const parts = this.#parts;
            this.#observer = null;
            this.#parts = null;
            let failure;
            let failed = false;
            const attempt = (cleanup) => {
                try {
                    cleanup();
                }
                catch (error) {
                    if (!failed)
                        failure = error;
                    failed = true;
                }
            };
            attempt(() => observer?.disconnect());
            attempt(() => parts?.disconnect());
            for (const cleanup of this.#cleanup.splice(0))
                attempt(cleanup);
            if (component) {
                attempt(() => component.destroy());
                attempt(() => component.element.remove());
            }
            this.component = null;
            this.#slot = null;
            if (failed)
                throw failure;
        }
        #rebuild(keepState) {
            if (this.component && keepState) {
                for (const [name, property] of Object.entries(spec.properties ?? {})) {
                    if (!this.#dirty && backed.includes(name))
                        continue;
                    this.#pending.set(name, property.get(this.component));
                }
            }
            this.#teardown();
            if (this.isConnected)
                this.#build();
        }
        #syncForm() {
            const form = spec.form;
            const internals = this.internals;
            if (!form || !internals || !this.component)
                return;
            const value = form.value(this.component, this);
            if (form.state)
                internals.setFormValue(value, form.state(this.component));
            else
                internals.setFormValue(value);
            const control = form.control?.(this.component);
            if (control) {
                const validity = control.validity;
                if (!(validity.valid && internals.validity.valid)) {
                    internals.setValidity(validity, control.validationMessage, control);
                }
            }
        }
    }
    if ( /*#__PURE__*/(() => {
        try {
            return process.env.NODE_ENV !== "production";
        }
        catch {
            return false;
        }
    })() && process.env.NODE_ENV !== "production") {
        const add = MElement.prototype.addEventListener;
        MElement.prototype.addEventListener = function (type, listener, options) {
            Reflect.apply(add, this, [type, listener, options]);
            if (listener)
                spec.events?.[type]?.listen?.(this);
        };
    }
    const proto = MElement.prototype;
    for (const [name, attribute] of Object.entries(spec.attributes ?? {})) {
        const property = camel(name);
        if (property in proto || spec.properties?.[property])
            continue;
        Object.defineProperty(proto, property, {
            configurable: true,
            get() {
                return read(this, name, attribute.type);
            },
            set(value) {
                write(this, name, attribute.type, value);
            },
        });
    }
    if (spec.slot) {
        const { attribute } = spec.slot;
        const property = camel(attribute);
        if (!(property in proto) && !spec.properties?.[property]) {
            Object.defineProperty(proto, property, {
                configurable: true,
                get() {
                    return this.getAttribute(attribute) ?? (this.textContent ?? "").trim();
                },
                set(value) {
                    write(this, attribute, "string", value);
                },
            });
        }
    }
    for (const name of Object.keys(spec.properties ?? {})) {
        Object.defineProperty(proto, name, {
            configurable: true,
            get() {
                return this.getProperty(name);
            },
            set(value) {
                this.setProperty(name, value);
            },
        });
    }
    for (const name of spec.methods ?? []) {
        Object.defineProperty(proto, name, {
            configurable: true,
            value(...args) {
                return this.callMethod(name, args);
            },
        });
    }
    return MElement;
};
export const createDeclarationClass = (attributes) => {
    const names = Object.keys(attributes).map(camel);
    class Declaration extends HTMLElement {
        connectedCallback() {
            removeDeclarativeTemplates(this);
            const self = this;
            for (const name of names) {
                if (Object.prototype.hasOwnProperty.call(this, name)) {
                    const value = self[name];
                    delete self[name];
                    self[name] = value;
                }
            }
        }
    }
    for (const [name, attribute] of Object.entries(attributes)) {
        Object.defineProperty(Declaration.prototype, camel(name), {
            configurable: true,
            get() {
                return read(this, name, attribute.type);
            },
            set(value) {
                write(this, name, attribute.type, value);
            },
        });
    }
    return Declaration;
};
export const defineElement = (spec) => {
    let element = null;
    const getElement = () => (element ??= createElementClass(spec));
    const registered = new Set();
    let prepared = false;
    return {
        spec,
        get element() {
            return getElement();
        },
        define(options = {}) {
            const tag = `${options.prefix ?? DEFAULT_PREFIX}-${spec.name}`;
            if (!prepared) {
                prepared = true;
                registerStyles({ [`host:${spec.name}`]: hostStyleText(spec) });
                const missing = [...SHADOW_BASE_STYLES, ...spec.styles].filter((name) => !hasStyles(name));
                if (missing.length) {
                    console.warn(`<${tag}> has no CSS for ${missing.join(", ")}: import "material/elements/css/${spec.name}" first.`);
                }
            }
            const existing = customElements.get(tag);
            if (existing) {
                if (!registered.has(existing)) {
                    console.warn(`<${tag}> is already defined by another script; keeping the first definition.`);
                }
                return tag;
            }
            const base = getElement();
            const ctor = registered.size === 0 ? base : class extends base {
            };
            customElements.define(tag, ctor);
            registered.add(ctor);
            return tag;
        },
    };
};
