import { safeUrl } from "../utils/url.js";
import { setHTML } from "../dom/html.js";
import { activeElementOf } from "../dom/focus.js";
const BADGE_MAX_CHARACTERS = 4;
const formatBadgeText = (badge) => {
    const text = String(badge);
    if (text.length <= BADGE_MAX_CHARACTERS)
        return text;
    const numeric = Number(badge);
    if (Number.isNaN(numeric))
        return text.slice(0, BADGE_MAX_CHARACTERS);
    return numeric >= 1000 ? "999+" : `${text.slice(0, BADGE_MAX_CHARACTERS - 1)}+`;
};
const isEmptyBadgeText = (text) => text === "" || text === "0";
export const copyDestinations = (items, component) => {
    const ids = new Set();
    let selected = false;
    return items.map((item) => {
        if (!item.id || !item.label || !item.icon || ids.has(item.id))
            throw new Error(`${component} destinations require unique IDs, labels, and icons`);
        ids.add(item.id);
        const active = !!item.active && !item.disabled && !selected;
        selected ||= active;
        return { ...item, active };
    });
};
export const updateBadge = (item, element, cls) => {
    let badge = element.querySelector(`.${cls("__badge")}`);
    const dot = item.badge === true;
    const text = dot ? "" : formatBadgeText(String(item.badge ?? ""));
    const visible = dot || (item.badge !== undefined && item.badge !== null && item.badge !== false && !isEmptyBadgeText(text));
    if (!visible) {
        badge?.remove();
        element.classList.remove(cls("__item--badged"));
        element.setAttribute("aria-label", item.label);
        return;
    }
    if (!badge) {
        badge = document.createElement("span");
        badge.className = cls("__badge");
        badge.setAttribute("aria-hidden", "true");
        element.querySelector(`.${cls("__content")}`).append(badge);
    }
    badge.classList.toggle(cls("__badge--dot"), dot);
    badge.textContent = text;
    element.classList.toggle(cls("__item--badged"), !dot);
    element.setAttribute("aria-label", `${item.label}, ${item.badgeLabel || (dot ? "New notification" : text)}`);
};
export const createDestination = (item, cls) => {
    const element = document.createElement(item.href ? "a" : "button");
    if (item.href) {
        if (!item.disabled)
            element.setAttribute("href", safeUrl(item.href));
        else {
            element.setAttribute("role", "link");
            element.tabIndex = -1;
        }
    }
    else {
        element.setAttribute("type", "button");
        if (item.disabled)
            element.setAttribute("disabled", "");
    }
    if (item.disabled)
        element.setAttribute("aria-disabled", "true");
    element.className = cls("__item");
    element.dataset.id = item.id;
    const indicator = document.createElement("span");
    indicator.className = cls("__indicator");
    indicator.setAttribute("aria-hidden", "true");
    const icon = document.createElement("span");
    icon.className = cls("__icon");
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = cls("__label");
    label.textContent = item.label;
    const content = document.createElement("span");
    content.className = cls("__content");
    content.append(indicator, icon, label);
    element.append(content);
    updateBadge(item, element, cls);
    return element;
};
export const updateSelection = (items, nodes, cls) => {
    for (const item of items) {
        const element = nodes.get(item.id);
        element.classList.toggle(cls("__item--active"), !!item.active);
        if (item.active)
            element.setAttribute("aria-current", "page");
        else
            element.removeAttribute("aria-current");
        const icon = element.querySelector(`.${cls("__icon")}`);
        setHTML(icon, item.active && item.activeIcon ? item.activeIcon : item.icon);
    }
};
export const moveDestinationFocus = (event, nodes, container, keys) => {
    const enabled = [...nodes.values()].filter((element) => !element.hasAttribute("aria-disabled"));
    const index = enabled.indexOf(activeElementOf(container));
    if (index < 0 || event.altKey || event.ctrlKey || event.metaKey)
        return false;
    let next;
    switch (event.key) {
        case keys.next:
            next = (index + 1) % enabled.length;
            break;
        case keys.previous:
            next = (index + enabled.length - 1) % enabled.length;
            break;
        case "Home":
            next = 0;
            break;
        case "End":
            next = enabled.length - 1;
            break;
        default: return false;
    }
    event.preventDefault();
    enabled[next].focus();
    return true;
};
