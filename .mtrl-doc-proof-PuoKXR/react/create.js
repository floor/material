"use client";
import * as React from "react";
import { RENDERED_HOST_ATTRIBUTE } from "../elements/styles.js";
import { shadow } from "./shadow.js";
import { camel, describe, describeDeclaration, getPrefix, isBrowser, pascal, serverDefaults, toAttribute, writeDefaults, writeLive, } from "../elements/adapter.js";
export { configure } from "../elements/adapter.js";
const useIsomorphicLayoutEffect = isBrowser ? React.useLayoutEffect : React.useEffect;
const assignRef = (ref, value) => {
    if (typeof ref === "function")
        ref(value);
    else if (ref)
        ref.current = value;
};
export const createComponent = (spec, define, displayName) => {
    const described = describe(spec);
    const properties = new Set(described.properties);
    const attributes = described.attributes;
    const events = new Map(described.events.map((event) => [`on${pascal(event)}`, event]));
    const slots = new Map(described.slots.map((slot) => [camel(slot), slot]));
    const Component = React.forwardRef((props, forwardedRef) => {
        const element = React.useRef(null);
        const host = {};
        const live = {};
        const handlers = {};
        const named = [];
        for (const [key, value] of Object.entries(props)) {
            const event = events.get(key);
            const attribute = attributes.get(key);
            const slot = slots.get(key);
            if (slot !== undefined && !(attribute && typeof value === "string")) {
                if (value != null && value !== false) {
                    named.push(React.createElement("span", { key: slot, slot, style: { display: "contents" } }, value));
                }
                continue;
            }
            if (event) {
                if (typeof value === "function")
                    handlers[event] = value;
            }
            else if (properties.has(key)) {
                live[key] = value;
            }
            else if (attribute?.shadowed) {
                if (!isBrowser)
                    host[attribute.name] = toAttribute(attribute.type, value);
            }
            else if (attribute) {
                host[attribute.name] = toAttribute(attribute.type, value);
            }
            else if (key === "className") {
                host.class = value;
            }
            else {
                host[key] = value;
            }
        }
        if (!isBrowser) {
            for (const [name, value] of serverDefaults(described, (property) => live[property]))
                host[name] ??= value;
        }
        const latest = React.useRef({ handlers, live });
        useIsomorphicLayoutEffect(() => {
            latest.current = { handlers, live };
        });
        useIsomorphicLayoutEffect(() => {
            if (element.current)
                writeDefaults(element.current, described, (key) => props[key]);
        });
        useIsomorphicLayoutEffect(() => {
            define({ prefix: getPrefix() });
        }, []);
        useIsomorphicLayoutEffect(() => {
            if (element.current)
                writeLive(element.current, described, (property) => live[property]);
        });
        React.useEffect(() => {
            const el = element.current;
            if (!el)
                return;
            const listeners = [...new Set(events.values())].map((event) => {
                const listener = (e) => {
                    latest.current.handlers[event]?.(e);
                    queueMicrotask(() => {
                        if (element.current)
                            writeLive(element.current, described, (property) => latest.current.live[property]);
                    });
                };
                el.addEventListener(event, listener);
                return () => el.removeEventListener(event, listener);
            });
            return () => listeners.forEach((remove) => remove());
        }, []);
        const ref = React.useCallback((node) => {
            element.current = node;
            assignRef(forwardedRef, node);
        }, [forwardedRef]);
        const { children, ...attributesAndProps } = host;
        const tag = `${getPrefix()}-${spec.name}`;
        const template = shadow(tag, attributesAndProps, React.createElement(React.Fragment, null, children, ...named));
        const hostProps = { ...attributesAndProps, ref };
        if (template != null) {
            hostProps[RENDERED_HOST_ATTRIBUTE] = "";
            if (spec.marker)
                hostProps[spec.marker] = "";
        }
        if (isBrowser && spec.ssr !== false)
            hostProps.suppressHydrationWarning = true;
        return React.createElement(tag, hostProps, template, children, ...named);
    });
    Component.displayName = displayName;
    return Component;
};
export const createDeclaration = (spec, displayName) => {
    const attributes = describeDeclaration(spec);
    const Component = React.forwardRef((props, ref) => {
        const host = { ref };
        for (const [key, value] of Object.entries(props)) {
            const attribute = attributes.get(key);
            const name = attribute ? attribute.name : key === "className" ? "class" : key;
            host[name] = attribute ? toAttribute(attribute.type, value) : value;
        }
        return React.createElement(`${getPrefix()}-${spec.name}`, host);
    });
    Component.displayName = displayName;
    return Component;
};
