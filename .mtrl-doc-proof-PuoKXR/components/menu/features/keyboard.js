import { createMenuTasks } from "./tasks.js";
import { activeElementOf } from "../../../core/dom/focus.js";
export const createKeyboardNavigation = (component) => {
    const tasks = createMenuTasks();
    let isTabNavigation = false;
    let typeaheadBuffer = "";
    let typeaheadTimeout = null;
    const TYPEAHEAD_DELAY = 500;
    let tabTimeout = null;
    const handleTabKey = (e) => {
        isTabNavigation = e.key === "Tab";
        tasks.clearTimeout(tabTimeout);
        tabTimeout = tasks.setTimeout(() => { isTabNavigation = false; }, 100);
    };
    document.addEventListener("keydown", handleTabKey);
    const handlers = new Map();
    const removeKeyboardHandlers = (element) => {
        const handler = handlers.get(element);
        if (handler)
            element.removeEventListener("keydown", handler);
        handlers.delete(element);
    };
    const destroy = () => {
        tasks.destroy();
        document.removeEventListener("keydown", handleTabKey);
        handlers.forEach((_, element) => removeKeyboardHandlers(element));
        resetTypeahead();
        isTabNavigation = false;
        tabTimeout = null;
    };
    const getFocusableElements = () => {
        const focusableElementsString = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const elements = document.querySelectorAll(focusableElementsString);
        return Array.from(elements).filter((element) => {
            return (element.offsetParent !== null && !element.classList.contains("hidden"));
        });
    };
    const parentItemOf = (menuElement) => {
        const parentId = menuElement.getAttribute("data-parent-item");
        if (!parentId)
            return null;
        const level = parseInt(menuElement.getAttribute("data-level") || "1", 10);
        const owner = component.element.id;
        const scope = level <= 1
            ? component.element
            : Array.from(menuElement.getRootNode().querySelectorAll(`.${component.getClass("menu--submenu")}`)).find((candidate) => (!owner || candidate.getAttribute("data-owner") === owner) &&
                candidate.getAttribute("data-level") === String(level - 1));
        return Array.from((scope ?? component.element).querySelectorAll(`.${component.getClass("menu__item")}`)).find((candidate) => candidate.getAttribute("data-id") === parentId) ?? null;
    };
    const menuItems = (menuElement) => Array.from(menuElement.querySelectorAll(`.${component.getClass("menu__item")}`)).filter((item) => item.checkVisibility?.() !== false);
    const resetTypeahead = () => {
        typeaheadBuffer = "";
        if (typeaheadTimeout) {
            tasks.clearTimeout(typeaheadTimeout);
            typeaheadTimeout = null;
        }
    };
    const handleInitialFocus = (menuElement, interactionType, openingEvent) => {
        resetTypeahead();
        const items = menuItems(menuElement);
        const last = openingEvent instanceof KeyboardEvent &&
            (openingEvent.key === "ArrowUp" || openingEvent.key === "Up");
        const target = last
            ? [...items].reverse().find((item) => !item.classList.contains(component.getClass("menu__item--disabled"))) ?? items[items.length - 1]
            : items[0];
        items.forEach((item) => item.setAttribute("tabindex", "-1"));
        target?.setAttribute("tabindex", "0");
        const focused = activeElementOf(menuElement);
        if (focused !== menuElement && menuElement.contains(focused) ||
            focused?.closest(`.${component.getClass("menu--submenu")}`)?.getAttribute("data-owner") === menuElement.id)
            return;
        if (interactionType === "keyboard" && items.length > 0) {
            target.focus();
            return;
        }
        menuElement.setAttribute("tabindex", "-1");
        menuElement.focus();
    };
    const handleMenuKeydown = (e, state, actions) => {
        const target = e.target;
        const targetMenu = (target?.closest?.(`.${component.getClass("menu")}`) ??
            null);
        const menuElement = targetMenu ?? component.element;
        const isSubmenu = !!targetMenu &&
            targetMenu.classList.contains(component.getClass("menu--submenu"));
        const items = menuItems(menuElement);
        if (items.length === 0)
            return;
        const focusedElement = activeElementOf(menuElement);
        let focusedItemIndex = -1;
        if (focusedElement && items.includes(focusedElement)) {
            focusedItemIndex = items.indexOf(focusedElement);
        }
        const focusItem = (index) => {
            if (items[index]) {
                items[index].focus();
            }
        };
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            typeaheadBuffer += e.key.toLowerCase();
            if (typeaheadTimeout) {
                tasks.clearTimeout(typeaheadTimeout);
            }
            typeaheadTimeout = tasks.setTimeout(() => {
                typeaheadBuffer = "";
                typeaheadTimeout = null;
            }, TYPEAHEAD_DELAY);
            const matchIndex = items.findIndex((item) => {
                const textElement = item.querySelector(`.${component.getClass("menu__item-text")}`);
                const text = textElement?.textContent?.toLowerCase() || "";
                return text.startsWith(typeaheadBuffer);
            });
            if (matchIndex !== -1) {
                focusItem(matchIndex);
            }
            else if (typeaheadBuffer.length > 1) {
                const lastChar = typeaheadBuffer.slice(-1);
                const singleCharMatch = items.findIndex((item) => {
                    const textElement = item.querySelector(`.${component.getClass("menu__item-text")}`);
                    const text = textElement?.textContent?.toLowerCase() || "";
                    return text.startsWith(lastChar);
                });
                if (singleCharMatch !== -1) {
                    typeaheadBuffer = lastChar;
                    focusItem(singleCharMatch);
                }
            }
            return;
        }
        switch (e.key) {
            case "ArrowDown":
            case "Down":
                e.preventDefault();
                e.stopPropagation();
                if (focusedItemIndex < 0) {
                    focusItem(0);
                }
                else if (focusedItemIndex < items.length - 1) {
                    focusItem(focusedItemIndex + 1);
                }
                else {
                    focusItem(0);
                }
                break;
            case "ArrowUp":
            case "Up":
                e.preventDefault();
                e.stopPropagation();
                if (focusedItemIndex < 0) {
                    focusItem(items.length - 1);
                }
                else if (focusedItemIndex > 0) {
                    focusItem(focusedItemIndex - 1);
                }
                else {
                    focusItem(items.length - 1);
                }
                break;
            case "Home":
                e.preventDefault();
                e.stopPropagation();
                focusItem(0);
                break;
            case "End":
                e.preventDefault();
                e.stopPropagation();
                focusItem(items.length - 1);
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                e.stopPropagation();
                if (focusedItemIndex >= 0) {
                    items[focusedItemIndex].click();
                }
                break;
            case "ArrowRight":
            case "Right":
                e.preventDefault();
                e.stopPropagation();
                if (isSubmenu) {
                    if (focusedItemIndex >= 0 &&
                        items[focusedItemIndex].classList.contains(`${component.getClass("menu__item--submenu")}`)) {
                        const itemElement = items[focusedItemIndex];
                        const itemIndex = parseInt(itemElement.getAttribute("data-index") ?? "0", 10);
                        const itemData = state.items[itemIndex];
                        if (itemData?.submenu) {
                            actions.handleNestedSubmenuClick?.(itemData, itemIndex, itemElement);
                        }
                    }
                }
                else {
                    if (focusedItemIndex >= 0 &&
                        items[focusedItemIndex].classList.contains(`${component.getClass("menu__item--submenu")}`)) {
                        const itemElement = items[focusedItemIndex];
                        const itemIndex = parseInt(itemElement.getAttribute("data-index") ?? "0", 10);
                        const itemData = state.items[itemIndex];
                        actions.handleSubmenuClick?.(itemData, itemIndex, itemElement);
                    }
                }
                break;
            case "ArrowLeft":
            case "Left":
                e.preventDefault();
                e.stopPropagation();
                if (isSubmenu) {
                    {
                        const parentItem = parentItemOf(menuElement);
                        const currentLevel = parseInt(menuElement.getAttribute("data-level") || "1", 10);
                        actions.closeSubmenu?.(currentLevel);
                        if (parentItem)
                            parentItem.focus();
                    }
                }
                break;
            case "Escape":
                e.preventDefault();
                e.stopPropagation();
                if (isSubmenu) {
                    {
                        const parentItem = parentItemOf(menuElement);
                        const currentLevel = parseInt(menuElement.getAttribute("data-level") || "1", 10);
                        actions.closeSubmenu?.(currentLevel);
                        if (parentItem)
                            parentItem.focus();
                    }
                }
                else {
                    actions.closeMenu(e, true);
                }
                break;
            case "Tab":
                typeaheadBuffer = "";
                if (typeaheadTimeout) {
                    tasks.clearTimeout(typeaheadTimeout);
                    typeaheadTimeout = null;
                }
                e.preventDefault();
                const openerElement = component.opener?.getOpener?.();
                actions.closeMenu(e, true);
                if (openerElement) {
                    tasks.setTimeout(() => {
                        if (e.shiftKey) {
                        }
                        else {
                            const focusableElements = getFocusableElements();
                            const openerIndex = focusableElements.indexOf(openerElement);
                            if (openerIndex >= 0 &&
                                openerIndex < focusableElements.length - 1) {
                                focusableElements[openerIndex + 1].focus();
                            }
                        }
                    }, 0);
                }
                break;
        }
    };
    const setupKeyboardHandlers = (menuElement, state, actions) => {
        if (tasks.destroyed)
            return;
        removeKeyboardHandlers(menuElement);
        const items = menuElement.querySelectorAll(`.${component.getClass("menu__item")}:not(.${component.getClass("menu__item--disabled")})`);
        items.forEach((item) => {
            item.tabIndex = -1;
        });
        if (items.length > 0) {
            items[0].tabIndex = 0;
        }
        const handler = (e) => handleMenuKeydown(e, state, actions);
        handlers.set(menuElement, handler);
        menuElement.addEventListener("keydown", handler);
    };
    const isTabNavigationActive = () => isTabNavigation;
    return {
        destroy,
        removeKeyboardHandlers,
        handleInitialFocus,
        handleMenuKeydown,
        setupKeyboardHandlers,
        isTabNavigationActive,
        getFocusableElements,
        resetTypeahead,
    };
};
const withKeyboard = () => (component) => {
    if (!component.element) {
        return component;
    }
    const keyboard = createKeyboardNavigation(component);
    if (component.lifecycle) {
        const originalDestroy = component.lifecycle.destroy;
        component.lifecycle.destroy = () => {
            keyboard.destroy();
            originalDestroy.call(component.lifecycle);
        };
    }
    return {
        ...component,
        keyboard,
    };
};
export default withKeyboard;
