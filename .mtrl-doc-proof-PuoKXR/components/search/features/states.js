import { SEARCH_STATES, SEARCH_VIEW_MODES, SEARCH_CLASSES, SEARCH_ICONS, } from "../constants.js";
import { PREFIX } from "../../../core/config.js";
import { paintNamedIcon } from "./structure.js";
import { hideFromTopLayer, showInTopLayer, onModalEscape } from "../../../core/dom/layer.js";
import { activeElementOf } from "../../../core/dom/focus.js";
import { getCleanup } from "../../../core/compose/cleanup.js";
export const withStates = (config, getComponent) => (component) => {
    let currentState = config.initialState || SEARCH_STATES.BAR;
    let currentViewMode = config.viewMode || SEARCH_VIEW_MODES.DOCKED;
    let currentVariant = config.variant === "divided" ? "divided" : "contained";
    let isDisabled = config.disabled === true;
    const resources = getCleanup(component);
    let focusFrame = null;
    const cancelPendingFocus = () => {
        if (focusFrame !== null)
            cancelAnimationFrame(focusFrame);
        focusFrame = null;
    };
    resources.add(cancelPendingFocus);
    const focusInputNextFrame = () => {
        const input = component.structure?.input;
        if (!input)
            return;
        cancelPendingFocus();
        focusFrame = requestAnimationFrame(() => {
            focusFrame = null;
            input.focus();
        });
    };
    const getClass = (className) => {
        return component.getClass ? component.getClass(className) : className;
    };
    const prefix = config.prefix ?? PREFIX;
    const property = (name) => `--${prefix}-search-${name}`;
    const place = () => {
        const surface = component.structure?.surface;
        if (!surface)
            return;
        const box = component.element.getBoundingClientRect();
        surface.style.setProperty(property("top"), `${box.top}px`);
        surface.style.setProperty(property("left"), `${box.left}px`);
        surface.style.setProperty(property("width"), `${box.width}px`);
    };
    const onOutside = (event) => {
        const surface = component.structure?.surface;
        if (surface && !event.composedPath().includes(surface))
            collapseToBar(false);
    };
    let escape;
    let refocusing = false;
    const openSurface = () => {
        const surface = component.structure?.surface;
        if (!surface)
            return;
        const focused = activeElementOf(component.element);
        place();
        refocusing = true;
        if (currentViewMode === SEARCH_VIEW_MODES.FULLSCREEN) {
            surface.removeAttribute("role");
            surface.setAttribute("aria-label", component.structure?.input.getAttribute("aria-label") || "Search");
            showInTopLayer(surface, { kind: "modal" });
            escape?.stop();
            escape = onModalEscape(surface, () => collapseToBar());
        }
        else {
            showInTopLayer(surface, { kind: "popover-manual" });
            document.addEventListener("pointerdown", onOutside, true);
        }
        if (focused instanceof HTMLElement && surface.contains(focused) && activeElementOf(component.element) !== focused) {
            focused.focus({ preventScroll: true });
        }
        refocusing = false;
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
    };
    const closeSurface = (restoreFocus = true) => {
        const surface = component.structure?.surface;
        if (!surface)
            return;
        const focused = activeElementOf(component.element);
        const hadFocus = focused instanceof HTMLElement && surface.contains(focused);
        refocusing = true;
        hideFromTopLayer(surface);
        surface.removeAttribute("popover");
        surface.removeAttribute("aria-label");
        surface.setAttribute("role", "none");
        const now = activeElementOf(component.element);
        if (hadFocus && restoreFocus && now !== focused)
            focused.focus({ preventScroll: true });
        else if (!restoreFocus && now instanceof HTMLElement && surface.contains(now))
            now.blur();
        refocusing = false;
        window.removeEventListener("scroll", place, true);
        window.removeEventListener("resize", place);
        escape?.stop();
        document.removeEventListener("pointerdown", onOutside, true);
    };
    const expandToView = () => {
        if (currentState === SEARCH_STATES.VIEW || isDisabled || refocusing) {
            return;
        }
        const element = component.element;
        const structure = component.structure;
        currentState = SEARCH_STATES.VIEW;
        element.classList.remove(getClass(SEARCH_CLASSES.STATE_BAR));
        element.classList.add(getClass(SEARCH_CLASSES.STATE_VIEW));
        if (structure?.leadingIcon) {
            structure.leadingIcon.setAttribute("aria-label", "Go back");
            paintNamedIcon(structure.leadingIcon, SEARCH_ICONS.BACK);
        }
        openSurface();
        structure?.input.setAttribute("aria-expanded", "true");
        focusInputNextFrame();
        if (component.emit) {
            component.emit("expand", {
                component: getComponent(),
                state: currentState,
                viewMode: currentViewMode,
            });
        }
    };
    const collapseToBar = (restoreFocus = true) => {
        if (currentState === SEARCH_STATES.BAR) {
            return;
        }
        const element = component.element;
        const structure = component.structure;
        currentState = SEARCH_STATES.BAR;
        cancelPendingFocus();
        element.classList.remove(getClass(SEARCH_CLASSES.STATE_VIEW));
        element.classList.add(getClass(SEARCH_CLASSES.STATE_BAR));
        if (structure?.leadingIcon) {
            structure.leadingIcon.setAttribute("aria-label", "Search");
            paintNamedIcon(structure.leadingIcon, config.leadingIcon || SEARCH_ICONS.SEARCH);
        }
        closeSurface(restoreFocus);
        structure?.input.setAttribute("aria-expanded", "false");
        structure?.input.removeAttribute("aria-activedescendant");
        if (structure?.status)
            structure.status.textContent = "";
        if (component.emit) {
            component.emit("collapse", {
                component: getComponent(),
                state: currentState,
                viewMode: currentViewMode,
            });
        }
    };
    const setViewMode = (mode) => {
        if (mode === currentViewMode) {
            return;
        }
        const element = component.element;
        element.classList.remove(getClass(currentViewMode === SEARCH_VIEW_MODES.DOCKED
            ? SEARCH_CLASSES.VIEW_DOCKED
            : SEARCH_CLASSES.VIEW_FULLSCREEN));
        currentViewMode = mode;
        element.classList.add(getClass(mode === SEARCH_VIEW_MODES.DOCKED
            ? SEARCH_CLASSES.VIEW_DOCKED
            : SEARCH_CLASSES.VIEW_FULLSCREEN));
        if (currentState === SEARCH_STATES.VIEW) {
            closeSurface();
            openSurface();
        }
    };
    const setVariant = (variant) => {
        if (variant === currentVariant)
            return;
        component.element.classList.replace(getClass(currentVariant === "divided" ? SEARCH_CLASSES.VARIANT_DIVIDED : SEARCH_CLASSES.VARIANT_CONTAINED), getClass(variant === "divided" ? SEARCH_CLASSES.VARIANT_DIVIDED : SEARCH_CLASSES.VARIANT_CONTAINED));
        currentVariant = variant;
    };
    const applyDisabled = (disabled) => {
        isDisabled = disabled;
        const element = component.element;
        const structure = component.structure;
        const aria = disabled ? "true" : "false";
        if (disabled)
            element.classList.add(getClass(SEARCH_CLASSES.DISABLED));
        else
            element.classList.remove(getClass(SEARCH_CLASSES.DISABLED));
        element.setAttribute("aria-disabled", aria);
        if (structure?.input)
            structure.input.disabled = disabled;
        const interactiveElements = [
            structure?.leadingIcon,
            structure?.clearButton,
        ].filter(Boolean);
        if (structure?.trailingContainer) {
            structure.trailingContainer.querySelectorAll("button")
                .forEach((button) => interactiveElements.push(button));
        }
        interactiveElements.forEach((element) => {
            if (element) {
                element.tabIndex = disabled ? -1 : 0;
                element.setAttribute("aria-disabled", aria);
            }
        });
        if (!disabled && structure?.clearButton && structure.input && !structure.input.value) {
            structure.clearButton.tabIndex = -1;
        }
    };
    const disableComponent = () => applyDisabled(true);
    const enableComponent = () => applyDisabled(false);
    const updatePopulatedState = (hasValue) => {
        const element = component.element;
        if (hasValue) {
            element.classList.add(getClass(SEARCH_CLASSES.POPULATED));
        }
        else {
            element.classList.remove(getClass(SEARCH_CLASSES.POPULATED));
        }
    };
    const updateFocusedState = (isFocused) => {
        const element = component.element;
        if (isFocused) {
            element.classList.add(getClass(SEARCH_CLASSES.FOCUSED));
        }
        else {
            element.classList.remove(getClass(SEARCH_CLASSES.FOCUSED));
        }
    };
    if (currentState === SEARCH_STATES.VIEW) {
        setTimeout(() => {
            if (currentState === SEARCH_STATES.VIEW && component.element.isConnected) {
                openSurface();
                focusInputNextFrame();
            }
        }, 0);
    }
    if (isDisabled) {
        setTimeout(() => {
            disableComponent();
        }, 0);
    }
    return {
        ...component,
        states: {
            expand: expandToView,
            collapse: collapseToBar,
            getState: () => currentState,
            isExpanded: () => currentState === SEARCH_STATES.VIEW,
            setViewMode,
            getViewMode: () => currentViewMode,
            setVariant,
            getVariant: () => currentVariant,
            updatePopulatedState,
            updateFocusedState,
        },
        disabled: {
            enable() {
                enableComponent();
                return this;
            },
            disable() {
                disableComponent();
                return this;
            },
            isDisabled: () => isDisabled,
        },
    };
};
