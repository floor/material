export const activeElementOf = (node) => {
    const root = node.getRootNode();
    return root.activeElement !== undefined ? root.activeElement : document.activeElement;
};
export const deepActiveElement = () => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement)
        active = active.shadowRoot.activeElement;
    return active;
};
export const tabStops = (container) => {
    const found = [];
    const visit = (element) => {
        const assigned = element.localName === "slot" &&
            element.assignedElements?.({ flatten: true });
        if (!assigned &&
            element.tabIndex >= 0 &&
            !element.matches(":disabled,[inert] *,[inert],[aria-hidden='true']") &&
            (element.offsetWidth || element.getClientRects().length) > 0)
            found.push(element);
        for (const child of assigned && assigned.length
            ? assigned
            : (element.shadowRoot ?? element).children)
            visit(child);
    };
    for (const child of container.children)
        visit(child);
    return found;
};
export const wrapTab = (container, event) => {
    if (event.key !== "Tab" || event.defaultPrevented)
        return;
    const stops = tabStops(container);
    const active = deepActiveElement();
    const target = !stops.length
        ? container
        : event.shiftKey
            ? (active === stops[0] || !stops.includes(active)) && stops.at(-1)
            : active === stops.at(-1) && stops[0];
    if (target) {
        event.preventDefault();
        target.focus();
    }
};
