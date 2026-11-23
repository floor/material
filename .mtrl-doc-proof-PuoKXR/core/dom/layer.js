const seen = new WeakMap();
export const supportsTopLayer = (kind) => typeof (kind === "modal"
    ? typeof HTMLDialogElement === "function" && HTMLDialogElement.prototype.showModal
    : typeof HTMLElement === "function" && HTMLElement.prototype.showPopover) === "function";
const isShown = (element) => !!(element.open || (element.showPopover && element.matches(":popover-open")));
export const showInTopLayer = (element, { kind }) => {
    seen.delete(element);
    if (kind === "modal") {
        if (!element.showModal)
            return false;
        if (!element.open)
            element.showModal();
        return true;
    }
    if (!element.showPopover)
        return false;
    element.setAttribute("popover", kind.slice(8));
    if (!isShown(element))
        element.showPopover();
    return true;
};
export const hideFromTopLayer = (element) => {
    if (!isShown(element))
        return;
    seen.set(element, 1);
    if (element.open)
        element.close?.();
    else
        element.hidePopover();
};
export const onTopLayerClose = (element, callback) => {
    const listener = (event) => {
        if ((event.type === "toggle") === element.hasAttribute("popover") &&
            event.newState !== "open" &&
            !isShown(element) &&
            !seen.delete(element))
            callback();
    };
    element.addEventListener("toggle", listener);
    element.addEventListener("close", listener);
    return () => {
        element.removeEventListener("toggle", listener);
        element.removeEventListener("close", listener);
    };
};
export const inertOutside = (keep) => {
    const made = [];
    for (let node = keep, parent; (parent = node?.parentNode);) {
        for (const sibling of parent.children) {
            if (sibling !== node &&
                !sibling.hasAttribute("inert") &&
                !/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(sibling.tagName)) {
                sibling.setAttribute("inert", "");
                made.push(sibling);
            }
        }
        node =
            parent === document.body
                ? null
                : parent.host || (parent.parentElement && parent);
    }
    return () => {
        made.splice(0).forEach((el) => el.removeAttribute("inert"));
    };
};
let clock = 0;
const mark = (event) => {
    seen.set(event, ++clock);
};
const toggleMark = (view, d) => {
    const u = (seen.get(view) ?? 0) + d;
    seen.set(view, u);
    if (u === (d + 1) / 2)
        for (const t of ["keydown", "click"])
            if (d > 0)
                view.addEventListener(t, mark, true);
            else
                view.removeEventListener(t, mark, true);
};
export const eventsFrom = (element) => {
    const view = element.ownerDocument.defaultView;
    let since = clock;
    toggleMark(view, 1);
    return {
        after: (event) => (seen.get(event) ?? 0) > since,
        stop: () => {
            if (since >= 0) {
                since = -1;
                toggleMark(view, -1);
            }
        },
    };
};
const escapes = [];
const onEscapeKey = (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || event.isComposing)
        return;
    let at = escapes.length;
    while (at-- &&
        (escapes[at].v !== event.currentTarget ||
            (!escapes[at].e.isConnected && (escapes[at].stop(), true))))
        ;
    const top = escapes[at];
    const open = event.composedPath().find((n) => n.localName === "dialog" && n.hasAttribute?.("open"));
    if (!top || (open && open !== top.e))
        return;
    event.preventDefault();
    if ((seen.get(event) ?? 0) > top.s) {
        top.opening = false;
        top.d();
    }
};
export const onModalEscape = (element, escape, d) => {
    const v = element.ownerDocument.defaultView;
    const onCancel = (event) => {
        event.preventDefault();
        if (!entry.opening)
            escape();
    };
    const entry = {
        e: element,
        v,
        s: clock,
        d: d || escape,
        opening: true,
        stop: () => {
            const at = escapes.indexOf(entry);
            if (at < 0)
                return;
            escapes.splice(at, 1);
            toggleMark(v, -1);
            element.removeEventListener("cancel", onCancel);
            if (!escapes.some((other) => other.v === v))
                v.removeEventListener("keydown", onEscapeKey);
        },
    };
    toggleMark(v, 1);
    escapes.push(entry);
    element.addEventListener("cancel", onCancel);
    v.addEventListener("keydown", onEscapeKey);
    setTimeout(() => {
        entry.opening = false;
    }, 0);
    return entry;
};
