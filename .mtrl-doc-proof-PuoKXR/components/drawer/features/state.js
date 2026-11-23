import { DRAWER_EVENTS } from "../constants.js";
import { activeElementOf, deepActiveElement } from "../../../core/dom/focus.js";
import { hideFromTopLayer, onModalEscape, onTopLayerClose, showInTopLayer } from "../../../core/dom/layer.js";
const modals = new WeakMap();
function updateBackground(doc, state) {
    state.inerted.splice(0).forEach(element => element.removeAttribute("inert"));
    const topmost = state.roots.at(-1);
    let branch = topmost && topmost.localName !== "dialog" ? topmost : undefined;
    while (branch?.parentElement) {
        for (const sibling of branch.parentElement.children) {
            if (sibling !== branch && !sibling.hasAttribute("inert")) {
                sibling.setAttribute("inert", "");
                state.inerted.push(sibling);
            }
        }
        branch = branch.parentElement;
        if (branch === doc.body)
            break;
    }
}
function acquireModal(root) {
    const doc = root.ownerDocument;
    let state = modals.get(doc);
    if (!state) {
        state = { roots: [], inerted: [], overflow: doc.body.style.overflow, priority: doc.body.style.getPropertyPriority("overflow") };
        modals.set(doc, state);
        doc.body.style.setProperty("overflow", "hidden");
    }
    if (!state.roots.includes(root))
        state.roots.push(root);
    updateBackground(doc, state);
}
function releaseModal(root) {
    const doc = root.ownerDocument;
    const state = modals.get(doc);
    if (!state || !state.roots.includes(root))
        return;
    state.roots = state.roots.filter(element => element !== root);
    updateBackground(doc, state);
    if (!state.roots.length) {
        doc.body.style.setProperty("overflow", state.overflow, state.priority);
        modals.delete(doc);
    }
}
export const withState = (config) => (component) => {
    const root = component.element;
    const doc = root.ownerDocument;
    const isModal = config.variant === "modal";
    const top = config.layer === "top";
    const dismissible = config.dismissible !== false;
    let isOpen = config.open === true;
    let destroyed = false;
    let frame = null;
    let previousFocus = null;
    let escape;
    const scrimElement = isModal && !top ? doc.createElement("div") : null;
    if (scrimElement) {
        scrimElement.className = component.getClass("drawer__scrim");
        scrimElement.setAttribute("aria-hidden", "true");
        if (dismissible)
            scrimElement.addEventListener("click", close);
    }
    const cancelFocus = () => {
        if (frame !== null)
            cancelAnimationFrame(frame);
        frame = null;
    };
    const focusable = () => [...root.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')].filter(element => {
        const style = doc.defaultView.getComputedStyle(element);
        return element.tabIndex >= 0 && !element.matches(':disabled, [aria-disabled="true"]') && !element.closest('[inert], [hidden]') && style.display !== 'none' && style.visibility !== 'hidden';
    });
    const focusInside = () => {
        const items = focusable();
        (items.find(element => element.getAttribute("aria-current") === "page") || items[0] || root).focus();
    };
    const isTopModal = () => modals.get(doc)?.roots.at(-1) === root;
    function handleKeydown(event) {
        if (!isOpen || !isTopModal() || event.defaultPrevented || event.key !== "Tab")
            return;
        const items = focusable();
        const first = items[0], last = items.at(-1), active = activeElementOf(root), out = active === root || !root.contains(active);
        const target = !first ? root : event.shiftKey ? (active === first || out) && last : (active === last || out) && first;
        if (target) {
            event.preventDefault();
            target.focus();
        }
    }
    function handleFocus() {
        if (isOpen && isTopModal() && !root.contains(activeElementOf(root)))
            focusInside();
    }
    const handleBackdropClick = (event) => {
        if (event.target === root && dismissible)
            close();
    };
    const showTop = () => {
        if (root.isConnected)
            showInTopLayer(root, { kind: "modal" });
    };
    const synchronize = () => {
        root.classList.toggle(`${component.getClass("drawer")}--open`, isOpen);
        root.toggleAttribute("inert", !isOpen);
        root.setAttribute("aria-hidden", String(!isOpen));
        scrimElement?.classList.toggle(`${component.getClass("drawer__scrim")}--visible`, isOpen);
    };
    const activate = () => {
        if (!isModal)
            return;
        previousFocus = deepActiveElement();
        if (root.isConnected)
            acquireModal(root);
        escape?.stop();
        escape = onModalEscape(root, () => {
            if (dismissible)
                close();
        }, top && (() => root.dispatchEvent(new Event("cancel", { cancelable: true }))));
        doc.addEventListener("keydown", handleKeydown);
        doc.addEventListener("focusin", handleFocus);
        frame = requestAnimationFrame(() => {
            frame = null;
            if (destroyed || !isOpen || !root.isConnected)
                return;
            if (top)
                showTop();
            acquireModal(root);
            if (isTopModal())
                focusInside();
        });
    };
    const deactivate = () => {
        cancelFocus();
        escape?.stop();
        doc.removeEventListener("keydown", handleKeydown);
        doc.removeEventListener("focusin", handleFocus);
        const restore = isTopModal();
        if (top)
            hideFromTopLayer(root);
        releaseModal(root);
        if (restore && previousFocus?.isConnected && !previousFocus.closest('[inert]'))
            previousFocus.focus();
        previousFocus = null;
    };
    function open() {
        if (destroyed || isOpen)
            return;
        isOpen = true;
        if (top) {
            showTop();
            void root.offsetWidth;
        }
        synchronize();
        activate();
        component.emit(DRAWER_EVENTS.OPEN);
    }
    function close() {
        if (destroyed || !isOpen)
            return;
        isOpen = false;
        deactivate();
        synchronize();
        component.emit(DRAWER_EVENTS.CLOSE);
    }
    let stopCloses = null;
    if (top) {
        root.addEventListener("click", handleBackdropClick);
        stopCloses = onTopLayerClose(root, close);
    }
    synchronize();
    if (isOpen) {
        if (top)
            showTop();
        activate();
    }
    return {
        ...component,
        scrimElement,
        drawerState: { open, close, toggle: () => isOpen ? close() : open(), isOpen: () => isOpen },
        _stateCleanup: () => {
            if (destroyed)
                return;
            destroyed = true;
            isOpen = false;
            deactivate();
            synchronize();
            scrimElement?.removeEventListener("click", close);
            scrimElement?.remove();
            root.removeEventListener("click", handleBackdropClick);
            stopCloses?.();
        },
    };
};
