import { processClassNames } from "../../core/config/component.js";
import createTextField from "../text-field/index.js";
import { createOnDemandMenu } from "../menu/on-demand.js";
import { MENU } from "../menu/inner.js";
import { warnUnknownValue } from "../../core/utils/warn.js";
import { activeElementOf } from "../../core/dom/focus.js";
import { getIcon } from "../../core/icons/registry.js";
export const withTextField = (config) => (component) => {
    let initialText = "";
    if (config.value) {
        const option = (config.options || []).find((opt) => opt.id === config.value);
        if (option) {
            initialText = option.text;
        }
    }
    const dropdownIcon = getIcon("expand-more", '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7 10l5 5 5-5H7z"/></svg>');
    const textField = createTextField({
        class: processClassNames(config.className || ""),
        label: config.label,
        variant: config.variant || "filled",
        density: config.density || "default",
        value: initialText,
        name: config.name,
        disabled: config.disabled,
        required: config.required,
        supportingText: config.supportingText,
        error: config.error,
        trailingIcon: dropdownIcon,
        readonly: true,
    });
    textField.element.classList.add(`${config.prefix || "mtrl"}-select`);
    if (textField.input) {
        if (config.ariaLabel)
            textField.input.setAttribute("aria-label", config.ariaLabel);
        const input = textField.input;
        input.addEventListener("keydown", (e) => {
            const allowedKeys = [
                "Tab",
                "Escape",
                "ArrowDown",
                "ArrowUp",
                "ArrowLeft",
                "ArrowRight",
                "Enter",
                " ",
                "Home",
                "End",
            ];
            if (!allowedKeys.includes(e.key)) {
                e.preventDefault();
            }
        });
        textField.input.addEventListener("paste", (e) => {
            e.preventDefault();
        });
        textField.input.addEventListener("cut", (e) => {
            e.preventDefault();
        });
    }
    return {
        ...component,
        element: textField.element,
        textField,
    };
};
const isSelectOption = (value) => typeof value === "object" && value !== null && "id" in value && "text" in value;
const isDivider = (option) => "type" in option && option.type === "divider";
const processMenuItems = (options) => {
    return options.map((option) => {
        if (isDivider(option)) {
            return option;
        }
        const menuItem = {
            id: option.id.toString(),
            text: option.text,
            icon: option.icon,
            disabled: option.disabled,
            hasSubmenu: false,
            data: option,
        };
        if (option.hasSubmenu && Array.isArray(option.submenu)) {
            menuItem.hasSubmenu = true;
            menuItem.submenu = processMenuItems(option.submenu);
        }
        return menuItem;
    });
};
const setupCombobox = (component, textField, menu, state, choose, prefix) => {
    const input = textField.input;
    const field = textField.element;
    const activeClass = `${prefix}-menu__item--active`;
    const keyboardClass = `${prefix}-menu__item--keyboard-active`;
    const TYPEAHEAD_DELAY = 500;
    const PAGE = 10;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-haspopup", "listbox");
    input.setAttribute("aria-expanded", "false");
    let active = null;
    let keyboard = false;
    let pending = "selected";
    let buffer = "";
    let bufferTimer = null;
    let queued = "";
    const options = () => Array.from(menu.element.querySelectorAll('[role="option"]'));
    const enabled = () => options().filter((option) => option.getAttribute("aria-disabled") !== "true" && option.checkVisibility?.() !== false);
    const optionFor = (element) => element
        ? state.options.find((option) => String(option.id) === element.getAttribute("data-id"))
        : undefined;
    const setActive = (element) => {
        active = element;
        options().forEach((option) => {
            option.classList.toggle(activeClass, option === element);
            option.classList.toggle(keyboardClass, option === element && keyboard);
        });
        if (element) {
            input.setAttribute("aria-activedescendant", element.id);
            element.scrollIntoView?.({ block: "nearest" });
        }
        else {
            input.removeAttribute("aria-activedescendant");
        }
    };
    const placeActive = () => {
        const list = enabled();
        if (!list.length)
            return setActive(null);
        if (pending === "first")
            return setActive(list[0]);
        if (pending === "last")
            return setActive(list[list.length - 1]);
        const selectedId = state.selectedOption ? String(state.selectedOption.id) : null;
        const selected = list.find((option) => option.getAttribute("data-id") === selectedId);
        setActive(selectedId ? selected ?? null : list[0]);
    };
    const open = (start, event) => {
        pending = start;
        menu.open(event, "keyboard");
    };
    const close = (event) => {
        menu.close(event, false);
    };
    const commit = (event) => {
        const option = optionFor(active);
        if (option)
            choose(option, event);
        close(event);
    };
    const move = (index) => {
        const list = enabled();
        if (!list.length)
            return;
        setActive(list[Math.max(0, Math.min(index, list.length - 1))]);
    };
    const typeahead = (key) => {
        if (bufferTimer)
            clearTimeout(bufferTimer);
        bufferTimer = setTimeout(() => {
            buffer = "";
            bufferTimer = null;
        }, TYPEAHEAD_DELAY);
        buffer += key.toLowerCase();
        const list = enabled();
        const start = active ? list.indexOf(active) + (buffer.length === 1 ? 1 : 0) : 0;
        const ordered = [...list.slice(start), ...list.slice(0, start)];
        const match = ordered.find((option) => (option.textContent || "").trim().toLowerCase().startsWith(buffer));
        if (match)
            setActive(match);
        return !!match;
    };
    const connect = () => {
        const list = menu.element.querySelector('[role="listbox"]');
        if (list?.id)
            input.setAttribute("aria-controls", list.id);
        placeActive();
        const typed = queued;
        queued = "";
        for (const key of typed)
            typeahead(key);
    };
    const place = () => {
        if (!menu.isOpen())
            return;
        if (menu.element.querySelector('[role="listbox"]'))
            connect();
        else
            setTimeout(() => {
                if (menu.isOpen() && menu.element.querySelector('[role="listbox"]'))
                    connect();
            }, 0);
    };
    menu.on("open", () => {
        input.setAttribute("aria-expanded", "true");
        place();
    });
    menu.whenReady(place);
    menu.on("close", () => {
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-controls");
        setActive(null);
        pending = "selected";
        queued = "";
    });
    input.addEventListener("keydown", (e) => {
        if (input.disabled)
            return;
        keyboard = true;
        const isOpen = menu.isOpen();
        const list = enabled();
        const index = active ? list.indexOf(active) : -1;
        if (e.altKey && e.key === "ArrowDown") {
            e.preventDefault();
            if (!isOpen)
                open("selected", e);
            return;
        }
        if (e.altKey && e.key === "ArrowUp") {
            e.preventDefault();
            if (isOpen)
                commit(e);
            return;
        }
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                if (!isOpen)
                    open("selected", e);
                else
                    move(index + 1);
                return;
            case "ArrowUp":
                e.preventDefault();
                if (!isOpen)
                    open("selected", e);
                else
                    move(index - 1);
                return;
            case "Home":
                e.preventDefault();
                if (!isOpen)
                    open("first", e);
                else
                    move(0);
                return;
            case "End":
                e.preventDefault();
                if (!isOpen)
                    open("last", e);
                else
                    move(list.length - 1);
                return;
            case "PageDown":
                if (!isOpen)
                    return;
                e.preventDefault();
                move(index + PAGE);
                return;
            case "PageUp":
                if (!isOpen)
                    return;
                e.preventDefault();
                move(index - PAGE);
                return;
            case "Enter":
                e.preventDefault();
                if (isOpen)
                    commit(e);
                else
                    open("selected", e);
                return;
            case "Escape":
                if (!isOpen)
                    return;
                e.preventDefault();
                close(e);
                return;
            case "Tab":
                if (isOpen)
                    commit(e);
                return;
            default:
                break;
        }
        if (e.key === " " && !buffer && !queued) {
            e.preventDefault();
            if (isOpen)
                commit(e);
            else
                open("selected", e);
            return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            if (!isOpen)
                open("selected", e);
            if (!options().length) {
                queued += e.key;
            }
            else if (!isOpen) {
                setTimeout(() => typeahead(e.key), 0);
            }
            else {
                typeahead(e.key);
            }
        }
    });
    field.addEventListener("mousedown", (e) => {
        keyboard = false;
        if (input.disabled || menu.element.contains(e.target) || e.target === input)
            return;
        e.preventDefault();
        input.focus();
    });
    field.addEventListener("click", (e) => {
        keyboard = false;
        if (input.disabled || menu.element.contains(e.target))
            return;
        if (menu.isOpen())
            close(e);
        else
            open("selected", e);
    });
    input.addEventListener("blur", (e) => {
        const next = e.relatedTarget;
        if (menu.isOpen() && !field.contains(next) && !menu.element.contains(next))
            close(e);
    });
};
export const withMenu = (config, getComponent) => (component) => {
    if (!component.textField) {
        console.warn("Cannot add menu: text field not found");
        return component;
    }
    const textField = component.textField;
    const state = {
        options: config.options || [],
        selectedOption: null,
    };
    if (config.value) {
        state.selectedOption = state.options.find((opt) => opt.id === config.value) ?? null;
    }
    const menuItems = processMenuItems(state.options);
    const initialItems = config.menu?.items ?? menuItems;
    const listbox = !state.options.some((option) => option && option.hasSubmenu);
    const menu = createOnDemandMenu({
        opener: component.textField,
        positionTarget: component.textField.field,
        position: (config.placement || "bottom-start"),
        width: "100%",
        class: `${config.prefix || "mtrl"}-select__menu`,
        closeOnSelect: true,
        closeOnClickOutside: true,
        closeOnEscape: true,
        closeOnResize: true,
        offset: 0,
        container: component.element,
        ...(config.layer ? { layer: config.layer } : {}),
        ...(listbox ? { manualOpen: true, listbox: true, closeOnEscape: false } : {}),
        ...(config.menu ?? {}),
    }, initialItems);
    const preload = () => menu.preload();
    textField.element.addEventListener("pointerdown", preload, { once: true, passive: true });
    textField.input.addEventListener("focus", preload, { once: true });
    const choose = (option, originalEvent) => {
        state.selectedOption = option;
        textField.setValue(option.text);
        menu.setSelected(option.id);
        if (component.emit) {
            component.emit("change", {
                select: getComponent(),
                value: state.selectedOption?.id || null,
                text: option.text,
                option,
                originalEvent,
            });
        }
    };
    menu.on("select", (event) => {
        if (!event.item || event.item.hasSubmenu) {
            return;
        }
        const option = event.item.data;
        if (!isSelectOption(option)) {
            console.warn("Invalid menu selection: missing required data properties");
            return;
        }
        choose(option, event.originalEvent);
    });
    if (listbox) {
        setupCombobox(component, textField, menu, state, choose, config.prefix || "mtrl");
    }
    if (!listbox)
        textField.element.addEventListener("keydown", (e) => {
            if (textField.input.disabled)
                return;
            if ((e.key === "Enter" || e.key === " " || e.key === "ArrowDown") &&
                !menu.isOpen()) {
                e.preventDefault();
                menu.open(e, "keyboard");
            }
            else if (e.key === "Escape" && menu.isOpen()) {
                e.preventDefault();
                menu.close(e);
            }
        });
    menu.on("open", () => {
        if (component.emit) {
            component.emit("open", {
                select: getComponent(),
                originalEvent: null,
            });
        }
        textField.element.classList.add(`${config.prefix || "mtrl"}-select--open`);
        const PREFIX = config.prefix || "mtrl";
        textField.element.classList.add(`${PREFIX}-text-field--focused`);
        if (textField.element.classList.contains(`${PREFIX}-text-field--filled`)) {
            textField.element.classList.add(`${PREFIX}-text-field--filled-focused`);
        }
    });
    menu.on("close", (event) => {
        textField.element.classList.remove(`${config.prefix || "mtrl"}-select--open`);
        setTimeout(() => {
            const PREFIX = config.prefix || "mtrl";
            const active = activeElementOf(textField.element);
            const isFocused = active === textField.input || textField.element.contains(active);
            if (isFocused) {
                textField.element.classList.add(`${PREFIX}-text-field--focused`);
                if (textField.element.classList.contains(`${PREFIX}-text-field--filled`)) {
                    textField.element.classList.add(`${PREFIX}-text-field--filled-focused`);
                }
            }
            else {
                textField.element.classList.remove(`${PREFIX}-text-field--focused`);
                if (textField.element.classList.contains(`${PREFIX}-text-field--filled`)) {
                    textField.element.classList.remove(`${PREFIX}-text-field--filled-focused`);
                }
            }
        }, 10);
        if (component.emit) {
            component.emit("close", {
                select: getComponent(),
                originalEvent: event.originalEvent,
            });
        }
    });
    const markSelectedMenuItem = () => {
        if (!state.selectedOption)
            return;
        menu.setSelected(state.selectedOption.id);
    };
    menu.on("open", () => {
        setTimeout(markSelectedMenuItem, 50);
    });
    return {
        ...component,
        [MENU]: menu,
        select: {
            getValue: () => state.selectedOption?.id || null,
            setValue: (value) => {
                if (value === null || value === undefined || value === "") {
                    state.selectedOption = null;
                    textField.setValue("");
                    menu.setSelected(null);
                    return component;
                }
                const option = state.options.find((opt) => "id" in opt && opt.id === value);
                if (option && "text" in option) {
                    state.selectedOption = option;
                    textField.setValue(option.text);
                    menu.setSelected(option.id);
                    return component;
                }
                state.selectedOption = null;
                textField.setValue("");
                menu.setSelected(null);
                warnUnknownValue("select", value);
                return component;
            },
            clear: () => {
                state.selectedOption = null;
                textField.setValue("");
                menu.setSelected(null);
                return component;
            },
            getText: () => state.selectedOption?.text || "",
            getSelectedOption: () => state.selectedOption,
            getOptions: () => [...state.options],
            setOptions: (options) => {
                state.options = options;
                const menuItems = processMenuItems(options);
                menu.setItems(menuItems);
                const selected = state.selectedOption;
                if (selected &&
                    !options.find((opt) => "id" in opt && opt.id === selected.id)) {
                    state.selectedOption = null;
                    textField.setValue("");
                }
                return component;
            },
            open: (event, interactionType = "mouse") => {
                menu.open(event, interactionType);
                return component;
            },
            close: (event) => {
                menu.close(event);
                return component;
            },
            isOpen: () => menu.isOpen(),
        },
    };
};
