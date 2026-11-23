import { addIdRef, removeIdRef, supportingRow } from "./field.js";
export const withSupportingText = (config) => (component) => {
    const PREFIX = config.prefix || "mtrl";
    const COMPONENT = config.componentName || "text-field";
    let supportingElement = null;
    const row = supportingRow(component.element, PREFIX, COMPONENT);
    const show = (element) => void row.ensure().prepend(element);
    const supportingId = `${PREFIX}-${COMPONENT}-supporting-${Math.random().toString(36).slice(2, 9)}`;
    const describe = (element) => {
        if (!component.input)
            return;
        if (element)
            addIdRef(component.input, "aria-describedby", supportingId);
        else
            removeIdRef(component.input, "aria-describedby", supportingId);
    };
    let pendingFrame = 0;
    const cancelFill = () => {
        if (pendingFrame)
            cancelAnimationFrame(pendingFrame);
        pendingFrame = 0;
    };
    const createSupportingElement = () => {
        const element = document.createElement("div");
        element.className = `${PREFIX}-${COMPONENT}__helper`;
        element.id = supportingId;
        element.setAttribute("aria-live", "polite");
        return element;
    };
    const markError = (element, isError) => {
        element.classList.toggle(`${PREFIX}-${COMPONENT}__helper--error`, isError);
    };
    const detach = () => {
        cancelFill();
        if (!supportingElement)
            return;
        supportingElement.remove();
        supportingElement = null;
        row.release();
        describe(null);
    };
    if (config.supportingText) {
        supportingElement = createSupportingElement();
        supportingElement.textContent = config.supportingText;
        markError(supportingElement, Boolean(config.error));
        show(supportingElement);
        describe(supportingElement);
    }
    if ("lifecycle" in component && component.lifecycle?.destroy) {
        const originalDestroy = component.lifecycle.destroy;
        component.lifecycle.destroy = () => {
            detach();
            originalDestroy.call(component.lifecycle);
        };
    }
    return {
        ...component,
        get supportingTextElement() {
            return supportingElement;
        },
        setSupportingText(text, isError = false) {
            if (!text) {
                detach();
                return this;
            }
            if (supportingElement) {
                supportingElement.textContent = text;
                markError(supportingElement, isError);
                return this;
            }
            supportingElement = createSupportingElement();
            supportingElement.textContent = text;
            markError(supportingElement, isError);
            show(supportingElement);
            describe(supportingElement);
            const element = supportingElement;
            pendingFrame = requestAnimationFrame(() => {
                pendingFrame = 0;
                element.replaceChildren(document.createTextNode(element.textContent ?? ""));
            });
            return this;
        },
        removeSupportingText() {
            detach();
            return this;
        },
    };
};
