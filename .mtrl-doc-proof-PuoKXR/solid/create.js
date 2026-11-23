import { createEffect, createMemo, mergeProps, onCleanup, onMount, splitProps } from "solid-js";
import { Dynamic, isServer } from "solid-js/web";
import { camel, describe, describeDeclaration, getPrefix, pascal, toAttribute, writeDefaults, writeLive, } from "../elements/adapter.js";
import { RENDERED_HOST_ATTRIBUTE } from "../elements/styles.js";
import { shadow } from "./shadow.js";
export { configure } from "../elements/adapter.js";
const toHost = (type, value) => {
    const attribute = toAttribute(type, value);
    return type === "boolean" && attribute !== undefined ? true : attribute;
};
export const createComponent = (spec, define, _name) => {
    const described = describe(spec);
    const { attributes, properties, events, form } = described;
    const eventProps = events.map((event) => `on${pascal(event)}`);
    const slots = described.slots.map((slot) => [camel(slot), slot]);
    const slotKeys = new Set(slots.map(([key]) => key));
    const own = [...new Set([...attributes.keys(), ...properties, ...eventProps, ...slotKeys, ...(form ? ["name"] : []), "ref", "children"])];
    const component = (props) => {
        const [, others] = splitProps(props, own);
        let element;
        const slotted = new Map(slots.map(([key]) => [key, createMemo(() => props[key])]));
        const host = {};
        for (const [key, attribute] of attributes) {
            if (attribute.shadowed && !isServer)
                continue;
            Object.defineProperty(host, attribute.name, {
                enumerable: true,
                get: () => {
                    const value = slotted.get(key)?.() ?? props[key];
                    if (slotKeys.has(key) && value != null && typeof value !== "string")
                        return undefined;
                    if (value === undefined && attribute.shadowed) {
                        return toHost(attribute.type, props[attribute.name]);
                    }
                    return toHost(attribute.type, value);
                },
            });
        }
        if (form)
            Object.defineProperty(host, "name", { enumerable: true, get: () => props.name });
        const wrappers = slots.map(([key, slot]) => createMemo(() => {
            const value = slotted.get(key)?.();
            if (value == null || value === false || (attributes.has(key) && typeof value === "string"))
                return null;
            return Dynamic({ component: "span", slot, style: "display: contents", children: value });
        }));
        const shadowAttributes = () => {
            const snapshot = {};
            const take = (source) => {
                for (const key of Object.keys(source)) {
                    if (key === "children" || key === "ref" || key === "component")
                        continue;
                    const value = source[key];
                    if (typeof value === "function" || value === undefined)
                        continue;
                    snapshot[key] = value;
                }
            };
            take(host);
            take(others);
            return snapshot;
        };
        const tag = `${getPrefix()}-${spec.name}`;
        let rendered = false;
        Object.defineProperty(host, "children", {
            enumerable: true,
            get: () => {
                const named = wrappers.map((wrapper) => wrapper()).filter((wrapper) => wrapper !== null);
                const body = (named.length ? [props.children, ...named] : props.children);
                if (!isServer)
                    return body;
                const inner = shadow(tag, shadowAttributes(), body);
                const text = typeof inner === "object" && inner !== null && "t" in inner ? String(inner.t) : "";
                rendered = text.startsWith("<template shadowrootmode=");
                return inner;
            },
        });
        if (isServer) {
            for (const name of [RENDERED_HOST_ATTRIBUTE, ...(spec.marker ? [spec.marker] : [])]) {
                Object.defineProperty(host, name, {
                    enumerable: true,
                    get: () => rendered ? "" : undefined,
                });
            }
        }
        const ref = (node) => {
            element = node;
            const forwarded = props.ref;
            if (typeof forwarded === "function")
                forwarded(node);
        };
        const sync = () => {
            if (!element)
                return;
            writeDefaults(element, described, (key) => props[key]);
            writeLive(element, described, (property) => props[property]);
        };
        onMount(() => {
            const el = element;
            if (!el)
                return;
            sync();
            define({ prefix: getPrefix() });
            sync();
            for (const event of events) {
                const listener = (e) => {
                    const handler = props[`on${pascal(event)}`];
                    if (typeof handler === "function")
                        handler(e);
                };
                el.addEventListener(event, listener);
                onCleanup(() => el.removeEventListener(event, listener));
            }
        });
        createEffect(sync);
        return Dynamic(mergeProps(others, host, { component: `${getPrefix()}-${spec.name}`, ref }));
    };
    return component;
};
export const createDeclaration = (spec, _name) => {
    const attributes = describeDeclaration(spec);
    const component = (props) => {
        const [, others] = splitProps(props, [...attributes.keys()]);
        const host = {};
        for (const [key, attribute] of attributes) {
            Object.defineProperty(host, attribute.name, {
                enumerable: true,
                get: () => toHost(attribute.type, props[key]),
            });
        }
        return Dynamic(mergeProps(others, host, { component: `${getPrefix()}-${spec.name}` }));
    };
    return component;
};
