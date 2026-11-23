import { omitsAttribute } from "../utils/attributes.js";
import { safeUrl, URL_ATTRIBUTES } from "../utils/url.js";
export { normalizeClasses } from "./classes.js";
export const createElement = (tag, attributes = {}) => {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === "className") {
            element.className = value;
        }
        else if (key === "style" && typeof value === "object") {
            Object.assign(element.style, value);
        }
        else if (key === "data" && value && typeof value === "object") {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = String(dataValue);
            });
        }
        else if (key === "children" && Array.isArray(value)) {
            value.forEach((child) => {
                if (child instanceof Node) {
                    element.appendChild(child);
                }
                else if (child != null) {
                    element.appendChild(document.createTextNode(String(child)));
                }
            });
        }
        else if (key.startsWith("on") && typeof value === "function") {
            const eventName = key.slice(2).toLowerCase();
            element.addEventListener(eventName, value);
        }
        else if (key.startsWith("on")) {
        }
        else if (value !== null && value !== undefined && !omitsAttribute(key, value)) {
            element.setAttribute(key, URL_ATTRIBUTES.has(key.toLowerCase()) ? safeUrl(String(value)) : String(value));
        }
    });
    return element;
};
export const setStyles = (element, styles) => {
    Object.assign(element.style, styles);
    return element;
};
export const matches = (element, selector) => {
    return element.matches(selector);
};
export const closest = (element, selector) => {
    return element.closest(selector);
};
