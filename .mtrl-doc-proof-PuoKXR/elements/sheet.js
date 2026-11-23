const hasContent = (node) => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "");
export const headlineSlot = (component, parts, fallback) => {
    const slot = document.createElement("slot");
    slot.name = "headline";
    if (fallback)
        slot.textContent = fallback;
    component.element.querySelector(`.${component.getClass(parts.title)}`)?.replaceChildren(slot);
};
export const setHeadline = (component, value) => {
    const slot = component.element.querySelector('slot[name="headline"]');
    if (slot)
        slot.textContent = value === null || value === undefined ? "" : String(value);
};
export const syncSheet = (host, component, parts) => {
    const find = (name) => component.element.querySelector(`.${component.getClass(name)}`);
    const container = find(parts.container);
    const header = find(parts.header);
    const title = find(parts.title);
    const slot = title?.querySelector("slot");
    const named = !!slot && (slot.assignedNodes().some(hasContent) || (slot.textContent ?? "") !== "");
    if (title)
        title.style.display = named ? "" : "none";
    if (header)
        header.style.display = Array.from(header.children).some((child) => child.style.display !== "none") ? "" : "none";
    if (!container)
        return;
    const surface = component.element.localName === "dialog" ? component.element : container;
    if (surface !== container) {
        container.removeAttribute("aria-label");
        container.removeAttribute("aria-labelledby");
    }
    const label = host.getAttribute("aria-label") ?? (named ? null : host.getAttribute("title"));
    if (label !== null) {
        surface.setAttribute("aria-label", label);
        surface.removeAttribute("aria-labelledby");
    }
    else {
        surface.removeAttribute("aria-label");
        if (named && title)
            surface.setAttribute("aria-labelledby", title.id);
        else
            surface.removeAttribute("aria-labelledby");
    }
};
export const setSheetOpen = (component, open) => {
    if (open === component.isOpen())
        return;
    if (open)
        component.open();
    else
        component.close();
};
export const sheetSetup = (host, component, parts, listen, open = () => void component.open()) => {
    const sync = () => syncSheet(host, component, parts);
    const slot = component.element.querySelector('slot[name="headline"]');
    slot?.addEventListener("slotchange", sync);
    const titleObserver = typeof MutationObserver === "function"
        ? new MutationObserver(sync)
        : null;
    titleObserver?.observe(host, { attributes: true, attributeFilter: ["title"] });
    sync();
    const unlisten = listen(() => void host.toggleAttribute("open", component.isOpen()));
    if (host.hasAttribute("open"))
        open();
    return () => {
        slot?.removeEventListener("slotchange", sync);
        titleObserver?.disconnect();
        unlisten();
    };
};
