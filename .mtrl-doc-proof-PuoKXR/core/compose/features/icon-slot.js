const factoryIcon = (host) => {
    const children = host.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const classes = child.classList;
        if (!classes)
            continue;
        for (const name of Array.from(classes)) {
            if (name.endsWith("__icon"))
                return child;
        }
    }
    return null;
};
const slotHosts = new WeakMap();
export const bindSlotHost = (slot, host) => {
    slotHosts.set(slot, host);
};
const lightNodes = (host, slot) => {
    const name = slot.getAttribute("name") ?? "";
    const nodes = [];
    for (const node of host.childNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE)
            continue;
        const slotName = node.nodeType === Node.ELEMENT_NODE ? (node.getAttribute("slot") ?? "") : "";
        if (slotName === name)
            nodes.push(node);
    }
    return nodes;
};
const slottedNodes = (el) => {
    const read = el.assignedNodes;
    if (typeof read !== "function")
        return null;
    const assigned = read.call(el);
    if (assigned.length === 0)
        return null;
    const fallback = el.childNodes;
    if (assigned.length === fallback.length && assigned.every((node, index) => node === fallback[index])) {
        return null;
    }
    return assigned;
};
const shownBySlot = (el) => {
    const assigned = slottedNodes(el);
    if (assigned)
        return assigned;
    const host = slotHosts.get(el);
    if (host) {
        const nodes = lightNodes(host, el);
        if (nodes.length)
            return nodes;
    }
    return el.childNodes;
};
const hasText = (node, icon) => {
    if (node === icon)
        return false;
    if (node.nodeType === Node.TEXT_NODE)
        return !!(node.textContent ?? "").trim();
    if (node.nodeType !== Node.ELEMENT_NODE)
        return false;
    const el = node;
    if (icon.contains(el) || el.getAttribute("aria-hidden") === "true")
        return false;
    if ((el.getAttribute("aria-label") ?? "").trim())
        return true;
    if (el.localName === "img" && (el.getAttribute("alt") ?? "").trim())
        return true;
    const nodes = el.localName === "slot" ? shownBySlot(el) : el.childNodes;
    for (const child of nodes)
        if (hasText(child, icon))
            return true;
    return false;
};
const keepsName = (host, icon) => {
    if ((host.getAttribute("aria-label") ?? "").trim())
        return true;
    const labelledBy = (host.getAttribute("aria-labelledby") ?? "").trim();
    if (labelledBy) {
        for (const id of labelledBy.split(/\s+/)) {
            const ref = host.ownerDocument.getElementById(id);
            if (ref && ref !== host && !icon.contains(ref) && hasText(ref, icon))
                return true;
        }
    }
    for (const child of host.childNodes)
        if (hasText(child, icon))
            return true;
    return false;
};
export const syncSlottedIcon = (host) => {
    const icon = factoryIcon(host);
    if (!icon)
        return;
    if (keepsName(host, icon))
        icon.setAttribute("aria-hidden", "true");
    else
        icon.removeAttribute("aria-hidden");
};
