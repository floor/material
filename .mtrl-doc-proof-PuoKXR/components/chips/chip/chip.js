import { getCleanup } from "../../../core/compose/cleanup.js";
import { pipe } from "../../../core/compose/pipe.js";
import { createBase, withElement } from "../../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../../core/compose/features/index.js";
import { createRipple } from "../../../core/compose/features/ripple.js";
import { createComponentConfig, createElementConfig } from "../../../core/config/component.js";
import { setHTML } from "../../../core/dom/html.js";
import { getIcon } from "../../../core/icons/registry.js";
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
const DROP_DOWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
const createChip = (config = {}) => {
    const options = createComponentConfig({ type: "filter", ripple: true }, config, "chip");
    const closeGlyph = getIcon("close", CLOSE);
    const menuGlyph = getIcon("expand-more", DROP_DOWN);
    const type = options.type ?? "filter";
    const selectable = type === "filter" || type === "input";
    const elementConfig = createElementConfig(options, { tag: "div" });
    if (type === "input")
        elementConfig.ariaLabel = undefined;
    const base = pipe(createBase, withEvents(), withElement(elementConfig), withLifecycle())(options);
    const root = base.element;
    const resources = getCleanup(base);
    resources.add(() => { options.onSelected = undefined; });
    root.classList.add(base.getClass(`chip--${type}`));
    if (options.elevated && type !== "input")
        root.classList.add(base.getClass("chip--elevated"));
    const action = document.createElement("button");
    action.type = "button";
    action.className = base.getClass("chip__action");
    if (selectable)
        action.setAttribute("role", "checkbox");
    root.append(action);
    if (options.ripple) {
        const ripple = createRipple();
        ripple.mount(action);
        resources.add(() => ripple.unmount(action));
    }
    const leading = document.createElement("span");
    leading.className = base.getClass("chip__leading-icon");
    leading.setAttribute("aria-hidden", "true");
    const check = document.createElement("span");
    check.className = base.getClass("chip__checkmark");
    check.setAttribute("aria-hidden", "true");
    setHTML(check, CHECK);
    const label = document.createElement("span");
    label.className = base.getClass("chip__label");
    const trailing = document.createElement("span");
    trailing.className = base.getClass("chip__trailing-icon");
    trailing.setAttribute("aria-hidden", "true");
    action.append(leading, check, label, trailing);
    let selected = selectable && !!options.selected;
    let disabled = !!options.disabled;
    let value = options.value ?? null;
    let leadingIcon = options.leadingIcon ?? options.icon ?? "";
    const avatar = type === "input" ? options.avatar : undefined;
    let trailingIcon = type === "suggestion" ? "" : options.trailingIcon ?? "";
    let remove;
    if (type === "input") {
        remove = document.createElement("button");
        remove.type = "button";
        remove.className = base.getClass("chip__remove");
        setHTML(remove, trailingIcon || closeGlyph);
        root.append(remove);
        root.setAttribute("role", "group");
    }
    let trailingAction;
    if (type === "filter" && options.onTrailingClick) {
        trailingAction = document.createElement("button");
        trailingAction.type = "button";
        trailingAction.className = base.getClass("chip__trailing-action");
        if (options.trailingMenu) {
            trailingAction.setAttribute("aria-haspopup", "menu");
            trailingAction.setAttribute("aria-expanded", "false");
        }
        setHTML(trailingAction, trailingIcon || (options.trailingMenu ? menuGlyph : closeGlyph));
        root.append(trailingAction);
        root.setAttribute("role", "group");
    }
    const oneActionCell = !!options.cell && !remove && !trailingAction;
    if (options.cell) {
        root.setAttribute("role", "gridcell");
        root.removeAttribute("aria-label");
        for (const button of [action, remove, trailingAction])
            if (button)
                button.tabIndex = -1;
    }
    if (oneActionCell) {
        root.tabIndex = -1;
        action.setAttribute("aria-hidden", "true");
        action.removeAttribute("role");
    }
    const render = () => {
        root.classList.toggle(base.getClass("chip--selected"), selected);
        root.classList.toggle(base.getClass("chip--disabled"), disabled);
        root.classList.toggle(base.getClass("chip--avatar"), !!avatar);
        action.disabled = disabled;
        if (oneActionCell) {
            root.setAttribute("aria-label", label.textContent ?? "");
            if (selectable)
                root.setAttribute("aria-selected", String(selected));
            root.setAttribute("aria-disabled", String(disabled));
        }
        else if (selectable)
            action.setAttribute("aria-checked", String(selected));
        leading.hidden = !avatar && (!leadingIcon || selected);
        check.hidden = !(selected && (type === "filter" || (type === "input" && !avatar)));
        trailing.hidden = !trailingIcon || !!remove || !!trailingAction;
        root.classList.toggle(base.getClass("chip--leading"), !leading.hidden || !check.hidden);
        root.classList.toggle(base.getClass("chip--trailing"), !trailing.hidden || !!remove || !!trailingAction);
        if (remove) {
            remove.disabled = disabled;
            remove.setAttribute("aria-label", options.removeLabel ?? `Remove ${label.textContent ?? ""}`);
        }
        if (trailingAction) {
            trailingAction.disabled = disabled;
            const text = label.textContent ?? "";
            trailingAction.setAttribute("aria-label", options.trailingLabel ?? (options.trailingMenu ? `${text} options` : `Remove ${text}`));
            if (!options.cell)
                root.setAttribute("aria-label", text);
        }
        if (options.ariaLabel)
            (oneActionCell ? root : action).setAttribute("aria-label", options.ariaLabel);
    };
    let made = false;
    const animateChanges = () => {
        if (made)
            root.classList.add(base.getClass("chip--motion"));
    };
    const setLabel = (text) => { label.textContent = text; render(); return api; };
    const setLeadingIcon = (icon) => {
        animateChanges();
        leadingIcon = icon;
        setHTML(leading, avatar || icon);
        render();
        return api;
    };
    const api = {
        element: root,
        action,
        trailingAction,
        getType: () => type,
        getValue() {
            const attribute = root.getAttribute("data-value");
            if (attribute !== null)
                return attribute;
            if (value === null && label.textContent) {
                value = label.textContent.replace(/ Theme$/, "").toLowerCase().replace(/\s+/g, "-");
            }
            if (value !== null)
                root.setAttribute("data-value", value);
            return value;
        },
        setValue(next) { value = next; root.setAttribute("data-value", next); return api; },
        enable() { disabled = false; render(); return api; },
        disable() { disabled = true; render(); return api; },
        isDisabled: () => disabled,
        setLabel,
        getLabel: () => label.textContent ?? "",
        setText: setLabel,
        getText: () => label.textContent ?? "",
        setIcon: setLeadingIcon,
        getIcon: () => leadingIcon,
        setLeadingIcon,
        setTrailingIcon(icon) {
            trailingIcon = type === "suggestion" ? "" : icon;
            if (trailingAction)
                setHTML(trailingAction, trailingIcon || (options.trailingMenu ? menuGlyph : closeGlyph));
            else
                setHTML(remove ?? trailing, trailingIcon || (remove ? closeGlyph : ""));
            render();
            return api;
        },
        isSelected: () => selected,
        setSelected(next) {
            animateChanges();
            selected = selectable && next;
            render();
            if (selected)
                options.onSelected?.(api);
            return api;
        },
        toggleSelected() { return api.setSelected(!selected); },
        focus() { (oneActionCell ? root : action).focus(); return api; },
        destroy: () => base.lifecycle.destroy(),
        on(event, handler) { base.on(event, handler); return api; },
        off(event, handler) { base.off(event, handler); return api; },
        addClass(...classes) { root.classList.add(...classes); return api; },
    };
    if (options.onChange)
        api.on("change", options.onChange);
    if (options.onClick)
        api.on("click", options.onClick);
    if (options.onRemove)
        api.on("remove", options.onRemove);
    if (options.onTrailingClick)
        api.on("trailing", options.onTrailingClick);
    const listen = (element, name, handler) => {
        element.addEventListener(name, handler);
        resources.add(() => element.removeEventListener(name, handler));
    };
    listen(root, "click", event => {
        if (disabled || resources.destroyed)
            return;
        const was = selected;
        base.emit("click", { event, originalEvent: event, element: root });
        if (!selectable || resources.destroyed)
            return;
        if (!options.managedSelection)
            api.toggleSelected();
        if (selected !== was)
            base.emit("change", { selected, chip: api, value: api.getValue() });
        if (!options.managedSelection)
            options.onSelect?.(api);
    });
    const removeFromKeyboard = (event) => {
        if (!remove || disabled || (event.key !== "Backspace" && event.key !== "Delete"))
            return false;
        event.preventDefault();
        remove.click();
        return true;
    };
    listen(action, "keydown", event => {
        if (removeFromKeyboard(event))
            return;
        if (!disabled)
            base.emit("keydown", { event, originalEvent: event, element: root });
    });
    for (const name of ["focus", "blur"]) {
        listen(action, name, event => base.emit(name, { event, originalEvent: event, element: root }));
    }
    if (remove) {
        listen(remove, "click", event => {
            event.stopPropagation();
            if (disabled)
                return;
            base.emit("remove", api);
            if (resources.destroyed)
                return;
            if (options.onRemoved)
                options.onRemoved(api);
            else
                root.remove();
        });
        listen(remove, "keydown", event => {
            if (removeFromKeyboard(event))
                return;
            if (event.key === "Enter" || event.key === " ")
                event.stopPropagation();
        });
    }
    if (trailingAction) {
        listen(trailingAction, "click", event => {
            event.stopPropagation();
            if (disabled)
                return;
            base.emit("trailing", api);
        });
        listen(trailingAction, "keydown", event => {
            if (event.key === "Enter" || event.key === " ")
                event.stopPropagation();
        });
    }
    if (oneActionCell) {
        listen(root, "keydown", event => {
            if (event.target !== root || (event.key !== "Enter" && event.key !== " "))
                return;
            event.preventDefault();
            if (!disabled)
                action.click();
        });
        const pointerFocus = { focusVisible: false };
        const pointerClass = base.getClass("chip--pointer-focus");
        listen(action, "mousedown", event => {
            event.preventDefault();
            root.classList.add(pointerClass);
            root.focus(pointerFocus);
        });
        listen(root, "keydown", () => root.classList.remove(pointerClass));
        listen(root, "blur", () => root.classList.remove(pointerClass));
    }
    listen(root, "dragstart", () => root.classList.add(base.getClass("chip--dragged")));
    listen(root, "dragend", () => root.classList.remove(base.getClass("chip--dragged")));
    label.textContent = options.label ?? "";
    setHTML(leading, avatar || leadingIcon);
    setHTML(trailing, trailingIcon);
    render();
    api.getValue();
    made = true;
    return api;
};
export default createChip;
