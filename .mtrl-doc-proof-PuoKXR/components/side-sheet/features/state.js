import { SIDE_SHEET_CLASSES, SIDE_SHEET_EVENTS, SIDE_SHEET_VARIANTS, } from "../constants.js";
import { deepActiveElement, wrapTab } from "../../../core/dom/focus.js";
import { hideFromTopLayer, inertOutside, onModalEscape, onTopLayerClose, showInTopLayer, } from "../../../core/dom/layer.js";
export const withState = (config) => (component) => {
    const { element, getClass, structure } = component;
    const root = getClass(SIDE_SHEET_CLASSES.ROOT);
    const isModal = config.variant === SIDE_SHEET_VARIANTS.MODAL;
    const top = config.layer === "top";
    let open = false;
    let previouslyFocused = null;
    let restorePage;
    let escape;
    const onStack = (on) => {
        escape?.stop();
        escape =
            on && isModal
                ? onModalEscape(element, () => {
                    if (config.closeOnEscape)
                        hide();
                })
                : undefined;
    };
    const trap = (on) => {
        onStack(on);
        if (!isModal || top)
            return;
        restorePage?.();
        restorePage = on ? inertOutside(element) : undefined;
        if (on)
            element.addEventListener("keydown", handleTab);
        else
            element.removeEventListener("keydown", handleTab);
    };
    const apply = () => {
        element.classList.toggle(`${root}--open`, open);
        element.setAttribute("aria-hidden", open ? "false" : "true");
        element.style.pointerEvents = open ? "" : "none";
    };
    function show() {
        if (open)
            return;
        if (isModal)
            previouslyFocused = deepActiveElement();
        if (top) {
            if (!showInTopLayer(element, { kind: "modal" }))
                element.setAttribute("open", "");
            void element.offsetWidth;
        }
        open = true;
        apply();
        trap(true);
        if (isModal)
            structure.container.focus();
        component.emit(SIDE_SHEET_EVENTS.OPEN);
    }
    function hide() {
        if (!open)
            return;
        open = false;
        apply();
        trap(false);
        if (top)
            hideFromTopLayer(element);
        if (isModal && previouslyFocused?.isConnected) {
            previouslyFocused.focus();
            previouslyFocused = null;
        }
        component.emit(SIDE_SHEET_EVENTS.CLOSE);
    }
    const handleKeydown = (event) => {
        if (event.key !== "Escape" ||
            !open ||
            !config.closeOnEscape ||
            !event.composedPath().includes(element))
            return;
        event.preventDefault();
        hide();
    };
    const handleScrimClick = (event) => {
        if ((event.currentTarget !== element || event.target === element) && config.closeOnScrimClick)
            hide();
    };
    const handleTab = (event) => wrapTab(element, event);
    if (config.open)
        open = true;
    apply();
    if (open)
        onStack(true);
    let stopCloses = null;
    if (top) {
        element.addEventListener("click", handleScrimClick);
        element.addEventListener("keydown", handleTab);
        stopCloses = onTopLayerClose(element, hide);
        if (open && element.isConnected)
            showInTopLayer(element, { kind: "modal" });
    }
    else if (!isModal && config.closeOnEscape) {
        document.addEventListener("keydown", handleKeydown);
    }
    structure.scrim?.addEventListener("click", handleScrimClick);
    structure.closeButton?.addEventListener("click", hide);
    return {
        ...component,
        state: {
            open: show,
            close: hide,
            toggle: () => (open ? hide() : show()),
            isOpen: () => open,
            release: () => {
                document.removeEventListener("keydown", handleKeydown);
                structure.scrim?.removeEventListener("click", handleScrimClick);
                structure.closeButton?.removeEventListener("click", hide);
                element.removeEventListener("click", handleScrimClick);
                element.removeEventListener("keydown", handleTab);
                trap(false);
                stopCloses?.();
                if (top)
                    hideFromTopLayer(element);
            },
        },
    };
};
