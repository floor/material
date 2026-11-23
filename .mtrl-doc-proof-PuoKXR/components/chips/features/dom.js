import { createElement } from "../../../core/dom/create.js";
export const withDom = (config) => (component) => {
    const getClass = (className) => component.getClass(className);
    const hasLabel = config.label && config.label.trim().length > 0;
    let position = config.labelPosition === "end" ? "end" : "start";
    const root = component.element;
    const createLabel = (text) => {
        const created = createElement({ tag: "label", className: getClass("chips__label"), text });
        created.id = `${getClass("chips")}-label-${Math.random().toString(36).slice(2, 9)}`;
        root.insertBefore(created, root.firstChild);
        root.setAttribute("aria-labelledby", created.id);
        return created;
    };
    const syncClasses = () => {
        root.classList.toggle(getClass("chips--with-label"), !!label);
        root.classList.toggle(getClass("chips--label-end"), !!label && position === "end");
    };
    let label = hasLabel ? createLabel(config.label) : undefined;
    const chipContainer = createElement({
        tag: "div",
        className: getClass("chips__container"),
        container: component.element,
    });
    chipContainer.setAttribute("role", "row");
    const labelControl = {
        setText(text) {
            const value = (text ?? "").trim() ? text : "";
            if (!value) {
                label?.remove();
                label = undefined;
                root.removeAttribute("aria-labelledby");
            }
            else if (label) {
                label.textContent = value;
            }
            else {
                label = createLabel(value);
            }
            syncClasses();
        },
        getText: () => label?.textContent ?? "",
        setPosition(next) {
            position = next === "end" ? "end" : "start";
            syncClasses();
        },
        getPosition: () => position,
    };
    return {
        ...component,
        chipContainer,
        labelControl,
        getChipContainer: () => chipContainer,
        getLabel: () => label || null,
    };
};
