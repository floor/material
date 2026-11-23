import { createMenuTasks } from "./tasks.js";
import { menuOpened, menuClosed } from "./registry.js";
import { eventWithin } from "./layer.js";
import { createSubmenuLoader, hasNestedItems } from "./loader.js";
import { eventsFrom, onTopLayerClose, showInTopLayer } from "../../../core/dom/layer.js";
import { setHTML } from "../../../core/dom/html.js";
const SCROLL_LISTENER = { capture: true, passive: true };
const withController = (config, getComponent) => (component) => {
    const tasks = createMenuTasks();
    const loader = createSubmenuLoader(config, component);
    const submenu = loader.api;
    if (hasNestedItems(config.items))
        loader.load();
    const topLayer = config.layer === "top";
    let showTimer = null;
    let focusTimer = null;
    let hideTimer = null;
    let removeTimer = null;
    let from;
    const listbox = config.listbox === true;
    const optionIdPrefix = `${component.getClass("menu")}-${Math.random().toString(36).slice(2, 9)}`;
    if (listbox) {
        component.element.addEventListener("mousedown", (e) => e.preventDefault());
    }
    const state = {
        visible: config.visible || false,
        items: config.items || [],
        position: config.position,
        selectedItemId: null,
        activeItemIndex: -1,
        component,
    };
    const itemRole = () => (state.selectedItemId ? "menuitemradio" : "menuitem");
    const checkedAttribute = listbox ? "aria-selected" : "aria-checked";
    const eventHelpers = {
        triggerEvent(eventName, data = {}, originalEvent) {
            const eventData = {
                menu: getComponent(),
                ...data,
                originalEvent,
                preventDefault: () => {
                    eventData.defaultPrevented = true;
                },
                defaultPrevented: false,
            };
            component.emit(eventName, eventData);
            return eventData;
        },
    };
    const getOpenerElement = () => getComponent().getOpener() ?? null;
    const reposition = () => {
        const opener = getOpenerElement();
        if (opener)
            component.position?.positionMenu(opener);
    };
    const createMenuItem = (item, index, role = itemRole()) => {
        const itemElement = document.createElement("li");
        const itemClass = `${component.getClass("menu__item")}`;
        itemElement.className = itemClass;
        if (listbox) {
            itemElement.setAttribute("role", "option");
            itemElement.id = `${optionIdPrefix}-option-${index}`;
        }
        else {
            itemElement.setAttribute("role", item.hasSubmenu ? "menuitem" : role);
            itemElement.setAttribute("tabindex", "-1");
        }
        itemElement.setAttribute("data-id", item.id);
        itemElement.setAttribute("data-index", index.toString());
        if (item.disabled) {
            itemElement.classList.add(`${itemClass}--disabled`);
            itemElement.setAttribute("aria-disabled", "true");
        }
        else {
            itemElement.setAttribute("aria-disabled", "false");
        }
        if (listbox || (role === "menuitemradio" && !item.hasSubmenu)) {
            if (state.selectedItemId && item.id === state.selectedItemId) {
                itemElement.classList.add(`${itemClass}--selected`);
                itemElement.setAttribute(checkedAttribute, "true");
            }
            else {
                itemElement.setAttribute(checkedAttribute, "false");
            }
        }
        if (item.hasSubmenu) {
            itemElement.classList.add(`${itemClass}--submenu`);
            itemElement.setAttribute("aria-haspopup", "true");
            itemElement.setAttribute("aria-expanded", "false");
        }
        const contentContainer = document.createElement("span");
        contentContainer.className = `${component.getClass("menu__item-content")}`;
        if (item.icon) {
            const iconElement = document.createElement("span");
            iconElement.className = `${component.getClass("menu__item-icon")}`;
            if (item.text.trim())
                iconElement.setAttribute("aria-hidden", "true");
            setHTML(iconElement, item.icon);
            contentContainer.appendChild(iconElement);
        }
        const textElement = document.createElement("span");
        textElement.className = `${component.getClass("menu__item-text")}`;
        textElement.textContent = item.text;
        if (item.supportingText) {
            const labelElement = document.createElement("span");
            labelElement.className = `${component.getClass("menu__item-label")}`;
            const supportingElement = document.createElement("span");
            supportingElement.className = `${component.getClass("menu__item-supporting")}`;
            supportingElement.textContent = item.supportingText;
            labelElement.appendChild(textElement);
            labelElement.appendChild(supportingElement);
            contentContainer.appendChild(labelElement);
        }
        else {
            contentContainer.appendChild(textElement);
        }
        if (item.shortcut) {
            const shortcutElement = document.createElement("span");
            shortcutElement.className = `${component.getClass("menu__item-shortcut")}`;
            shortcutElement.textContent = item.shortcut;
            contentContainer.appendChild(shortcutElement);
        }
        itemElement.appendChild(contentContainer);
        if (!item.disabled) {
            itemElement.addEventListener("click", (e) => handleItemClick(e, item, index));
            itemElement.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleItemClick(e, item, index);
                }
            });
            itemElement.addEventListener("focus", () => {
                state.activeItemIndex = index;
            });
            if (item.hasSubmenu && config.openSubmenuOnHover) {
                itemElement.addEventListener("mouseenter", () => {
                    submenu.handleSubmenuHover(item, index, itemElement);
                });
                itemElement.addEventListener("mouseleave", () => {
                    submenu.handleSubmenuLeave();
                });
            }
        }
        return itemElement;
    };
    const createDivider = (divider, index) => {
        const dividerElement = document.createElement("li");
        dividerElement.className = `${component.getClass("menu__divider")}`;
        dividerElement.setAttribute("role", "separator");
        dividerElement.setAttribute("data-index", index.toString());
        if (divider.id) {
            dividerElement.setAttribute("id", divider.id);
        }
        return dividerElement;
    };
    const renderMenuItems = () => {
        const menuList = document.createElement("ul");
        menuList.className = `${component.getClass("menu__list")}`;
        menuList.setAttribute("role", listbox ? "listbox" : "menu");
        if (listbox)
            menuList.id = `${optionIdPrefix}-listbox`;
        else {
            const label = component.element.getAttribute("aria-label");
            const labelledby = component.element.getAttribute("aria-labelledby");
            if (label)
                menuList.setAttribute("aria-label", label);
            if (labelledby)
                menuList.setAttribute("aria-labelledby", labelledby);
        }
        let target = menuList;
        const startGroup = () => {
            const group = document.createElement("li");
            group.className = `${component.getClass("menu__group")}`;
            group.setAttribute("role", "none");
            const list = document.createElement("ul");
            list.setAttribute("role", "none");
            group.appendChild(list);
            menuList.appendChild(group);
            target = list;
        };
        const hasGaps = state.items.some((item) => "type" in item && item.type === "gap");
        if (hasGaps)
            startGroup();
        state.items.forEach((item, index) => {
            if ("type" in item && item.type === "gap") {
                startGroup();
            }
            else if ("type" in item && item.type === "divider") {
                target.appendChild(createDivider(item, index));
            }
            else {
                target.appendChild(createMenuItem(item, index));
            }
        });
        component.element.replaceChildren();
        component.element.appendChild(menuList);
    };
    const findItemById = (id) => {
        for (const item of state.items) {
            if ("id" in item && item.id === id) {
                return item;
            }
            if ("submenu" in item && Array.isArray(item.submenu)) {
                for (const subItem of item.submenu ?? []) {
                    if ("id" in subItem && subItem.id === id) {
                        return subItem;
                    }
                }
            }
        }
        return null;
    };
    const submenuActions = {
        closeSubmenu: submenu.closeSubmenu,
        handleSubmenuClick: submenu.handleSubmenuClick,
        handleNestedSubmenuClick: submenu.handleNestedSubmenuClick,
    };
    const handleItemClick = (e, item, index) => {
        e.preventDefault();
        e.stopPropagation();
        if (item.disabled)
            return;
        if (item.hasSubmenu) {
            submenu.handleSubmenuClick(item, index, e.currentTarget);
            return;
        }
        const selectEvent = eventHelpers.triggerEvent("select", {
            item,
            itemId: item.id,
            value: item.id,
            itemData: item.data,
        }, e);
        if (config.closeOnSelect && !selectEvent.defaultPrevented) {
            closeMenu(e, true);
        }
    };
    const updateSelectedState = (itemId) => {
        state.selectedItemId = itemId;
        const menuItems = component.element.querySelectorAll(`.${component.getClass("menu__item")}`);
        menuItems.forEach((item) => {
            const opens = item.hasAttribute("aria-haspopup");
            const selected = !opens && item.getAttribute("data-id") === itemId;
            item.classList.toggle(`${component.getClass("menu__item--selected")}`, selected);
            if (!listbox)
                item.setAttribute("role", opens ? "menuitem" : itemRole());
            if (listbox || (itemId && !opens))
                item.setAttribute(checkedAttribute, String(selected));
            else
                item.removeAttribute(checkedAttribute);
        });
    };
    const registryEntry = {
        close: (event) => closeMenu(event, false),
    };
    const openMenu = (event, interactionType) => {
        if (tasks.destroyed || state.visible)
            return;
        if (!interactionType) {
            if (event instanceof KeyboardEvent)
                interactionType = "keyboard";
            else
                interactionType = "mouse";
        }
        menuOpened(registryEntry, event);
        state.visible = true;
        tasks.clearTimeout(hideTimer);
        tasks.clearTimeout(removeTimer);
        from?.stop();
        from = eventsFrom(component.element);
        if (config.closeOnClickOutside) {
            document.addEventListener("click", handleDocumentClick);
        }
        if (config.closeOnEscape && !listbox) {
            document.addEventListener("keydown", handleDocumentKeydown);
        }
        if (!component.element.parentNode) {
            component.element.classList.remove(`${component.getClass("menu--visible")}`);
            component.element.setAttribute("aria-hidden", "true");
            component.element.style.transform = "scaleY(0)";
            component.element.style.opacity = "0";
            const opener = topLayer ? getOpenerElement() : null;
            if (opener?.parentNode)
                opener.after(component.element);
            else
                (config.container || document.body).appendChild(component.element);
        }
        if (topLayer)
            showInTopLayer(component.element, { kind: "popover-manual" });
        showTimer = tasks.setTimeout(() => {
            reposition();
            component.element.setAttribute("aria-hidden", "false");
            component.element.style.transform = "";
            component.element.style.opacity = "";
            void component.element.getBoundingClientRect();
            component.element.classList.add(`${component.getClass("menu--visible")}`);
            if (!listbox)
                focusTimer = tasks.setTimeout(() => {
                    component.keyboard?.handleInitialFocus(component.element, interactionType, event);
                }, 100);
            window.addEventListener("resize", handleWindowResize, {
                passive: true,
            });
            window.addEventListener("scroll", handleWindowScroll, SCROLL_LISTENER);
        }, 20);
        component.emit("open", { menu: getComponent(), originalEvent: event });
    };
    const closeMenu = (event, restoreFocus = true) => {
        if (!state.visible)
            return;
        state.visible = false;
        tasks.clearTimeout(showTimer);
        tasks.clearTimeout(focusTimer);
        menuClosed(registryEntry);
        component.emit("menu-closing", { event, restoreFocus });
        submenu.closeAllSubmenus();
        from?.stop();
        document.removeEventListener("click", handleDocumentClick);
        document.removeEventListener("keydown", handleDocumentKeydown);
        window.removeEventListener("resize", handleWindowResize);
        window.removeEventListener("scroll", handleWindowScroll, SCROLL_LISTENER);
        component.emit("close", {
            menu: getComponent(),
            restoreFocus,
            originalEvent: event,
        });
        if (state.visible)
            return;
        hideTimer = tasks.setTimeout(() => {
            component.element.setAttribute("aria-hidden", "true");
            component.element.classList.remove(`${component.getClass("menu--visible")}`);
            removeTimer = tasks.setTimeout(() => {
                if (component.element.parentNode && !state.visible) {
                    component.element.parentNode.removeChild(component.element);
                }
            }, 300);
        }, 50);
    };
    const toggleMenu = (event, interactionType) => {
        if (state.visible) {
            closeMenu(event);
        }
        else {
            if (event) {
                if (event instanceof KeyboardEvent) {
                    interactionType = "keyboard";
                }
                else if (event instanceof MouseEvent) {
                    interactionType = "mouse";
                }
            }
            openMenu(event, interactionType);
        }
    };
    const handleDocumentClick = (e) => {
        if (from && !from.after(e))
            return;
        if (eventWithin(config, component.element, e)) {
            return;
        }
        const opener = getOpenerElement();
        if (opener && eventWithin(config, opener, e)) {
            return;
        }
        if (submenu.hasOpenSubmenu()) {
            for (const open of submenu.getActiveSubmenus()) {
                if (eventWithin(config, open.element, e)) {
                    return;
                }
            }
        }
        closeMenu(e, false);
    };
    const handleDocumentKeydown = (e) => {
        if (from && !from.after(e))
            return;
        const isTargetInsideMenu = eventWithin(config, component.element, e);
        const isTargetInsideSubmenu = submenu.hasOpenSubmenu() &&
            submenu
                .getActiveSubmenus()
                .some((s) => eventWithin(config, s.element, e));
        if (state.visible) {
            if (isTargetInsideMenu) {
                if (e.key === "Escape") {
                    e.preventDefault();
                    closeMenu(e, true);
                }
            }
            else if (isTargetInsideSubmenu) {
                component.keyboard?.handleMenuKeydown(e, state, {
                    closeMenu,
                    findItemById,
                    ...submenuActions,
                });
            }
            else {
                component.keyboard?.handleMenuKeydown(e, state, {
                    closeMenu,
                    findItemById,
                    ...submenuActions,
                });
            }
        }
    };
    const handleWindowResize = () => {
        if (state.visible) {
            if (config.closeOnResize) {
                closeMenu(undefined, true);
            }
            else {
                reposition();
            }
        }
    };
    const handleWindowScroll = (event) => {
        if (event?.composedPath().includes(component.element))
            return;
        if (state.visible) {
            tasks.requestAnimationFrame(() => {
                reposition();
            });
        }
    };
    const initMenu = () => {
        if (state.visible) {
            reposition();
            component.element.classList.add(`${component.getClass("menu--visible")}`);
            if (config.closeOnClickOutside) {
                document.addEventListener("click", handleDocumentClick);
            }
            if (config.closeOnEscape && !listbox) {
                document.addEventListener("keydown", handleDocumentKeydown);
            }
            window.addEventListener("resize", handleWindowResize);
            window.addEventListener("scroll", handleWindowScroll, SCROLL_LISTENER);
        }
    };
    component.on("create-menu-items", (event) => {
        const { items, container, onItemCreated } = event;
        items.forEach((item, index) => {
            let element;
            if ("type" in item && item.type === "gap") {
                element = document.createElement("li");
                element.className = `${component.getClass("menu__gap")}`;
                element.setAttribute("role", "none");
            }
            else if ("type" in item && item.type === "divider") {
                element = createDivider(item, index);
            }
            else {
                element = createMenuItem(item, index, "menuitem");
            }
            container.appendChild(element);
            if (onItemCreated) {
                onItemCreated(element);
            }
        });
    });
    renderMenuItems();
    if (!listbox) {
        component.keyboard?.setupKeyboardHandlers(component.element, state, {
            closeMenu,
            findItemById,
            ...submenuActions,
        });
    }
    tasks.setTimeout(initMenu, 0);
    const stopLayerClose = topLayer
        ? onTopLayerClose(component.element, () => closeMenu(undefined, false))
        : null;
    if (component.lifecycle) {
        const originalDestroy = component.lifecycle.destroy || (() => { });
        component.lifecycle.destroy = () => {
            if (tasks.destroyed)
                return;
            tasks.destroy();
            stopLayerClose?.();
            state.visible = false;
            menuClosed(registryEntry);
            from?.stop();
            document.removeEventListener("click", handleDocumentClick);
            document.removeEventListener("keydown", handleDocumentKeydown);
            window.removeEventListener("resize", handleWindowResize);
            window.removeEventListener("scroll", handleWindowScroll, SCROLL_LISTENER);
            loader.destroy();
            originalDestroy.call(component.lifecycle);
        };
    }
    return {
        ...component,
        submenu,
        menu: {
            open: (event, interactionType) => {
                openMenu(event, interactionType);
                return component;
            },
            close: (event, restoreFocus = true) => {
                closeMenu(event, restoreFocus);
                return component;
            },
            toggle: (event, interactionType) => {
                toggleMenu(event, interactionType);
                return component;
            },
            isOpen: () => state.visible,
            setItems: (items) => {
                state.items = items;
                if (hasNestedItems(items))
                    loader.load();
                renderMenuItems();
                return component;
            },
            getItems: () => state.items,
            setPosition: (position) => {
                state.position = position;
                if (state.visible) {
                    reposition();
                }
                return component;
            },
            getPosition: () => state.position,
            setSelected: (itemId) => {
                updateSelectedState(itemId);
                return component;
            },
            getSelected: () => state.selectedItemId,
        },
    };
};
export default withController;
