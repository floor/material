export const createOnDemandMenu = (settings, items) => {
    let menu = null;
    let loading = false;
    let destroyed = false;
    let opened = false;
    let asked = [undefined, undefined];
    let current = items;
    let selected;
    let position = settings.position ?? "bottom-end";
    const openerElement = typeof settings.opener === "string"
        ? null
        : settings.opener.element ?? settings.opener;
    const placeholder = document.createElement("div");
    placeholder.id = `menu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (!settings.listbox) {
        if (openerElement && !openerElement.hasAttribute("aria-haspopup")) {
            openerElement.setAttribute("aria-haspopup", "true");
        }
        openerElement?.setAttribute("aria-expanded", "false");
        openerElement?.setAttribute("aria-controls", placeholder.id);
    }
    const listeners = new Map();
    let ready = [];
    const notify = (event, payload) => {
        for (const listener of listeners.get(event) ?? [])
            listener(payload);
    };
    const attach = (created) => {
        menu = created;
        if (selected !== undefined)
            created.setSelected(selected);
        if (position !== settings.position)
            created.setPosition(position);
        if (opened)
            created.open(asked[0], asked[1]);
        for (const [event, set] of listeners)
            for (const listener of set)
                created.on(event, listener);
        listeners.clear();
        const waiting = ready;
        ready = [];
        for (const callback of waiting)
            callback();
    };
    const load = () => {
        if (menu || loading || destroyed)
            return;
        loading = true;
        import("./index.js").then(({ default: createMenu }) => {
            loading = false;
            if (destroyed)
                return;
            attach(createMenu({ ...settings, items: current }));
        }, (error) => {
            loading = false;
            console.error("Menu failed to load:", error);
        });
    };
    const api = {
        get element() {
            return menu?.element ?? placeholder;
        },
        open(event, interactionType) {
            if (menu) {
                menu.open(event, interactionType);
                return api;
            }
            if (!opened) {
                opened = true;
                if (!settings.listbox)
                    openerElement?.setAttribute("aria-expanded", "true");
                notify("open", { menu: api, originalEvent: event });
            }
            asked = [event, interactionType];
            load();
            return api;
        },
        close(event, restoreFocus = true, skipAnimation = false) {
            if (menu) {
                menu.close(event, restoreFocus, skipAnimation);
                return api;
            }
            if (opened) {
                opened = false;
                if (!settings.listbox)
                    openerElement?.setAttribute("aria-expanded", "false");
                notify("close", { menu: api, originalEvent: event });
            }
            return api;
        },
        isOpen: () => (menu ? menu.isOpen() : opened),
        setItems(items) {
            current = items;
            menu?.setItems(items);
            return api;
        },
        getItems: () => (menu ? menu.getItems() : current),
        setPosition(value) {
            if (menu)
                menu.setPosition(value);
            else
                position = value;
            return api;
        },
        getPosition: () => (menu ? menu.getPosition() : position),
        setSelected(value) {
            if (menu)
                menu.setSelected(value);
            else
                selected = value;
            return api;
        },
        on(event, handler) {
            if (menu)
                menu.on(event, handler);
            else {
                const set = listeners.get(event) ?? new Set();
                set.add(handler);
                listeners.set(event, set);
            }
            return api;
        },
        preload: () => {
            load();
        },
        whenReady: (callback) => {
            if (menu)
                callback();
            else if (!destroyed)
                ready.push(callback);
        },
        destroy() {
            destroyed = true;
            listeners.clear();
            ready = [];
            menu?.destroy();
        },
    };
    return api;
};
