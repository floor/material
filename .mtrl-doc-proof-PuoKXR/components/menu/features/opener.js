import { createMenuTasks } from "./tasks.js";
import { focusWithin } from "./layer.js";
const withOpener = (config) => (component) => {
    const tasks = createMenuTasks();
    const isTabNavigationActive = () => component.keyboard?.isTabNavigationActive?.() ?? false;
    const state = {
        openerElement: null,
        openerComponent: null,
        activeClass: "",
    };
    const resolveOpener = (opener) => {
        if (!opener)
            return { element: null, component: null };
        if (typeof opener === "string") {
            const element = document.querySelector(opener);
            if (!element) {
                console.warn(`Menu opener not found: ${opener}`);
                return { element: null, component: null };
            }
            return { element: element, component: null };
        }
        if (typeof opener === "object" && opener !== null) {
            if ("element" in opener && opener.element instanceof HTMLElement) {
                return { element: opener.element, component: opener };
            }
            if ("getElement" in opener && typeof opener.getElement === "function") {
                const element = opener.getElement();
                if (element instanceof HTMLElement) {
                    return { element, component: opener };
                }
            }
            if ("input" in opener && opener.input instanceof HTMLElement) {
                return { element: opener.input, component: opener };
            }
            if (opener instanceof HTMLElement) {
                return { element: opener, component: null };
            }
        }
        console.warn("Invalid opener type:", opener);
        return { element: null, component: null };
    };
    const determineActiveClass = (element) => {
        const classPrefix = component.getClass("").split("-")[0];
        if (element.tagName === "BUTTON" && element.classList.contains(`${classPrefix}-button`)) {
            return `${classPrefix}-button--active`;
        }
        else if (element.classList.contains(`${classPrefix}-chip`)) {
            return `${classPrefix}-chip--selected`;
        }
        else if (element.classList.contains(`${classPrefix}-text-field`) ||
            element.classList.contains(`${classPrefix}-select`)) {
            return `${classPrefix}-text-field--focused`;
        }
        else {
            return `${classPrefix}-menu__opener--active`;
        }
    };
    const setupOpenerEvents = (openerData) => {
        const { element: openerElement, component: openerComponent } = openerData;
        if (tasks.destroyed || !openerElement)
            return;
        if (state.openerElement && state.openerElement !== openerElement) {
            cleanup();
        }
        state.openerElement = openerElement;
        state.openerComponent = openerComponent;
        state.activeClass = determineActiveClass(openerElement);
        if (!config.manualOpen) {
            openerElement.addEventListener("click", handleOpenerClick);
            openerElement.addEventListener("keydown", handleOpenerKeydown);
            openerElement.addEventListener("blur", handleOpenerBlur);
        }
        if (config.listbox)
            return;
        if (!openerElement.hasAttribute("aria-haspopup"))
            openerElement.setAttribute("aria-haspopup", "true");
        openerElement.setAttribute("aria-expanded", "false");
        let menuId = component.element.id;
        if (!menuId) {
            menuId = `menu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            component.element.id = menuId;
        }
        openerElement.setAttribute("aria-controls", menuId);
    };
    const setOpenerActive = (active) => {
        if (!state.openerElement)
            return;
        if (state.openerComponent &&
            typeof state.openerComponent.setActive === "function") {
            state.openerComponent.setActive(active);
            return;
        }
        if (state.openerComponent && "selected" in state.openerComponent) {
            state.openerComponent.selected = active;
            return;
        }
        if (state.openerComponent &&
            typeof state.openerComponent.focus === "function" &&
            typeof state.openerComponent.blur === "function") {
            if (active) {
                state.openerComponent.focus();
            }
            else {
                state.openerComponent.blur();
            }
            return;
        }
        if (state.openerElement.classList) {
            if (active) {
                state.openerElement.classList.add(state.activeClass);
            }
            else {
                state.openerElement.classList.remove(state.activeClass);
            }
        }
    };
    const restoreFocusToOpener = () => {
        if (!state.openerElement)
            return;
        const openerComponent = state.openerComponent;
        if (openerComponent && typeof openerComponent.focus === "function") {
            tasks.requestAnimationFrame(() => {
                openerComponent.focus();
            });
            return;
        }
        if (openerComponent &&
            "input" in openerComponent &&
            openerComponent.input instanceof HTMLElement) {
            const input = openerComponent.input;
            tasks.requestAnimationFrame(() => {
                input.focus();
            });
            return;
        }
        const openerElement = state.openerElement;
        if (!openerElement)
            return;
        tasks.requestAnimationFrame(() => {
            openerElement.focus();
        });
    };
    const handleOpenerClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (component.menu) {
            const isOpen = component.menu.isOpen();
            if (isOpen) {
                component.menu.close(e);
            }
            else {
                component.menu.open(e, "mouse");
            }
        }
    };
    const handleOpenerKeydown = (e) => {
        if (!component.menu)
            return;
        const isOpen = component.menu.isOpen();
        switch (e.key) {
            case "Enter":
            case " ":
            case "ArrowDown":
            case "Down":
            case "ArrowUp":
            case "Up":
                e.preventDefault();
                if (!isOpen) {
                    component.menu.open(e, "keyboard");
                }
                break;
            case "Escape":
                if (isOpen) {
                    e.preventDefault();
                    component.menu.close(e);
                }
                break;
        }
    };
    const handleOpenerBlur = (e) => {
        if (!component.menu || !component.menu.isOpen())
            return;
        const relatedTarget = e.relatedTarget;
        if (isTabNavigationActive()) {
            tasks.setTimeout(() => {
                if (component.menu && component.menu.isOpen()) {
                    component.menu.close(e, false);
                }
            }, 10);
            return;
        }
        if (relatedTarget) {
            if (focusWithin(config, component.element, relatedTarget)) {
                return;
            }
            if (relatedTarget.getAttribute("aria-haspopup") === "true" ||
                relatedTarget.closest('[aria-haspopup="true"]')) {
                return;
            }
        }
        tasks.setTimeout(() => {
            if (component.menu && component.menu.isOpen()) {
                component.menu.close(e, false);
            }
        }, 50);
    };
    const cleanup = () => {
        tasks.cancelAll();
        if (state.openerElement) {
            if (!config.manualOpen) {
                state.openerElement.removeEventListener("click", handleOpenerClick);
                state.openerElement.removeEventListener("keydown", handleOpenerKeydown);
                state.openerElement.removeEventListener("blur", handleOpenerBlur);
            }
            state.openerElement.removeAttribute("aria-haspopup");
            state.openerElement.removeAttribute("aria-expanded");
            state.openerElement.removeAttribute("aria-controls");
            setOpenerActive(false);
        }
        state.openerComponent = null;
        state.openerElement = null;
        state.activeClass = "";
    };
    const { element, component: openerComponent } = resolveOpener(config.opener);
    if (element)
        setupOpenerEvents({ element, component: openerComponent });
    if (component.lifecycle) {
        const originalDestroy = component.lifecycle.destroy || (() => { });
        component.lifecycle.destroy = () => {
            if (tasks.destroyed)
                return;
            tasks.destroy();
            cleanup();
            originalDestroy.call(component.lifecycle);
        };
    }
    component.on("open", () => {
        if (state.openerElement && !config.listbox) {
            state.openerElement.setAttribute("aria-expanded", "true");
            setOpenerActive(true);
        }
    });
    component.on("close", (event) => {
        if (state.openerElement && !config.listbox) {
            state.openerElement.setAttribute("aria-expanded", "false");
            setOpenerActive(false);
            if (event.restoreFocus && !isTabNavigationActive()) {
                restoreFocusToOpener();
            }
        }
    });
    return {
        ...component,
        opener: {
            setOpener(opener) {
                const resolved = resolveOpener(opener);
                if (resolved.element) {
                    setupOpenerEvents({ element: resolved.element, component: resolved.component });
                }
                return component;
            },
            getOpener() {
                return state.openerElement;
            },
            getOpenerComponent() {
                return state.openerComponent;
            },
            setActive(active) {
                setOpenerActive(active);
                return component;
            },
            focus() {
                restoreFocusToOpener();
                return component;
            },
        },
    };
};
export default withOpener;
