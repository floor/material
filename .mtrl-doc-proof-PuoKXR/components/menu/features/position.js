export const createPositioner = (component, config) => {
    const VIEWPORT_MARGIN = 48;
    const MIN_MENU_HEIGHT = 100;
    const positionElement = (menuElement, openerElement, preferredPosition, isSubmenu = false) => {
        if (!menuElement || !openerElement)
            return;
        menuElement.classList.toggle(component.getClass("menu--rtl"), getComputedStyle(menuElement).direction === "rtl");
        const topLayer = config.layer === "top";
        const position = topLayer ? "fixed" : "absolute";
        const hasContainer = !topLayer && config.container && config.container !== document.body;
        menuElement.style.position = position;
        const scrollX = hasContainer || topLayer
            ? 0
            : window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = hasContainer || topLayer
            ? 0
            : window.pageYOffset || document.documentElement.scrollTop;
        const openerRect = openerElement.getBoundingClientRect();
        const parentMenu = isSubmenu
            ? openerElement.closest(`.${component.getClass("menu")}`)
            : null;
        const rawParentMenuRect = parentMenu ? parentMenu.getBoundingClientRect() : null;
        const horizontalRect = rawParentMenuRect && rawParentMenuRect.width >= openerRect.width
            ? rawParentMenuRect
            : openerRect;
        const tempMenu = menuElement.cloneNode(true);
        tempMenu.style.visibility = "hidden";
        tempMenu.style.display = "block";
        tempMenu.style.position = position;
        tempMenu.style.top = "0";
        tempMenu.style.left = "0";
        tempMenu.style.transform = "none";
        tempMenu.style.opacity = "0";
        tempMenu.style.pointerEvents = "none";
        tempMenu.style.maxHeight = config.maxHeight ?? "";
        tempMenu.classList.add(`${component.getClass("menu--visible")}`);
        if (config.width === "100%" && !isSubmenu) {
            tempMenu.style.width = `${openerRect.width}px`;
        }
        const measureContainer = (topLayer && menuElement.parentNode) || config.container || document.body;
        measureContainer.appendChild(tempMenu);
        const menuRect = tempMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        measureContainer.removeChild(tempMenu);
        const offset = config.offset !== undefined ? config.offset : 8;
        let top = 0;
        let left = 0;
        let calculatedPosition = preferredPosition;
        if (isSubmenu) {
            calculatedPosition = preferredPosition || "right-start";
            if (calculatedPosition.startsWith("right") &&
                horizontalRect.right + menuRect.width + offset > viewportWidth - 16) {
                calculatedPosition = calculatedPosition.replace("right", "left");
            }
            else if (calculatedPosition.startsWith("left") &&
                horizontalRect.left - menuRect.width - offset < 16) {
                calculatedPosition = calculatedPosition.replace("left", "right");
            }
            if (openerRect.top + menuRect.height > viewportHeight - 48) {
                if (calculatedPosition === "right-start") {
                    calculatedPosition = "right-end";
                }
                else if (calculatedPosition === "left-start") {
                    calculatedPosition = "left-end";
                }
            }
        }
        else {
            switch (preferredPosition) {
                case "top-start":
                case "top":
                case "top-end":
                    if (openerRect.top < menuRect.height + offset + 48) {
                        calculatedPosition = preferredPosition.replace("top", "bottom");
                    }
                    break;
                case "bottom-start":
                case "bottom":
                case "bottom-end":
                    if (openerRect.bottom + menuRect.height + offset + 48 >
                        viewportHeight) {
                        if (openerRect.top > viewportHeight - openerRect.bottom) {
                            calculatedPosition = preferredPosition.replace("bottom", "top");
                        }
                    }
                    break;
                case "right-start":
                case "right":
                case "left-start":
                case "left":
                    if (openerRect.bottom + menuRect.height > viewportHeight - 48) {
                        if (preferredPosition === "right-start") {
                            calculatedPosition = "right-end";
                        }
                        else if (preferredPosition === "left-start") {
                            calculatedPosition = "left-end";
                        }
                        else if (preferredPosition === "right") {
                            top =
                                openerRect.top - (menuRect.height - openerRect.height) - offset;
                        }
                        else if (preferredPosition === "left") {
                            top =
                                openerRect.top - (menuRect.height - openerRect.height) - offset;
                        }
                    }
                    break;
            }
        }
        let height = menuRect.height;
        let fitted = null;
        if (!isSubmenu && /^(top|bottom)/.test(calculatedPosition)) {
            const below = viewportHeight - openerRect.bottom - offset - VIEWPORT_MARGIN;
            const above = openerRect.top - offset - VIEWPORT_MARGIN;
            if (height > (calculatedPosition.startsWith("bottom") ? below : above)) {
                calculatedPosition = calculatedPosition.replace(/^(top|bottom)/, below >= above ? "bottom" : "top");
            }
            const room = Math.max(calculatedPosition.startsWith("bottom") ? below : above, MIN_MENU_HEIGHT);
            if (height > room) {
                fitted = room;
                height = room;
            }
        }
        menuElement.style.maxHeight = fitted !== null ? `${fitted}px` : (config.maxHeight ?? "");
        if (!isSubmenu &&
            menuRect.width > openerRect.width &&
            (calculatedPosition === "top-start" || calculatedPosition === "bottom-start") &&
            getComputedStyle(openerElement).direction === "rtl")
            calculatedPosition = calculatedPosition.replace("start", "end");
        const positionClasses = [
            "position-top",
            "position-bottom",
            "position-right",
            "position-left",
        ];
        positionClasses.forEach((posClass) => {
            menuElement.classList.remove(`${component.getClass("menu")}--${posClass}`);
        });
        const menuAppearsAboveOpener = calculatedPosition.startsWith("top") ||
            calculatedPosition === "right-end" ||
            calculatedPosition === "left-end" ||
            (calculatedPosition === "right" && top < openerRect.top) ||
            (calculatedPosition === "left" && top < openerRect.top);
        if (menuAppearsAboveOpener) {
            menuElement.classList.add(`${component.getClass("menu")}--position-top`);
        }
        else if (calculatedPosition.startsWith("left")) {
            menuElement.classList.add(`${component.getClass("menu")}--position-left`);
        }
        else if (calculatedPosition.startsWith("right")) {
            menuElement.classList.add(`${component.getClass("menu")}--position-right`);
        }
        else {
            menuElement.classList.add(`${component.getClass("menu")}--position-bottom`);
        }
        const containerRect = hasContainer && config.container
            ? config.container.getBoundingClientRect()
            : { top: 0, left: 0, right: 0, bottom: 0 };
        const offsetX = hasContainer ? -containerRect.left : scrollX;
        const offsetY = hasContainer ? -containerRect.top : scrollY;
        switch (calculatedPosition) {
            case "top-start":
                top = openerRect.top + offsetY - height - offset;
                left = openerRect.left + offsetX;
                break;
            case "top":
                top = openerRect.top + offsetY - height - offset;
                left =
                    openerRect.left + offsetX + openerRect.width / 2 - menuRect.width / 2;
                break;
            case "top-end":
                top = openerRect.top + offsetY - height - offset;
                left = openerRect.right + offsetX - menuRect.width;
                break;
            case "right-start":
                top = openerRect.top + offsetY;
                left = horizontalRect.right + offsetX + offset;
                break;
            case "right":
                if (top === 0) {
                    top =
                        openerRect.top +
                            offsetY +
                            openerRect.height / 2 -
                            height / 2;
                }
                else {
                    top += offsetY;
                }
                left = horizontalRect.right + offsetX + offset;
                break;
            case "right-end":
                top = openerRect.bottom + offsetY - height;
                left = horizontalRect.right + offsetX + offset;
                break;
            case "bottom-start":
                top = openerRect.bottom + offsetY + offset;
                left = openerRect.left + offsetX;
                break;
            case "bottom":
                top = openerRect.bottom + offsetY + offset;
                left =
                    openerRect.left + offsetX + openerRect.width / 2 - menuRect.width / 2;
                break;
            case "bottom-end":
                top = openerRect.bottom + offsetY + offset;
                left = openerRect.right + offsetX - menuRect.width;
                break;
            case "left-start":
                top = openerRect.top + offsetY;
                left = horizontalRect.left + offsetX - menuRect.width - offset;
                break;
            case "left":
                if (top === 0) {
                    top =
                        openerRect.top +
                            offsetY +
                            openerRect.height / 2 -
                            height / 2;
                }
                else {
                    top += offsetY;
                }
                left = horizontalRect.left + offsetX - menuRect.width - offset;
                break;
            case "left-end":
                top = openerRect.bottom + offsetY - height;
                left = horizontalRect.left + offsetX - menuRect.width - offset;
                break;
        }
        if (hasContainer) {
            menuElement.style.top = `${top}px`;
            menuElement.style.left = `${left}px`;
            if (config.width === "100%" && !isSubmenu) {
                menuElement.style.width = `${openerRect.width}px`;
            }
            return;
        }
        const minTopSpacing = 48;
        if (top - scrollY < minTopSpacing) {
            top = minTopSpacing + scrollY;
        }
        const bottomEdge = top - scrollY + height;
        if (fitted === null && bottomEdge > viewportHeight - VIEWPORT_MARGIN) {
            const available = viewportHeight - (top - scrollY) - VIEWPORT_MARGIN;
            const shrunk = Math.max(available, Math.min(height, MIN_MENU_HEIGHT));
            const configured = config.maxHeight ? parseInt(config.maxHeight, 10) : NaN;
            menuElement.style.maxHeight = `${Number.isNaN(configured) ? shrunk : Math.min(shrunk, configured)}px`;
        }
        if (config.width === "100%" && !isSubmenu) {
            menuElement.style.width = `${openerRect.width}px`;
        }
        const finalTop = Math.max(minTopSpacing + scrollY, top);
        const finalLeft = Math.max(16 + scrollX, left);
        menuElement.style.top = `${finalTop}px`;
        menuElement.style.left = `${finalLeft}px`;
        if (finalLeft - scrollX + menuRect.width > viewportWidth - 16) {
            menuElement.style.left = "auto";
            menuElement.style.right = "16px";
        }
    };
    const positionMenu = (openerElement) => {
        if (!openerElement || !component.element)
            return;
        positionElement(component.element, config.positionTarget ?? openerElement, config.position ?? "bottom-start", false);
    };
    const positionSubmenu = (submenuElement, parentItemElement, level = 1) => {
        if (!submenuElement || !parentItemElement)
            return;
        const prefPosition = level % 2 === 1 ? "right-start" : "left-start";
        submenuElement.style.zIndex = `${1000 + level * 10}`;
        positionElement(submenuElement, parentItemElement, prefPosition, true);
    };
    return {
        positionMenu,
        positionSubmenu,
        positionElement,
    };
};
const withPosition = (config) => (component) => {
    if (!component.element) {
        return component;
    }
    const positioner = createPositioner(component, config);
    return {
        ...component,
        position: positioner,
    };
};
export default withPosition;
