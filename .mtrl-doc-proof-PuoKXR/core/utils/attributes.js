export const BOOLEAN_ATTRIBUTES = new Set([
    "disabled",
    "checked",
    "readonly",
    "required",
    "hidden",
    "selected",
    "open",
    "multiple",
]);
export const omitsAttribute = (key, value) => value === false && BOOLEAN_ATTRIBUTES.has(key.toLowerCase());
