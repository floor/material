import { setDecorativeIcons } from "./icon-opt-in.js";
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
    for (const child of el.childNodes)
        if (hasText(child, icon))
            return true;
    return false;
};
const keepsNameWithoutIcon = (host, icon) => {
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
const isFactoryIcon = (el) => {
    for (const name of Array.from(el.classList)) {
        if (name.endsWith("-button__icon") || name.endsWith("-fab__icon") || name.endsWith("-slider__icon"))
            return true;
    }
    return false;
};
const syncFactoryIcon = (icon) => {
    const host = icon.parentElement;
    if (!host)
        return;
    if (keepsNameWithoutIcon(host, icon)) {
        if (icon.getAttribute("aria-hidden") !== "true")
            icon.setAttribute("aria-hidden", "true");
    }
    else if (icon.hasAttribute("aria-hidden")) {
        icon.removeAttribute("aria-hidden");
    }
};
const isTrailingButton = (el) => {
    for (const name of Array.from(el.classList)) {
        if (name.endsWith("__trailing-icon--button"))
            return true;
    }
    return false;
};
const syncTrailing = (button) => {
    const only = button.firstElementChild;
    if (button.childNodes.length === 1 &&
        only?.tagName === "SPAN" &&
        only.getAttribute("aria-hidden") === "true")
        return;
    if (!button.firstChild)
        return;
    const wrap = document.createElement("span");
    wrap.setAttribute("aria-hidden", "true");
    while (button.firstChild)
        wrap.appendChild(button.firstChild);
    button.appendChild(wrap);
};
const scan = (root) => {
    const nodes = root.querySelectorAll("[class*='__icon'], [class*='trailing-icon--button']");
    for (const el of nodes) {
        if (isTrailingButton(el))
            syncTrailing(el);
        else if (isFactoryIcon(el))
            syncFactoryIcon(el);
    }
};
let watching = false;
export const enableDecorativeIcons = () => {
    setDecorativeIcons(true);
    if (watching || typeof document === "undefined")
        return;
    watching = true;
    const run = () => scan(document);
    run();
    if (typeof MutationObserver !== "function")
        return;
    const observer = new MutationObserver(run);
    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["aria-label", "aria-labelledby", "class"],
    });
};
