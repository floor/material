import createBadge from "../../../components/badge/index.js";
import { PREFIX } from "../../config.js";
const addIdRef = (element, attribute, id) => {
    const ids = (element.getAttribute(attribute) ?? "").split(/\s+/).filter(Boolean);
    if (!ids.includes(id))
        ids.push(id);
    element.setAttribute(attribute, ids.join(" "));
};
const removeIdRef = (element, attribute, id) => {
    const ids = (element.getAttribute(attribute) ?? "").split(/\s+/).filter((value) => value && value !== id);
    if (ids.length)
        element.setAttribute(attribute, ids.join(" "));
    else
        element.removeAttribute(attribute);
};
let nextBadgeId = 0;
export const withBadge = (config) => (component) => {
    if (config.badge === undefined) {
        return component;
    }
    const badgeConfig = {
        label: config.badge,
        standalone: false,
        target: component.element,
        ...config.badgeConfig || {},
        position: config.badgeConfig?.position || 'top-right',
        prefix: config.prefix || PREFIX
    };
    const badge = createBadge(badgeConfig);
    const badgeId = `${badgeConfig.prefix}-badge-${++nextBadgeId}`;
    badge.element.id = badgeId;
    const target = component.element;
    const syncDescription = () => {
        const badgeClass = badge.getClass("badge");
        const shows = badge.element.classList.contains(`${badgeClass}--positioned`)
            && !badge.element.classList.contains(`${badgeClass}--invisible`)
            && (badge.getLabel() !== "" || (badge.element.getAttribute("aria-label") ?? "") !== "");
        if (shows)
            addIdRef(target, "aria-describedby", badgeId);
        else
            removeIdRef(target, "aria-describedby", badgeId);
    };
    syncDescription();
    const Observer = badge.element.ownerDocument.defaultView?.MutationObserver;
    const observer = Observer
        ? new Observer(syncDescription)
        : null;
    observer?.observe(badge.element, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        characterData: true,
        subtree: true,
    });
    const destroy = badge.destroy;
    badge.destroy = () => {
        observer?.disconnect();
        removeIdRef(target, "aria-describedby", badgeId);
        destroy();
    };
    return {
        ...component,
        badge
    };
};
