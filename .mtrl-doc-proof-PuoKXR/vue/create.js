import { createStaticVNode, defineComponent, h, onBeforeUnmount, onMounted, onUpdated, ref, cloneVNode, Comment, Fragment, Text, } from "vue";
import { describe, describeDeclaration, getPrefix, isBrowser, serverDefaults, toAttribute, writeDefaults, writeLive, } from "../elements/adapter.js";
import { RENDERED_HOST_ATTRIBUTE } from "../elements/styles.js";
import { shadow } from "./shadow.js";
export { configure } from "../elements/adapter.js";
const tag = (nodes, slot) => nodes.flatMap((node) => {
    if (node.type === Fragment)
        return tag(node.children, slot);
    if (node.type === Comment)
        return [];
    if (node.type === Text)
        return [h("span", { slot, style: "display: contents" }, node.children)];
    return [cloneVNode(node, { slot })];
});
const slotted = (slots) => [
    ...(slots.default?.() ?? []),
    ...Object.entries(slots).flatMap(([name, render]) => name === "default" || name.startsWith("_") || typeof render !== "function" ? [] : tag(render(), name)),
];
const accept = () => true;
export const createComponent = (spec, define, name) => {
    const described = describe(spec);
    const { attributes, properties, events, model, form } = described;
    const props = [...attributes.keys(), ...properties, ...(model ? ["modelValue"] : []), ...(form ? ["name"] : [])];
    const emits = Object.fromEntries([...events, ...properties.map((p) => `update:${p}`), ...(model ? ["update:modelValue"] : [])].map((e) => [e, accept]));
    const component = defineComponent((raw, { emit, slots, expose, attrs }) => {
        const props = raw;
        const element = ref(null);
        expose({
            get element() {
                return element.value;
            },
        });
        const live = (property) => property === model && props.modelValue !== undefined ? props.modelValue : props[property];
        const host = () => {
            const result = { ref: element };
            for (const [key, attribute] of attributes) {
                const value = toAttribute(attribute.type, props[key]);
                if (attribute.shadowed && isBrowser)
                    continue;
                result[attribute.name] = value;
            }
            if (!isBrowser)
                for (const [name, value] of serverDefaults(described, live))
                    result[name] ??= value;
            if (form && props.name !== undefined)
                result.name = props.name;
            return result;
        };
        const sync = () => {
            const el = element.value;
            if (!el)
                return;
            writeDefaults(el, described, (key) => props[key]);
            writeLive(el, described, live);
        };
        const listeners = [];
        onMounted(() => {
            const el = element.value;
            if (!el)
                return;
            sync();
            define({ prefix: getPrefix() });
            sync();
            for (const event of events) {
                const listener = (e) => {
                    emit(event, e);
                    const target = el;
                    for (const property of properties) {
                        const value = target[property];
                        if (value !== live(property)) {
                            emit(`update:${property}`, value);
                            if (property === model)
                                emit("update:modelValue", value);
                        }
                    }
                };
                el.addEventListener(event, listener);
                listeners.push(() => el.removeEventListener(event, listener));
            }
        });
        onUpdated(sync);
        onBeforeUnmount(() => listeners.splice(0).forEach((remove) => remove()));
        const tag = () => `${getPrefix()}-${spec.name}`;
        const shadowProps = () => {
            const result = {};
            for (const [key, value] of Object.entries(host())) {
                if (key === "ref" || typeof value === "function" || value === undefined)
                    continue;
                result[key] = value;
            }
            for (const [key, value] of Object.entries(attrs)) {
                if (key === "ref" || typeof value === "function" || value === undefined || Object.prototype.hasOwnProperty.call(result, key))
                    continue;
                result[key] = value;
            }
            return result;
        };
        return () => {
            const nodes = slotted(slots);
            const inner = isBrowser ? "" : shadow(tag(), shadowProps(), () => nodes);
            const hostProps = host();
            const staticallyOptedOut = spec.ssr === false;
            const rendered = typeof inner === "string"
                ? inner.startsWith("<template shadowrootmode=")
                : !staticallyOptedOut;
            if (rendered) {
                hostProps[RENDERED_HOST_ATTRIBUTE] = "";
                if (spec.marker)
                    hostProps[spec.marker] = "";
            }
            if (typeof inner !== "string") {
                const held = createStaticVNode("", 1);
                held.children = inner;
                return h(tag(), hostProps, [held]);
            }
            if (inner)
                return h(tag(), hostProps, [createStaticVNode(inner, 1)]);
            return h(tag(), hostProps, nodes);
        };
    }, { name, props, emits });
    return component;
};
export const createDeclaration = (spec, name) => {
    const attributes = describeDeclaration(spec);
    const component = (props, { slots, attrs }) => {
        const host = { ...attrs };
        for (const [key, value] of Object.entries(props)) {
            const attribute = attributes.get(key);
            if (attribute)
                host[attribute.name] = toAttribute(attribute.type, value);
        }
        return h(`${getPrefix()}-${spec.name}`, host, slots.default?.());
    };
    component.displayName = name;
    component.props = [...attributes.keys()];
    return component;
};
