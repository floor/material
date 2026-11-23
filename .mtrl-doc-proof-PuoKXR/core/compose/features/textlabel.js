export const withTextLabel = (config = {}) => (component) => {
    if (!config.label)
        return component;
    const labelElement = document.createElement("label");
    const position = config.labelPosition || "start";
    labelElement.className = `${config.prefix}-${config.componentName}__label ${config.prefix}-${config.componentName}__label--${position}`;
    if (typeof config.label === "string")
        labelElement.textContent = config.label;
    else
        labelElement.append(config.label);
    const input = component.input;
    if (input instanceof HTMLElement) {
        if (!input.id)
            input.id = `${config.prefix}-${config.componentName}-${Math.random().toString(36).slice(2, 9)}`;
        labelElement.htmlFor = input.id;
        if (input.getAttribute("aria-label") === config.label) {
            input.removeAttribute("aria-label");
        }
    }
    const host = component.field ?? component.element;
    if (position === "start") {
        if (host.firstChild)
            host.insertBefore(labelElement, host.firstChild);
        else
            host.appendChild(labelElement);
    }
    else {
        host.appendChild(labelElement);
    }
    if (position && component.componentName !== "slider") {
        component.element.classList.add(`${config.prefix}-${config.componentName}--label-${position}`);
    }
    const label = {
        setText(text) {
            labelElement.textContent = text;
            return this;
        },
        getText() {
            return labelElement.textContent || "";
        },
        getElement() {
            return labelElement;
        },
    };
    return {
        ...component,
        label,
    };
};
