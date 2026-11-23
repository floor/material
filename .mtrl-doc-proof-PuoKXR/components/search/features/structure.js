import { SEARCH_CLASSES, SEARCH_ICONS, SEARCH_STATES } from "../constants.js";
import { createElement } from "../../../core/dom/create.js";
import { setHTML } from "../../../core/dom/html.js";
import { PREFIX } from "../../../core/config.js";
import { processClassNames } from "../../../core/config/component.js";
import { decorativeIconsOn } from "../../../core/compose/features/icon-opt-in.js";
const libraryGlyph = (html) => html === SEARCH_ICONS.SEARCH || html === SEARCH_ICONS.BACK || html === SEARCH_ICONS.CLEAR;
export const paintNamedIcon = (host, html) => {
    if (!decorativeIconsOn()) {
        setHTML(host, html);
        return;
    }
    if (libraryGlyph(html)) {
        setHTML(host, html);
        host.querySelector("svg")?.setAttribute("aria-hidden", "true");
        return;
    }
    const wrap = document.createElement("span");
    wrap.setAttribute("aria-hidden", "true");
    setHTML(wrap, html);
    host.replaceChildren(wrap);
};
let searches = 0;
export const withStructure = (config) => (component) => {
    const isDisabled = config.disabled === true;
    const initialState = config.initialState || SEARCH_STATES.BAR;
    const isViewState = initialState === SEARCH_STATES.VIEW;
    const placeholder = config.placeholder || "Search";
    const value = config.value || "";
    const getClass = (className) => {
        return component.getClass ? component.getClass(className) : className;
    };
    const rootClasses = [
        getClass(SEARCH_CLASSES.ROOT),
        getClass(initialState === SEARCH_STATES.BAR
            ? SEARCH_CLASSES.STATE_BAR
            : SEARCH_CLASSES.STATE_VIEW),
        getClass(config.viewMode === "fullscreen"
            ? SEARCH_CLASSES.VIEW_FULLSCREEN
            : SEARCH_CLASSES.VIEW_DOCKED),
        getClass(config.variant === "divided"
            ? SEARCH_CLASSES.VARIANT_DIVIDED
            : SEARCH_CLASSES.VARIANT_CONTAINED),
        processClassNames(config.className || ""),
    ];
    if (config.fullWidth) {
        rootClasses.push(getClass(SEARCH_CLASSES.FULL_WIDTH));
    }
    if (isDisabled) {
        rootClasses.push(getClass(SEARCH_CLASSES.DISABLED));
    }
    if (value) {
        rootClasses.push(getClass(SEARCH_CLASSES.POPULATED));
    }
    component.element.className = rootClasses.filter(Boolean).join(" ");
    component.element.setAttribute("role", "search");
    const prefix = config.prefix ?? PREFIX;
    if (typeof config.minWidth === "number")
        component.element.style.setProperty(`--${prefix}-search-min-width`, `${config.minWidth}px`);
    if (typeof config.maxWidth === "number")
        component.element.style.setProperty(`--${prefix}-search-max-width`, `${config.maxWidth}px`);
    component.element.setAttribute("aria-disabled", isDisabled ? "true" : "false");
    const surface = createElement({
        tag: "dialog",
        className: getClass(SEARCH_CLASSES.SURFACE),
        container: component.element,
        attributes: isViewState && config.viewMode === "fullscreen"
            ? { "aria-label": config.ariaLabel || placeholder }
            : { role: "none" },
    });
    const container = createElement({
        tag: "div",
        className: getClass(SEARCH_CLASSES.CONTAINER),
        container: surface,
    });
    const leadingIconHtml = isViewState
        ? SEARCH_ICONS.BACK
        : config.leadingIcon || SEARCH_ICONS.SEARCH;
    const leadingIcon = createElement({
        tag: "button",
        className: getClass(SEARCH_CLASSES.LEADING_ICON),
        container,
        attributes: {
            type: "button",
            tabindex: isDisabled ? "-1" : "0",
            "aria-label": isViewState ? "Go back" : "Search",
        },
    });
    paintNamedIcon(leadingIcon, leadingIconHtml);
    const inputWrapper = createElement({
        tag: "div",
        className: getClass(SEARCH_CLASSES.INPUT_WRAPPER),
        container,
    });
    const id = `${getClass(SEARCH_CLASSES.ROOT)}-${++searches}`;
    const inputAttributes = {
        type: "text",
        placeholder,
        "aria-label": config.ariaLabel || placeholder,
        role: "combobox",
        "aria-autocomplete": "list",
        "aria-expanded": String(isViewState),
        "aria-controls": `${id}-listbox`,
    };
    if (value) {
        inputAttributes.value = value;
    }
    if (config.name) {
        inputAttributes.name = config.name;
    }
    if (isDisabled) {
        inputAttributes.disabled = "disabled";
    }
    const input = createElement({
        tag: "input",
        className: getClass(SEARCH_CLASSES.INPUT),
        container: inputWrapper,
        attributes: inputAttributes,
    });
    if (value) {
        input.value = value;
    }
    let clearButton = null;
    if (config.showClearButton !== false) {
        const clearButtonClasses = [getClass(SEARCH_CLASSES.CLEAR_BUTTON)];
        if (!value) {
            clearButtonClasses.push(getClass(SEARCH_CLASSES.CLEAR_BUTTON_HIDDEN));
        }
        clearButton = createElement({
            tag: "button",
            className: clearButtonClasses.join(" "),
            container,
            attributes: {
                type: "button",
                tabindex: isDisabled || !value ? "-1" : "0",
                "aria-label": "Clear search",
            },
        });
        paintNamedIcon(clearButton, SEARCH_ICONS.CLEAR);
    }
    const trailingContainer = createElement({
        tag: "div",
        className: getClass("search__trailing"),
        container,
    });
    const createTrailingItem = (item) => {
        const avatar = item.type === "avatar";
        const button = !avatar || typeof item.onClick === "function";
        const attributes = { "data-trailing-id": item.id };
        if (button)
            attributes.type = "button";
        if (button && isDisabled)
            attributes.tabindex = "-1";
        if (item.ariaLabel)
            attributes["aria-label"] = item.ariaLabel;
        if (!button)
            Object.assign(attributes, item.ariaLabel ? { role: "img" } : { "aria-hidden": "true" });
        const element = createElement({
            tag: button ? "button" : "div",
            className: getClass(avatar ? SEARCH_CLASSES.AVATAR : SEARCH_CLASSES.TRAILING_ICON),
            attributes,
        });
        if (button || item.ariaLabel)
            paintNamedIcon(element, item.content);
        else
            setHTML(element, item.content);
        if (item.onClick)
            element.addEventListener("click", item.onClick);
        return element;
    };
    const trailing = {
        set(items) {
            trailingContainer.replaceChildren(...items.map(createTrailingItem));
        },
        add(item) {
            trailingContainer.append(createTrailingItem(item));
        },
        remove(id) {
            Array.from(trailingContainer.children).find(element => element.dataset.trailingId === id)?.remove();
        },
    };
    trailing.set(config.trailingItems ?? []);
    const setLeadingIcon = (html) => {
        config.leadingIcon = html;
        if (!component.element.classList.contains(getClass(SEARCH_CLASSES.STATE_VIEW)))
            paintNamedIcon(leadingIcon, html);
    };
    let divider = null;
    let contentArea = null;
    let suggestionsContainer = null;
    let suggestionsList = null;
    divider = createElement({
        tag: "div",
        className: getClass(SEARCH_CLASSES.DIVIDER),
    });
    contentArea = createElement({
        tag: "div",
        className: getClass(SEARCH_CLASSES.CONTENT),
    });
    suggestionsContainer = createElement({
        tag: "div",
        className: getClass(SEARCH_CLASSES.SUGGESTIONS),
        container: contentArea,
    });
    suggestionsList = createElement({
        tag: "ul",
        className: getClass(SEARCH_CLASSES.SUGGESTION_LIST),
        container: suggestionsContainer,
        attributes: {
            id: `${id}-listbox`,
            role: "listbox",
            "aria-label": "Search suggestions",
        },
    });
    const status = createElement({
        tag: "div",
        className: getClass(SEARCH_CLASSES.STATUS),
        container: component.element,
        attributes: { role: "status", "aria-live": "polite" },
    });
    surface.appendChild(divider);
    surface.appendChild(contentArea);
    const structure = {
        surface,
        container,
        input,
        inputWrapper,
        leadingIcon,
        clearButton,
        trailingContainer,
        divider,
        suggestionsContainer,
        suggestionsList,
        status,
    };
    return {
        ...component,
        structure,
        trailing,
        setLeadingIcon,
    };
};
