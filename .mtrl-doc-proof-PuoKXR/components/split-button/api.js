import { MENU } from "../menu/inner.js";
import { makeMenu } from "./features/menu.js";
import { SPLIT_BUTTON_CLASSES, SPLIT_BUTTON_EVENTS } from "./constants.js";
export const withAPI = ({ config, lifecycle }) => (component) => {
    const element = component.element;
    const prefix = config.prefix || "mtrl";
    const { leading, trailing } = component;
    let menu = component[MENU];
    const expandedClass = `${prefix}-${SPLIT_BUTTON_CLASSES.EXPANDED}`;
    let expanded = false;
    let destroyed = false;
    const emit = (type, extra = {}) => {
        component.emit?.(type, {
            splitButton: api,
            expanded,
            originalEvent: null,
            ...extra,
        });
    };
    const setExpanded = (next, originalEvent = null, interactionType) => {
        if (expanded === next)
            return;
        expanded = next;
        element.classList.toggle(expandedClass, expanded);
        trailing.element.setAttribute("aria-expanded", String(expanded));
        if (menu) {
            if (expanded)
                menu.open(originalEvent ?? undefined, interactionType);
            else
                menu.close(originalEvent ?? undefined);
        }
        emit(expanded ? SPLIT_BUTTON_EVENTS.EXPAND : SPLIT_BUTTON_EVENTS.COLLAPSE, { originalEvent });
        emit(SPLIT_BUTTON_EVENTS.CHANGE, { originalEvent });
    };
    const api = {
        element,
        leadingElement: leading.element,
        trailingElement: trailing.element,
        [MENU]: menu,
        setItems(items) {
            if (destroyed)
                return this;
            if (menu)
                menu.setItems(items);
            else if (items.length) {
                wire((api[MENU] = menu = makeMenu(config, trailing.element, items)));
                if (expanded)
                    menu.open();
            }
            return this;
        },
        getItems() {
            return menu ? menu.getItems() : [];
        },
        setText(text) {
            leading.setText(text);
            return this;
        },
        getText() {
            return leading.getText();
        },
        setIcon(icon) {
            leading.setIcon(icon);
            return this;
        },
        expand() {
            setExpanded(true);
            return this;
        },
        collapse() {
            setExpanded(false);
            return this;
        },
        isExpanded() {
            return expanded;
        },
        disable() {
            leading.disable();
            trailing.disable();
            return this;
        },
        enable() {
            leading.enable();
            trailing.enable();
            return this;
        },
        isDisabled() {
            return leading.element.disabled === true;
        },
        on(event, handler) {
            component.on?.(event, handler);
            return this;
        },
        off(event, handler) {
            component.off?.(event, handler);
            return this;
        },
        destroy() {
            destroyed = true;
            trailing.element.removeEventListener("keydown", handleTrailingKeydown);
            menu?.destroy?.();
            leading.destroy();
            trailing.destroy();
            element.remove();
            lifecycle.destroy();
        },
    };
    leading.on("click", ({ originalEvent: event }) => {
        emit(SPLIT_BUTTON_EVENTS.CLICK, { originalEvent: event });
    });
    const interactionOf = (event) => event instanceof MouseEvent && event.detail === 0 ? "keyboard" : "mouse";
    trailing.on("click", ({ originalEvent: event }) => {
        setExpanded(!expanded, event, interactionOf(event));
    });
    const handleTrailingKeydown = (event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp")
            return;
        event.preventDefault();
        if (!expanded)
            setExpanded(true, event, "keyboard");
    };
    trailing.element.addEventListener("keydown", handleTrailingKeydown);
    const wire = (menu) => {
        trailing.element.setAttribute("aria-haspopup", "menu");
        menu.on?.("close", () => {
            if (!expanded)
                return;
            expanded = false;
            element.classList.remove(expandedClass);
            trailing.element.setAttribute("aria-expanded", "false");
            emit(SPLIT_BUTTON_EVENTS.COLLAPSE);
            emit(SPLIT_BUTTON_EVENTS.CHANGE);
        });
        menu.on?.("select", (event) => {
            const item = event?.item;
            emit(SPLIT_BUTTON_EVENTS.SELECT, { item, value: item && "id" in item ? (item.id ?? null) : null });
        });
    };
    if (menu)
        wire(menu);
    if (config.onClick)
        api.on(SPLIT_BUTTON_EVENTS.CLICK, config.onClick);
    if (config.onSelect)
        api.on(SPLIT_BUTTON_EVENTS.SELECT, config.onSelect);
    if (config.on) {
        for (const [type, handler] of Object.entries(config.on)) {
            if (handler)
                api.on(type, handler);
        }
    }
    return api;
};
