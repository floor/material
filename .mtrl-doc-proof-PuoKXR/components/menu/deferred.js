import { eventsFrom } from "../../core/dom/layer.js";
import { focusWithin } from "./features/layer.js";
import { menuOpened, menuClosed } from "./features/registry.js";
const resolveOpener = (value) => {
    const element = typeof value === "string" ? document.querySelector(value)
        : value && "element" in value ? value.element : value;
    if (!(element instanceof HTMLElement))
        throw new Error("Menu component requires an opener element or resolvable selector");
    return element;
};
export const createDeferredMenu = (config) => {
    config = { ...config };
    let opener = resolveOpener(config.opener);
    let openerTarget = typeof config.opener === "string" ? opener : config.opener;
    let menu = null;
    let inflight = null;
    let abortLoad;
    let destroyed = false;
    let opened = false;
    let generation = 0;
    let replay = 0;
    let items = config.items;
    let position = config.position ?? "bottom-start";
    let selected = null;
    let asked = [undefined, undefined];
    const listeners = new Map();
    const bridges = new Map();
    let from;
    let observer;
    let dialog = null;
    let original = new Map();
    let owned = new Map();
    const write = (name, value) => {
        if (!original.has(name))
            original.set(name, opener.getAttribute(name));
        if (value === null)
            opener.removeAttribute(name);
        else
            opener.setAttribute(name, value);
        owned.set(name, value);
    };
    const restore = (name) => {
        if (!owned.has(name))
            return;
        if (opener.getAttribute(name) === owned.get(name)) {
            const value = original.get(name) ?? null;
            if (value === null)
                opener.removeAttribute(name);
            else
                opener.setAttribute(name, value);
        }
        owned.delete(name);
        original.delete(name);
    };
    const attributes = ["aria-haspopup", "aria-expanded", "aria-controls"];
    const capture = () => {
        for (const name of attributes)
            original.set(name, opener.getAttribute(name));
        if (!config.listbox) {
            if (!opener.hasAttribute("aria-haspopup"))
                write("aria-haspopup", "true");
            write("aria-expanded", "false");
        }
    };
    const preserveAttributes = (action) => {
        const values = attributes.map(name => [name,
            owned.has(name) && opener.getAttribute(name) === owned.get(name)
                ? original.get(name) ?? null : opener.getAttribute(name)]);
        action();
        for (const [name, value] of values) {
            if (value === null)
                opener.removeAttribute(name);
            else
                opener.setAttribute(name, value);
        }
    };
    const notify = (name, payload) => {
        for (const callback of [...listeners.get(name) ?? []]) {
            if (destroyed)
                break;
            try {
                callback(payload);
            }
            catch (error) {
                console.error(`A listener for "${name}" threw:`, error);
            }
        }
    };
    const usable = () => {
        if (!opener.isConnected || opener.matches(":disabled, [disabled], [aria-disabled='true']") ||
            (config.container && !config.container.isConnected))
            return false;
        for (let node = opener; node;) {
            if (node.closest("[inert], [hidden], dialog:not([open])") ||
                getComputedStyle(node).display === "none" || getComputedStyle(node).visibility === "hidden")
                return false;
            for (let parent = node.parentElement; parent; parent = parent.parentElement) {
                if (getComputedStyle(parent).display === "none")
                    return false;
            }
            const root = node.getRootNode();
            node = "host" in root ? root.host : undefined;
        }
        return true;
    };
    const registry = { close: (event) => { api.close(event, false); } };
    const stopPending = (keepWatch = false) => {
        from?.stop();
        from = undefined;
        if (!keepWatch) {
            observer?.disconnect();
            observer = undefined;
            dialog?.removeEventListener("close", cancelled);
            dialog = null;
        }
        document.removeEventListener("click", outside);
        document.removeEventListener("keydown", pendingKey);
        restore("aria-busy");
        menuClosed(registry);
    };
    const cancelled = (event) => { api.close(event, false); };
    const outside = (event) => {
        if (from?.after(event) && !event.composedPath().includes(opener))
            api.close(event, false);
    };
    const pendingKey = (event) => {
        if (!from?.after(event))
            return;
        if (event.key === "Escape" && config.closeOnEscape !== false && !config.listbox) {
            event.preventDefault();
            api.close(event);
        }
        else if (event.key === "Tab")
            api.close(event, false);
    };
    const startPending = () => {
        from = eventsFrom(opener);
        write("aria-busy", "true");
        if (config.closeOnClickOutside !== false)
            document.addEventListener("click", outside);
        document.addEventListener("keydown", pendingKey);
        watchOpener();
    };
    const watchOpener = () => {
        dialog = opener.closest("dialog");
        dialog?.addEventListener("close", cancelled);
        observer = new MutationObserver(() => {
            if (opened && !usable())
                api.close(undefined, false);
        });
        const options = { subtree: true, childList: true, attributes: true,
            attributeFilter: ["disabled", "aria-disabled", "open", "hidden", "inert", "style", "class"] };
        observer.observe(document, options);
        for (let root = opener.getRootNode(); "host" in root; root = root.host.getRootNode()) {
            observer.observe(root, options);
        }
    };
    const click = (event) => {
        if (!usable())
            return;
        event.preventDefault();
        event.stopPropagation();
        api.toggle(event);
    };
    const key = (event) => {
        if (!usable())
            return;
        if (["Enter", " ", "ArrowDown", "Down", "ArrowUp", "Up"].includes(event.key)) {
            event.preventDefault();
            if (!opened || !menu)
                api.open(event, "keyboard");
        }
        else if (event.key === "Escape" && opened && config.closeOnEscape !== false && !config.listbox) {
            event.preventDefault();
            api.close(event);
        }
    };
    const blur = (event) => {
        if (opened && (!menu || !focusWithin({ opener, items, layer: config.layer }, menu.element, event.relatedTarget))) {
            api.close(event, false);
        }
    };
    const wireOpener = (add) => {
        if (config.manualOpen)
            return;
        if (add) {
            opener.addEventListener("click", click);
            opener.addEventListener("keydown", key);
            opener.addEventListener("blur", blur);
        }
        else {
            opener.removeEventListener("click", click);
            opener.removeEventListener("keydown", key);
            opener.removeEventListener("blur", blur);
        }
    };
    const bridge = (name) => {
        if (!menu || bridges.has(name) || name === "loaderror")
            return;
        const forward = (payload) => {
            if (destroyed || (replay && (name === "open" || name === "close")))
                return;
            if (name === "close") {
                if (!opened)
                    return;
                opened = false;
                generation++;
                stopPending();
                if (!config.listbox) {
                    write("aria-expanded", "false");
                    write("aria-controls", original.get("aria-controls") ?? null);
                }
            }
            const data = payload;
            if (name === "select") {
                selected = menu.getSelected();
                const selection = payload;
                notify(name, { ...selection, menu: api,
                    get defaultPrevented() { return selection.defaultPrevented; },
                    set defaultPrevented(value) { selection.defaultPrevented = value; },
                    preventDefault: () => selection.preventDefault() });
            }
            else
                notify(name, data && typeof data === "object" ? { ...data, menu: api } : payload);
        };
        bridges.set(name, forward);
        menu.on(name, forward);
    };
    const present = () => {
        if (!opened || destroyed || !menu)
            return;
        if (!usable()) {
            api.close(undefined, false);
            return;
        }
        const version = generation;
        stopPending(true);
        replay++;
        try {
            menu.open(...asked);
        }
        finally {
            replay--;
        }
        if (destroyed || !opened || version !== generation)
            return;
        if (!config.listbox) {
            write("aria-controls", menu.element.getRootNode() === opener.getRootNode() ? menu.element.id : null);
            write("aria-expanded", "true");
        }
    };
    const abortError = () => new DOMException("Menu destroyed", "AbortError");
    const load = () => {
        if (destroyed)
            return Promise.reject(abortError());
        if (menu)
            return Promise.resolve();
        if (inflight)
            return inflight;
        const request = new Promise((resolve, reject) => {
            abortLoad = reject;
            import("./index.js").then(({ default: createMenu }) => {
                if (destroyed)
                    return;
                menu = createMenu({ ...config, opener: openerTarget, items, position, on: undefined, visible: false, manualOpen: true });
                menu.setSelected(selected);
                if (!config.listbox) {
                    owned.set("aria-controls", opener.getAttribute("aria-controls"));
                    write("aria-controls", original.get("aria-controls") ?? null);
                }
                for (const name of new Set(["close", "select", ...listeners.keys()]))
                    bridge(name);
                if (opened)
                    present();
                resolve();
            }).catch((error) => {
                if (destroyed)
                    return;
                const failed = menu;
                menu = null;
                if (failed)
                    preserveAttributes(() => failed.destroy());
                bridges.clear();
                if (!config.listbox) {
                    if (!opener.hasAttribute("aria-haspopup"))
                        write("aria-haspopup", "true");
                    write("aria-expanded", "false");
                }
                inflight = null;
                abortLoad = undefined;
                try {
                    if (opened)
                        api.close(undefined, false);
                    if (!destroyed)
                        notify("loaderror", { menu: api, error });
                }
                finally {
                    reject(error);
                }
            });
        });
        inflight = request;
        void request.then(() => {
            if (inflight === request) {
                inflight = null;
                abortLoad = undefined;
            }
        }, () => {
            if (inflight === request) {
                inflight = null;
                abortLoad = undefined;
            }
        });
        return request;
    };
    const api = {
        get element() { return menu?.element ?? null; },
        isReady: () => menu !== null,
        preload: load,
        open(event, interactionType) {
            if (destroyed)
                return api;
            asked = [event, interactionType];
            if (opened)
                return api;
            opened = true;
            const version = ++generation;
            menuOpened(registry, event);
            if (destroyed || !opened || version !== generation)
                return api;
            if (!menu)
                startPending();
            else
                watchOpener();
            notify("open", { menu: api, originalEvent: event });
            if (destroyed || !opened || version !== generation)
                return api;
            if (menu)
                present();
            else
                void load().catch(() => { });
            return api;
        },
        close(event, restoreFocus = true, skipAnimation = false) {
            if (destroyed || !opened)
                return api;
            opened = false;
            generation++;
            stopPending();
            const version = generation;
            if (menu) {
                replay++;
                try {
                    menu.close(event, restoreFocus && usable(), skipAnimation);
                }
                finally {
                    replay--;
                }
            }
            if (destroyed)
                return api;
            if (version === generation && !config.listbox) {
                write("aria-expanded", "false");
                write("aria-controls", original.get("aria-controls") ?? null);
            }
            notify("close", { menu: api, originalEvent: event });
            return api;
        },
        toggle: (event) => opened ? api.close(event) : api.open(event),
        isOpen: () => opened,
        setItems(value) {
            if (!destroyed) {
                items = value;
                menu?.setItems(value);
            }
            return api;
        },
        getItems: () => items,
        setPosition(value) {
            if (!destroyed) {
                position = value;
                menu?.setPosition(value);
            }
            return api;
        },
        getPosition: () => position,
        setSelected(value) {
            if (!destroyed) {
                selected = value;
                menu?.setSelected(value);
            }
            return api;
        },
        getSelected: () => menu?.getSelected() ?? selected,
        setOpener(value) {
            if (destroyed)
                return api;
            const next = resolveOpener(value);
            if (next === opener)
                return api;
            const previous = opener;
            api.close(undefined, false);
            if (destroyed || opened || opener !== previous)
                return api;
            wireOpener(false);
            const nextOriginal = new Map(attributes.map(name => [name, next.getAttribute(name)]));
            preserveAttributes(() => menu?.setOpener(next));
            original = nextOriginal;
            owned = new Map();
            opener = next;
            openerTarget = next;
            if (!config.listbox) {
                if (original.get("aria-haspopup") === null)
                    write("aria-haspopup", "true");
                write("aria-expanded", "false");
                write("aria-controls", original.get("aria-controls") ?? null);
            }
            wireOpener(true);
            return api;
        },
        getOpener: () => opener,
        on(name, callback) {
            if (!destroyed) {
                listeners.set(name, [...listeners.get(name) ?? [], callback]);
                bridge(name);
            }
            return api;
        },
        off(name, callback) {
            if (!destroyed)
                listeners.set(name, (listeners.get(name) ?? []).filter(value => value !== callback));
            return api;
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            opened = false;
            generation++;
            stopPending();
            wireOpener(false);
            listeners.clear();
            preserveAttributes(() => menu?.destroy());
            menu = null;
            owned.clear();
            original.clear();
            bridges.clear();
            abortLoad?.(abortError());
            abortLoad = undefined;
        },
    };
    capture();
    wireOpener(true);
    for (const [name, callback] of Object.entries(config.on ?? {}))
        if (callback)
            api.on(name, callback);
    if (config.visible)
        api.open();
    return api;
};
export default createDeferredMenu;
