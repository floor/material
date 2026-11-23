import { DEFAULT_PREFIX, } from "./define.js";
export const camel = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
export const pascal = (name) => camel(name).replace(/^./, (c) => c.toUpperCase());
export const toAttribute = (type, value) => {
    if (value === undefined || value === null)
        return undefined;
    if (type === "boolean")
        return value === false || value === "false" ? undefined : "";
    return String(value);
};
export const describe = (spec) => {
    const properties = Object.keys(spec.properties ?? {});
    const attributes = new Map();
    for (const [name, attribute] of Object.entries(spec.attributes ?? {})) {
        const key = camel(name);
        const shadowed = properties.includes(key);
        attributes.set(shadowed ? `default${pascal(key)}` : key, { name, type: attribute.type, shadowed });
    }
    if (spec.slot)
        attributes.set(spec.slot.attribute, { name: spec.slot.attribute, type: "string", shadowed: false });
    const shadowedBy = new Map([...attributes.values()].filter((a) => a.shadowed).map((a) => [a.name, a]));
    return {
        attributes,
        properties,
        events: Object.keys(spec.events ?? {}),
        model: spec.model,
        form: !!spec.form,
        shadowedBy,
        slots: spec.slots ?? [],
    };
};
export const writeDefaults = (element, described, read) => {
    for (const [key, attribute] of described.attributes) {
        if (!attribute.shadowed)
            continue;
        const raw = read(key);
        if (raw === undefined)
            continue;
        const value = toAttribute(attribute.type, raw);
        if (value === undefined)
            element.removeAttribute(attribute.name);
        else if (element.getAttribute(attribute.name) !== value)
            element.setAttribute(attribute.name, value);
    }
};
export const writeLive = (element, described, read) => {
    const target = element;
    for (const property of described.properties) {
        const value = read(property);
        if (value !== undefined && target[property] !== value)
            target[property] = value;
    }
};
export const serverDefaults = (described, read) => {
    const result = [];
    for (const property of described.properties) {
        const attribute = described.shadowedBy.get(property);
        const value = attribute ? toAttribute(attribute.type, read(property)) : undefined;
        if (attribute && value !== undefined)
            result.push([attribute.name, value]);
    }
    return result;
};
export const describeDeclaration = (spec) => new Map(Object.entries(spec.attributes).map(([name, a]) => [camel(name), { name, type: a.type, shadowed: false }]));
let prefix = DEFAULT_PREFIX;
export const getPrefix = () => prefix;
export const configure = (options) => {
    prefix = options.prefix ?? DEFAULT_PREFIX;
};
export const isBrowser = typeof window !== "undefined";
