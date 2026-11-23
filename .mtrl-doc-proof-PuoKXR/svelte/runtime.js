import { RENDERED_HOST_ATTRIBUTE } from "../elements/styles.js";
import { camel, describe, describeDeclaration, getPrefix, isBrowser, serverDefaults, toAttribute, writeDefaults, writeLive, } from "../elements/adapter.js";
export { configure } from "../elements/adapter.js";
export const adapter = (spec, define) => {
    const described = describe(spec);
    const { attributes, properties, events, form } = described;
    const eventProps = new Set(events.map((event) => `on${event}`));
    const slots = new Map(described.slots.map((slot) => [camel(slot), slot]));
    const isSnippet = (key, value) => typeof value === "function" && slots.has(key);
    const hostAttributes = (props, live, shadow = "") => {
        const result = {};
        for (const [key, value] of Object.entries(props)) {
            const attribute = attributes.get(key);
            if (eventProps.has(key))
                continue;
            if (isSnippet(key, value))
                continue;
            if (attribute) {
                if (attribute.shadowed && isBrowser)
                    continue;
                result[attribute.name] = toAttribute(attribute.type, value);
            }
            else if (key !== "name" || form) {
                result[key] = value;
            }
        }
        if (!isBrowser)
            for (const [name, value] of serverDefaults(described, (p) => live[p]))
                result[name] ??= value;
        if (shadow) {
            result[RENDERED_HOST_ATTRIBUTE] = "";
            if (spec.marker)
                result[spec.marker] = "";
        }
        for (const symbol of Object.getOwnPropertySymbols(props))
            result[symbol] = props[symbol];
        return result;
    };
    const snippets = (props) => Object.entries(props)
        .filter(([key, value]) => isSnippet(key, value))
        .map(([key, value]) => [slots.get(key), value]);
    const action = (node, initial) => {
        let binding = initial;
        const target = node;
        const sync = () => {
            writeDefaults(node, described, (key) => binding.props[key]);
            writeLive(node, described, (property) => binding.live[property]);
        };
        sync();
        define({ prefix: getPrefix() });
        sync();
        const listeners = events.map((event) => {
            const listener = (e) => {
                const handler = binding.props[`on${event}`];
                if (typeof handler === "function")
                    handler(e);
                for (const property of properties) {
                    const value = target[property];
                    if (value !== binding.live[property])
                        binding.set[property]?.(value);
                }
            };
            node.addEventListener(event, listener);
            return () => node.removeEventListener(event, listener);
        });
        return {
            update(next) {
                binding = next;
                sync();
            },
            destroy() {
                listeners.forEach((remove) => remove());
            },
        };
    };
    return { tag: `${getPrefix()}-${spec.name}`, attributes: hostAttributes, snippets, action };
};
export const declaration = (spec) => {
    const attributes = describeDeclaration(spec);
    return {
        tag: `${getPrefix()}-${spec.name}`,
        attributes: (props) => {
            const result = {};
            for (const [key, value] of Object.entries(props)) {
                const attribute = attributes.get(key);
                result[attribute ? attribute.name : key] = attribute ? toAttribute(attribute.type, value) : value;
            }
            return result;
        },
    };
};
export const shadowMarkup = (runtime, props, children, live) => {
    if (isBrowser)
        return "";
    const render = globalThis[Symbol.for("mtrl.ssr")]?.svelte;
    if (!render)
        return "";
    return render(runtime.tag, runtime.attributes(props, live), children, runtime.snippets(props), getPrefix());
};
