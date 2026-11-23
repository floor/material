const createText = (element, config = {}) => {
    let textElement = null;
    const PREFIX = config.prefix || 'mtrl';
    const createElement = (content) => {
        const span = document.createElement('span');
        span.className = `${PREFIX}-${config.componentName || 'component'}__text`;
        if (typeof content === "string")
            span.textContent = content;
        else
            span.append(content);
        return span;
    };
    return {
        setText(text) {
            if (!textElement && text) {
                textElement = createElement(text);
                if (config.beforeElement) {
                    element.insertBefore(textElement, config.beforeElement);
                }
                else {
                    element.appendChild(textElement);
                }
            }
            else if (textElement) {
                if (typeof text === "string")
                    textElement.textContent = text;
                else
                    textElement.replaceChildren(text);
            }
            return this;
        },
        getText() {
            return textElement ? textElement.textContent || '' : '';
        },
        getElement() {
            return textElement;
        }
    };
};
export const withText = (config) => (component) => {
    const text = createText(component.element, {
        prefix: config.prefix,
        beforeElement: config.beforeElement,
        componentName: config.componentName || 'component'
    });
    if (config.text) {
        text.setText(config.text);
    }
    return {
        ...component,
        text
    };
};
