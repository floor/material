import { warnDev } from "../../core/utils/warn.js";
import { NESTED_ACTION_SELECTOR } from "./content.js";
export const syncNestedActions = (element, config) => {
    if (config.clickable && config.promoteChildActions && element.querySelector(NESTED_ACTION_SELECTOR)) {
        if (element.role === "button")
            element.role = "article";
        element.removeAttribute("tabindex");
    }
    else if ( /*#__PURE__*/(() => {
        try {
            return process.env.NODE_ENV !== "production";
        }
        catch {
            return false;
        }
    })() && process.env.NODE_ENV !== "production" && config.clickable && element.querySelector(NESTED_ACTION_SELECTOR)) {
        warnDev("card", "A clickable card contains actions. Use a card without clickable for child actions: https://m3.material.io/components/cards/accessibility");
    }
};
export const withAPI = ({ lifecycle, config }) => (component) => ({
    ...component,
    element: component.element,
    config,
    on(event, handler) {
        component.on(event, handler);
        return this;
    },
    off(event, handler) {
        component.off(event, handler);
        return this;
    },
    addContent(contentElement) {
        if (contentElement && contentElement.classList.contains(`${component.getClass('card')}__content`)) {
            component.element.appendChild(contentElement);
            syncNestedActions(component.element, config);
        }
        return this;
    },
    setHeader(headerElement) {
        const card = component.getClass('card');
        if (headerElement && headerElement.classList.contains(`${card}__header`)) {
            const title = (header) => header?.querySelector(`.${card}__header-title`)?.id || null;
            const existingHeader = component.element.querySelector(`.${card}__header`);
            if (existingHeader) {
                const previous = title(existingHeader);
                if (previous && component.element.getAttribute('aria-labelledby') === previous) {
                    component.element.removeAttribute('aria-labelledby');
                }
                existingHeader.remove();
            }
            let before = component.element.firstElementChild;
            while (before && before.classList.contains(`${card}__media`)) {
                before = before.nextElementSibling;
            }
            component.element.insertBefore(headerElement, before);
            syncNestedActions(component.element, config);
            const titleId = title(headerElement);
            if (titleId &&
                !component.element.hasAttribute('aria-labelledby') &&
                !component.element.hasAttribute('aria-label')) {
                component.element.setAttribute('aria-labelledby', titleId);
            }
        }
        return this;
    },
    addMedia(mediaElement, position = 'top') {
        if (mediaElement && mediaElement.classList.contains(`${component.getClass('card')}__media`)) {
            if (position === 'top') {
                component.element.insertBefore(mediaElement, component.element.firstChild);
            }
            else {
                component.element.appendChild(mediaElement);
            }
            syncNestedActions(component.element, config);
        }
        return this;
    },
    setActions(actionsElement) {
        if (actionsElement && actionsElement.classList.contains(`${component.getClass('card')}__actions`)) {
            const existingActions = component.element.querySelector(`.${component.getClass('card')}__actions`);
            if (existingActions) {
                existingActions.remove();
            }
            component.element.appendChild(actionsElement);
            syncNestedActions(component.element, config);
        }
        return this;
    },
    makeDraggable(dragStartCallback) {
        component.element.setAttribute('draggable', 'true');
        component.element.setAttribute('aria-grabbed', 'false');
        component.element.addEventListener('dragstart', (e) => {
            component.element.setAttribute('aria-grabbed', 'true');
            if (typeof dragStartCallback === 'function')
                dragStartCallback(e);
        });
        component.element.addEventListener('dragend', () => {
            component.element.setAttribute('aria-grabbed', 'false');
        });
        return this;
    },
    focus() {
        component.element.focus();
        return this;
    },
    addClass(...classes) {
        component.addClass(...classes);
        return this;
    },
    destroy() {
        lifecycle.destroy();
    }
});
