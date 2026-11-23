import { omitsAttribute } from "../utils/attributes.js";
import { safeUrl, URL_ATTRIBUTES } from "../utils/url.js";
export const setAttributes = (element, attributes = {}) => {
    if (!attributes)
        return element;
    const values = attributes;
    const attributeValue = (key, value) => URL_ATTRIBUTES.has(key.toLowerCase()) ? safeUrl(String(value)) : String(value);
    const keys = Object.keys(attributes);
    if (keys.length === 1) {
        const value = values[keys[0]];
        if (value != null &&
            keys[0] !== "style" &&
            !omitsAttribute(keys[0], value)) {
            element.setAttribute(keys[0], attributeValue(keys[0], value));
        }
        return element;
    }
    for (const key in attributes) {
        const value = values[key];
        if (value != null && key !== "style" && !omitsAttribute(key, value)) {
            element.setAttribute(key, attributeValue(key, value));
        }
    }
    return element;
};
export const removeAttributes = (element, attributes = []) => {
    for (let i = 0; i < attributes.length; i++) {
        element.removeAttribute(attributes[i]);
    }
    return element;
};
export const batchAttributes = (element, operations) => {
    for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if (op.action === "set" &&
            op.value != null &&
            op.key !== "style" &&
            !omitsAttribute(op.key, op.value)) {
            element.setAttribute(op.key, URL_ATTRIBUTES.has(op.key.toLowerCase()) ? safeUrl(String(op.value)) : String(op.value));
        }
        else if (op.action === "remove") {
            element.removeAttribute(op.key);
        }
    }
    return element;
};
export const hasAttribute = (element, attribute) => element.hasAttribute(attribute);
export const getAttribute = (element, attribute, defaultValue = "") => element.getAttribute(attribute) ?? defaultValue;
