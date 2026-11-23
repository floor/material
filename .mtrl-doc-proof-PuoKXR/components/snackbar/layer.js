import { deepActiveElement } from "../../core/dom/focus.js";
const hostOf = (node) => node.host ?? null;
const up = (node) => {
    const parent = node.parentNode;
    return parent && parent.nodeType === 11 ? hostOf(parent) : parent;
};
const isModal = (node) => node.localName === 'dialog' && node.matches(':modal');
const modalsIn = (root, found) => {
    for (const element of Array.from(root.querySelectorAll('*'))) {
        if (isModal(element))
            found.push(element);
        if (element.shadowRoot)
            modalsIn(element.shadowRoot, found);
    }
    return found;
};
const blockingDialog = (doc) => {
    const active = deepActiveElement();
    for (let node = active; node; node = up(node)) {
        if (isModal(node))
            return node;
    }
    if (active && active !== doc.body)
        return null;
    const modals = modalsIn(doc, []);
    return modals[modals.length - 1] ?? null;
};
const within = (node, ancestor) => {
    for (let current = node; current; current = up(current)) {
        if (current === ancestor)
            return true;
    }
    return false;
};
export const placeInLayer = (element, moved) => {
    const doc = element.ownerDocument;
    const parent = element.parentNode;
    const next = element.nextSibling;
    const home = parent ?? doc.body;
    let dialog = null;
    let carrier = null;
    const leave = () => {
        dialog?.removeEventListener('close', place);
        carrier?.remove();
        carrier = null;
        dialog = null;
    };
    function place() {
        const blocking = blockingDialog(doc);
        const target = blocking && !within(home, blocking) ? blocking : null;
        if (target === dialog && element.isConnected)
            return;
        leave();
        if (target) {
            const root = home.getRootNode();
            if (hostOf(root) && root !== target.getRootNode()) {
                carrier = doc.createElement('div');
                carrier.style.display = 'contents';
                const shadow = carrier.attachShadow({ mode: 'open' });
                shadow.adoptedStyleSheets = root.adoptedStyleSheets;
                shadow.append(element);
                target.append(carrier);
            }
            else {
                target.append(element);
            }
            dialog = target;
            target.addEventListener('close', place);
        }
        else {
            home.insertBefore(element, next && next.parentNode === home ? next : null);
        }
        moved();
    }
    place();
    doc.addEventListener('focusin', place, true);
    return () => {
        doc.removeEventListener('focusin', place, true);
        leave();
        if (parent)
            parent.insertBefore(element, next && next.parentNode === parent ? next : null);
        else
            element.remove();
    };
};
