import { createMenuTasks } from "./tasks.js";
import { activeElementOf } from "../../../core/dom/focus.js";
import { showInTopLayer } from "../../../core/dom/layer.js";
import { eventWithin } from "./layer.js";
const withSubmenu = (config) => (component) => {
    const tasks = createMenuTasks();
    const ownedElements = new Set();
    const removeSubmenu = (element) => {
        component.keyboard?.removeKeyboardHandlers(element);
        element.remove();
        ownedElements.delete(element);
    };
    const state = {
        activeSubmenu: null,
        activeSubmenuItem: null,
        submenuLevel: 0,
        activeSubmenus: [],
        submenuTimer: null,
        hoverIntent: {
            timer: null,
            activeItem: null,
        },
        component,
    };
    const clearHoverIntent = () => {
        if (state.hoverIntent.timer) {
            tasks.clearTimeout(state.hoverIntent.timer);
            state.hoverIntent.timer = null;
            state.hoverIntent.activeItem = null;
        }
    };
    const clearSubmenuTimer = () => {
        if (state.submenuTimer) {
            tasks.clearTimeout(state.submenuTimer);
            state.submenuTimer = null;
        }
    };
    const handleSubmenuHover = (item, index, itemElement) => {
        if (!config.openSubmenuOnHover || !item.hasSubmenu)
            return;
        clearHoverIntent();
        clearSubmenuTimer();
        state.hoverIntent.activeItem = itemElement;
        state.hoverIntent.timer = tasks.setTimeout(() => {
            const isCurrentlyHovered = itemElement.matches(":hover");
            if (isCurrentlyHovered) {
                if (state.activeSubmenuItem !== itemElement) {
                    openSubmenu(item, index, itemElement);
                }
            }
            state.hoverIntent.timer = null;
        }, 100);
    };
    const handleSubmenuLeave = () => {
        clearHoverIntent();
        clearSubmenuTimer();
        state.submenuTimer = tasks.setTimeout(() => {
            const submenuElement = state.activeSubmenu;
            const menuItemElement = state.activeSubmenuItem;
            if (submenuElement && menuItemElement) {
                const overSubmenu = submenuElement.matches(":hover");
                const overMenuItem = menuItemElement.matches(":hover");
                if (!overSubmenu && !overMenuItem) {
                    closeSubmenu(state.submenuLevel);
                }
            }
            state.submenuTimer = null;
        }, 300);
    };
    const handleSubmenuClick = (item, index, itemElement) => {
        if (tasks.destroyed || !item.submenu || !item.hasSubmenu)
            return;
        const isOpen = itemElement.getAttribute("aria-expanded") === "true";
        const anySubmenuTransitioning = state.activeSubmenus.some((s) => s.isOpening);
        if (anySubmenuTransitioning) {
            return;
        }
        if (isOpen) {
            const currentLevel = parseInt(itemElement
                .closest(`.${component.getClass("menu--submenu")}`)
                ?.getAttribute("data-level") || "0", 10);
            closeSubmenu(currentLevel + 1);
            itemElement.setAttribute("aria-expanded", "false");
        }
        else {
            openSubmenu(item, index, itemElement);
        }
    };
    const currentItems = () => component.menu?.getItems?.() ?? config.items ?? [];
    const findItemById = (id) => {
        const search = (list) => {
            for (const entry of list) {
                const item = entry;
                if (!item || typeof item !== "object")
                    continue;
                if (item.id === id)
                    return item;
                if (Array.isArray(item.submenu)) {
                    const found = search(item.submenu);
                    if (found)
                        return found;
                }
            }
            return null;
        };
        return search(currentItems());
    };
    const handleNestedSubmenuClick = (item, index, itemElement) => {
        if (tasks.destroyed || !item.submenu || !item.hasSubmenu)
            return;
        const isOpen = itemElement.getAttribute("aria-expanded") === "true";
        const anySubmenuTransitioning = state.activeSubmenus.some((s) => s.isOpening);
        if (anySubmenuTransitioning) {
            return;
        }
        if (isOpen) {
            const currentLevel = parseInt(itemElement
                .closest(`.${component.getClass("menu--submenu")}`)
                ?.getAttribute("data-level") || "1", 10);
            closeSubmenu(currentLevel + 1);
        }
        else {
            openSubmenu(item, index, itemElement);
        }
    };
    const markActiveMenu = (active) => {
        const activeClass = component.getClass("menu--active");
        const inactiveClass = component.getClass("menu--inactive");
        const menus = [
            component.element,
            ...state.activeSubmenus.map((entry) => entry.element),
        ];
        for (const menu of menus) {
            if (!menu)
                continue;
            const isActive = menu === active;
            menu.classList.toggle(activeClass, isActive);
            menu.classList.toggle(inactiveClass, active !== null && !isActive);
        }
    };
    const openSubmenu = (item, index, itemElement) => {
        if (tasks.destroyed || !item.submenu || !item.hasSubmenu)
            return;
        const currentLevel = itemElement.closest(`.${component.getClass("menu--submenu")}`)
            ? parseInt(itemElement
                .closest(`.${component.getClass("menu--submenu")}`)
                ?.getAttribute("data-level") || "0", 10) + 1
            : 1;
        closeSubmenu(currentLevel);
        const existingSubmenuIndex = state.activeSubmenus.findIndex((s) => s.menuItem === itemElement && s.isOpening);
        if (existingSubmenuIndex >= 0) {
            return;
        }
        itemElement.setAttribute("aria-expanded", "true");
        const submenuElement = document.createElement("div");
        submenuElement.className = `${component.getClass("menu")} ${component.getClass("menu--submenu")}`;
        for (const variantClass of ["menu--vertical", "menu--vibrant", "menu--dense"]) {
            const name = component.getClass(variantClass);
            if (component.element.classList.contains(name)) {
                submenuElement.classList.add(name);
            }
        }
        submenuElement.setAttribute("role", "menu");
        if (item.text)
            submenuElement.setAttribute("aria-label", item.text);
        submenuElement.setAttribute("tabindex", "-1");
        submenuElement.setAttribute("data-level", currentLevel.toString());
        submenuElement.setAttribute("data-parent-item", item.id);
        let ownerId = component.element.id;
        if (!ownerId) {
            ownerId = `menu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            component.element.id = ownerId;
        }
        submenuElement.setAttribute("data-owner", ownerId);
        submenuElement.style.zIndex = `${1000 + currentLevel * 10}`;
        const submenuList = document.createElement("ul");
        submenuList.className = `${component.getClass("menu__list")}`;
        submenuList.setAttribute("role", "none");
        const submenuItems = [];
        component.emit("create-menu-items", {
            items: item.submenu,
            container: submenuList,
            level: currentLevel,
            onItemCreated: (itemElement) => {
                if (!itemElement.classList.contains(`${component.getClass("menu__item--disabled")}`)) {
                    submenuItems.push(itemElement);
                }
            },
        });
        submenuElement.appendChild(submenuList);
        if (config.layer === "top") {
            component.element.after(submenuElement);
            showInTopLayer(submenuElement, { kind: "popover-manual" });
        }
        else
            document.body.appendChild(submenuElement);
        ownedElements.add(submenuElement);
        if (component.position && component.position.positionSubmenu) {
            component.position.positionSubmenu(submenuElement, itemElement, currentLevel);
        }
        if (component.keyboard && component.keyboard.setupKeyboardHandlers) {
            component.keyboard.setupKeyboardHandlers(submenuElement, { items: item.submenu }, {
                closeSubmenu,
                handleNestedSubmenuClick,
                handleSubmenuClick,
                findItemById,
                closeMenu: (event, restoreFocus) => component.menu?.close(event, restoreFocus),
            });
        }
        submenuElement.addEventListener("mouseenter", () => {
            clearSubmenuTimer();
        });
        submenuElement.addEventListener("mouseleave", () => {
            handleSubmenuLeave();
        });
        state.activeSubmenu = submenuElement;
        state.activeSubmenuItem = itemElement;
        state.activeSubmenus.push({
            element: submenuElement,
            menuItem: itemElement,
            level: currentLevel,
            isOpening: true,
        });
        state.submenuLevel = currentLevel;
        markActiveMenu(submenuElement);
        document.addEventListener("click", handleDocumentClickForSubmenu);
        window.addEventListener("resize", handleWindowResizeForSubmenu, {
            passive: true,
        });
        window.addEventListener("scroll", handleWindowScrollForSubmenu, {
            passive: true,
        });
        tasks.requestAnimationFrame(() => {
            submenuElement.classList.add(`${component.getClass("menu--visible")}`);
            tasks.setTimeout(() => {
                const index = state.activeSubmenus.findIndex((s) => s.element === submenuElement);
                if (index !== -1) {
                    state.activeSubmenus[index].isOpening = false;
                }
                if (index === -1)
                    return;
                if (submenuItems.length > 0) {
                    if (currentLevel >= 2 || activeElementOf(itemElement) === itemElement) {
                        submenuItems[0].setAttribute("tabindex", "0");
                        submenuItems[0].focus();
                    }
                }
            }, 300);
        });
        component.emit("submenu-opened", {
            submenuElement,
            parentItem: itemElement,
            level: currentLevel,
            item,
        });
    };
    const closeSubmenu = (level) => {
        clearHoverIntent();
        clearSubmenuTimer();
        const submenuIndicesToRemove = [];
        for (let i = state.activeSubmenus.length - 1; i >= 0; i--) {
            if (state.activeSubmenus[i].level >= level) {
                const submenuToClose = state.activeSubmenus[i];
                if (submenuToClose.menuItem) {
                    submenuToClose.menuItem.setAttribute("aria-expanded", "false");
                }
                submenuToClose.element.classList.remove(`${component.getClass("menu--visible")}`);
                tasks.setTimeout(() => {
                    removeSubmenu(submenuToClose.element);
                }, 200);
                submenuIndicesToRemove.push(i);
            }
        }
        submenuIndicesToRemove.forEach((index) => {
            state.activeSubmenus.splice(index, 1);
        });
        if (state.activeSubmenus.length > 0) {
            const deepestRemaining = state.activeSubmenus[state.activeSubmenus.length - 1];
            state.activeSubmenu = deepestRemaining.element;
            state.activeSubmenuItem = deepestRemaining.menuItem;
            state.submenuLevel = deepestRemaining.level;
            if (deepestRemaining.menuItem) {
                deepestRemaining.menuItem.focus();
            }
            markActiveMenu(deepestRemaining.element);
        }
        else {
            state.activeSubmenu = null;
            state.activeSubmenuItem = null;
            state.submenuLevel = 0;
            document.removeEventListener("click", handleDocumentClickForSubmenu);
            window.removeEventListener("resize", handleWindowResizeForSubmenu);
            window.removeEventListener("scroll", handleWindowScrollForSubmenu);
        }
        component.emit("submenu-closed", { level });
    };
    const closeAllSubmenus = () => {
        markActiveMenu(null);
        clearHoverIntent();
        clearSubmenuTimer();
        document.removeEventListener("click", handleDocumentClickForSubmenu);
        window.removeEventListener("resize", handleWindowResizeForSubmenu);
        window.removeEventListener("scroll", handleWindowScrollForSubmenu);
        if (state.activeSubmenus.length === 0)
            return;
        [...state.activeSubmenus].forEach((submenu) => {
            if (submenu.menuItem) {
                submenu.menuItem.setAttribute("aria-expanded", "false");
            }
            submenu.element.classList.remove(`${component.getClass("menu--visible")}`);
            tasks.setTimeout(() => {
                removeSubmenu(submenu.element);
            }, 200);
        });
        state.activeSubmenu = null;
        state.activeSubmenuItem = null;
        state.activeSubmenus = [];
        state.submenuLevel = 0;
        component.emit("all-submenus-closed", {});
    };
    const handleDocumentClickForSubmenu = (e) => {
        if (!state.activeSubmenu)
            return;
        const submenuElement = state.activeSubmenu;
        const menuItemElement = state.activeSubmenuItem;
        if (eventWithin(config, submenuElement, e) ||
            (menuItemElement && eventWithin(config, menuItemElement, e))) {
            return;
        }
        closeAllSubmenus();
    };
    const handleWindowResizeForSubmenu = () => {
        if (state.activeSubmenu && state.activeSubmenuItem && component.position) {
            component.position.positionSubmenu(state.activeSubmenu, state.activeSubmenuItem, state.submenuLevel);
        }
    };
    const handleWindowScrollForSubmenu = () => {
        tasks.requestAnimationFrame(() => {
            if (state.activeSubmenu &&
                state.activeSubmenuItem &&
                component.position) {
                component.position.positionSubmenu(state.activeSubmenu, state.activeSubmenuItem, state.submenuLevel);
            }
        });
    };
    const hasOpenSubmenu = () => {
        return state.activeSubmenus.length > 0;
    };
    const getSubmenuLevel = () => {
        return state.submenuLevel;
    };
    const getActiveSubmenus = () => {
        return [...state.activeSubmenus];
    };
    if (component.lifecycle) {
        const originalDestroy = component.lifecycle.destroy || (() => { });
        component.lifecycle.destroy = () => {
            if (tasks.destroyed)
                return;
            tasks.destroy();
            clearHoverIntent();
            clearSubmenuTimer();
            document.removeEventListener("click", handleDocumentClickForSubmenu);
            window.removeEventListener("resize", handleWindowResizeForSubmenu);
            window.removeEventListener("scroll", handleWindowScrollForSubmenu);
            state.activeSubmenus.forEach((submenu) => {
                submenu.menuItem?.setAttribute("aria-expanded", "false");
            });
            ownedElements.forEach(removeSubmenu);
            state.activeSubmenus = [];
            state.activeSubmenu = null;
            state.activeSubmenuItem = null;
            state.submenuLevel = 0;
            originalDestroy.call(component.lifecycle);
        };
    }
    component.on("menu-closing", () => {
        closeAllSubmenus();
    });
    return {
        ...component,
        submenu: {
            openSubmenu,
            closeSubmenu,
            closeAllSubmenus,
            handleSubmenuClick,
            handleNestedSubmenuClick,
            handleSubmenuHover,
            handleSubmenuLeave,
            hasOpenSubmenu,
            getSubmenuLevel,
            getActiveSubmenus,
        },
    };
};
export default withSubmenu;
