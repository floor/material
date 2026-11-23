import { setHTML } from "../../dom/html.js";
const createIcon = (element, config = {}) => {
    let iconElement = null;
    const PREFIX = config.prefix || "mtrl";
    const createIconElement = (html) => {
        const iconEl = document.createElement("span");
        iconEl.className = `${PREFIX}-icon`;
        const componentClass = `${PREFIX}-${config.componentName || "component"}__icon`;
        iconEl.classList.add(componentClass);
        if (config.iconPosition) {
            iconEl.classList.add(`${componentClass}--${config.iconPosition}`);
        }
        if (config.iconSize) {
            iconEl.classList.add(`${PREFIX}-icon--${config.iconSize}`);
        }
        setHTML(iconEl, html);
        return iconEl;
    };
    return {
        setIcon(html) {
            if (!iconElement && html) {
                iconElement = createIconElement(html);
                if (config.iconPosition === "end") {
                    element.appendChild(iconElement);
                }
                else {
                    const labelElement = element.getElementsByClassName(`${PREFIX}-${config.componentName || "component"}__label`)[0];
                    if (labelElement) {
                        if (labelElement.nextSibling) {
                            element.insertBefore(iconElement, labelElement.nextSibling);
                        }
                        else {
                            element.appendChild(iconElement);
                        }
                    }
                    else {
                        element.insertBefore(iconElement, element.firstChild);
                    }
                }
            }
            else if (iconElement && html) {
                setHTML(iconElement, html);
            }
            return this;
        },
        getIcon() {
            return iconElement ? iconElement.innerHTML : "";
        },
        getElement() {
            return iconElement;
        },
    };
};
export const withIcon = (config) => (component) => {
    const icon = createIcon(component.element, {
        prefix: config.prefix,
        componentName: config.componentName || "component",
        iconPosition: config.iconPosition,
        iconSize: config.iconSize,
    });
    if (config.icon) {
        icon.setIcon(config.icon);
    }
    if (component.componentName === "button" && config.icon && config.text) {
        component.element.classList.add(`${component.getClass("button")}--icon`);
    }
    return {
        ...component,
        icon,
    };
};
