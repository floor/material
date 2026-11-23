import { BOTTOM_SHEET_CLASSES, BOTTOM_SHEET_EVENTS, BOTTOM_SHEET_STATES, BOTTOM_SHEET_VARIANTS, } from "../constants.js";
import { deepActiveElement, wrapTab } from "../../../core/dom/focus.js";
import { hideFromTopLayer, inertOutside, onModalEscape, onTopLayerClose, showInTopLayer, } from "../../../core/dom/layer.js";
export const withState = (config) => (component) => {
    const { element, getClass, structure } = component;
    const root = getClass(BOTTOM_SHEET_CLASSES.ROOT);
    const isModal = config.variant === BOTTOM_SHEET_VARIANTS.MODAL;
    const top = config.layer === "top";
    let state = config.initialState ?? BOTTOM_SHEET_STATES.HIDDEN;
    let previouslyFocused = null;
    let restorePage;
    let escape;
    const onStack = (on) => {
        escape?.stop();
        escape =
            on && isModal
                ? onModalEscape(element, () => {
                    if (config.closeOnEscape)
                        close();
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
    const applyState = (next) => {
        for (const name of Object.values(BOTTOM_SHEET_STATES)) {
            element.classList.toggle(`${root}--${name}`, name === next);
        }
        const open = next !== BOTTOM_SHEET_STATES.HIDDEN;
        element.setAttribute("aria-hidden", open ? "false" : "true");
        element.style.pointerEvents = open ? "" : "none";
    };
    const fullHeight = `${root}--full-height`;
    const syncFullHeight = () => {
        const box = structure.container;
        element.classList.toggle(fullHeight, state === BOTTOM_SHEET_STATES.EXPANDED && box.offsetHeight > 0 && box.offsetTop < 1);
    };
    const placeContent = structure.setContent;
    structure.setContent = (next) => {
        placeContent(next);
        syncFullHeight();
    };
    const boxObserver = typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            if (state === BOTTOM_SHEET_STATES.EXPANDED)
                syncFullHeight();
        })
        : null;
    boxObserver?.observe(structure.container);
    const setState = (next) => {
        if (next === state)
            return;
        const previous = state;
        state = next;
        applyState(next);
        syncFullHeight();
        component.emit(BOTTOM_SHEET_EVENTS.STATE_CHANGE, { state: next, previous });
    };
    const handleKeydown = (event) => {
        if (event.key !== "Escape" ||
            state === BOTTOM_SHEET_STATES.HIDDEN ||
            !config.closeOnEscape ||
            !event.composedPath().includes(element))
            return;
        event.preventDefault();
        close();
    };
    const handleScrimClick = (event) => {
        if ((event.currentTarget !== element || event.target === element) && config.closeOnScrimClick)
            close();
    };
    const handleTab = (event) => wrapTab(element, event);
    function open(to = BOTTOM_SHEET_STATES.PARTIAL) {
        if (state === to)
            return;
        const wasHidden = state === BOTTOM_SHEET_STATES.HIDDEN;
        if (wasHidden && isModal) {
            previouslyFocused = deepActiveElement();
        }
        if (wasHidden && top) {
            if (!showInTopLayer(element, { kind: "modal" }))
                element.setAttribute("open", "");
            void element.offsetWidth;
        }
        setState(to);
        if (wasHidden) {
            trap(true);
            if (isModal)
                structure.container.focus();
            component.emit(BOTTOM_SHEET_EVENTS.OPEN);
        }
    }
    function close() {
        if (state === BOTTOM_SHEET_STATES.HIDDEN)
            return;
        setState(BOTTOM_SHEET_STATES.HIDDEN);
        trap(false);
        if (top)
            hideFromTopLayer(element);
        if (isModal && previouslyFocused?.isConnected) {
            previouslyFocused.focus();
            previouslyFocused = null;
        }
        component.emit(BOTTOM_SHEET_EVENTS.CLOSE);
    }
    applyState(state);
    syncFullHeight();
    if (state !== BOTTOM_SHEET_STATES.HIDDEN)
        onStack(true);
    const onResize = () => {
        if (state === BOTTOM_SHEET_STATES.EXPANDED)
            syncFullHeight();
    };
    const view = element.ownerDocument.defaultView;
    view?.addEventListener("resize", onResize);
    let stopCloses = null;
    if (top) {
        element.addEventListener("click", handleScrimClick);
        element.addEventListener("keydown", handleTab);
        stopCloses = onTopLayerClose(element, close);
        if (state !== BOTTOM_SHEET_STATES.HIDDEN && element.isConnected) {
            showInTopLayer(element, { kind: "modal" });
        }
    }
    else if (!isModal && config.closeOnEscape) {
        document.addEventListener("keydown", handleKeydown);
    }
    structure.scrim?.addEventListener("click", handleScrimClick);
    return {
        ...component,
        state: {
            open,
            close,
            expand: () => open(BOTTOM_SHEET_STATES.EXPANDED),
            collapse: () => open(BOTTOM_SHEET_STATES.PARTIAL),
            isOpen: () => state !== BOTTOM_SHEET_STATES.HIDDEN,
            getState: () => state,
            setState,
            release: () => {
                boxObserver?.disconnect();
                view?.removeEventListener("resize", onResize);
                document.removeEventListener("keydown", handleKeydown);
                structure.scrim?.removeEventListener("click", handleScrimClick);
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
