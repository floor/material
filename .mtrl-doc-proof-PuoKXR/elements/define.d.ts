/** `defineElement` turns a component factory into a custom element. */
import { DEFAULT_PREFIX } from "./styles.js";
/** The part of a component the element relies on. */
export interface ElementComponent {
    element: HTMLElement;
    destroy: () => void;
}
export type AttributeType = "string" | "boolean" | "number";
export type AttributeValue = string | boolean | number | null;
export type Config = Record<string, unknown>;
export interface AttributeSpec<C> {
    type: AttributeType;
    /** Config key the attribute feeds at creation. */
    config?: string;
    /** Applies a change after creation. */
    update?: (component: C, value: AttributeValue, host: HTMLElement) => void;
}
export interface PropertySpec<C> {
    get: (component: C) => unknown;
    set: (component: C, value: unknown) => void;
    /** Config key a value set before creation feeds. */
    config?: string;
}
export interface EventSpec {
    /** Maps the factory payload to the event's `detail`. */
    detail?: (payload: unknown) => unknown;
    /** The event reports a change of state beside the model (`open`, `expanded`), not of the model: dispatching it leaves the element clean. */
    state?: boolean;
    listen?: (host: HTMLElement) => void;
}
export interface SlotSpec {
    /** Attribute whose text is the slot's fallback content. */
    attribute: string;
    /** The config key that takes the text or a node (`text`, `label`): the element passes its `<slot>` there and the factory places it. */
    config: string;
}
export interface FormSpec<C> {
    /** The value submitted with the form under the host's `name`; FormData submits its own entries instead (several values); null submits nothing. */
    value: (component: C, host: HTMLElement) => string | FormData | null;
    /** The inner control whose validity the element reports. */
    control?: (component: C) => HTMLInputElement | HTMLTextAreaElement | null;
    /** Events after which the form value is read again. */
    events?: readonly string[];
    /** Called when a `<label for>` or the host itself is clicked. */
    activate?: (component: C) => void;
    /** The state the browser keeps for the control, to hand back through `restore` when it restores the form (history navigation, autofill). */
    state?: (component: C) => string;
    restore?: (component: C, state: string) => void;
    disable?: (component: C, disabled: boolean) => void;
}
/** What a spec's `setup` sees of the element. */
export interface ElementHost<C extends ElementComponent> extends HTMLElement {
    /** The factory instance, while connected. */
    readonly component: C | null;
    readonly internals: ElementInternals | null;
    /** The model was changed by the user or by script: its attributes no longer move it. */
    readonly dirty: boolean;
}
/** What `defineElement` builds an element from: its name, the factory, the styles its shadow root adopts, and how attributes, properties, slots, events and the form map onto the component. */
export interface ElementSpec<C extends ElementComponent> {
    /** Name after the prefix: "switch" registers `<m-switch>`. */
    name: string;
    create: (config: Config) => C;
    /** Whether renderElement may build this element's shadow root. */
    ssr?: boolean | ((host: HTMLElement) => boolean);
    /** Style entries, in cascade order. */
    styles: readonly string[];
    /** CSS for the host, after the shared host rules. */
    hostStyles?: string;
    /** A boolean attribute the host carries from the moment it connects, whatever the tag prefix it was registered under. */
    marker?: string;
    attributes?: Record<string, AttributeSpec<C>>;
    properties?: Record<string, PropertySpec<C>>;
    methods?: readonly string[];
    /** The live property two-way binding drives (`v-model`, Svelte's `bind:`). */
    model?: string;
    /** Live properties beyond `model` whose attribute is their default the same way (the slider's `secondValue` and `second-value`). */
    defaults?: readonly string[];
    events?: Record<string, EventSpec>;
    slot?: SlotSpec;
    /** The named slots the element reads: a child with `slot="<name>"` goes there. */
    slots?: readonly string[];
    form?: FormSpec<C>;
    /** Extra config read from the host, such as children. */
    config?: (host: HTMLElement) => Config;
    /** Wiring that lives as long as one component; returns its cleanup. */
    setup?: (host: ElementHost<C>, component: C) => (() => void) | void;
    /** React to the host's children changing. */
    observeChildren?: boolean | ((host: ElementHost<C>, component: C) => boolean);
}
export interface DefineOptions {
    /** Tag prefix, without the dash. */
    prefix?: string;
}
export { DEFAULT_PREFIX };
/** Global base styles components rely on, which a shadow root does not inherit. */
export declare const SHADOW_BASE_STYLES: readonly [
    "ripple"
];
export declare const BASE_HOST_STYLES: string;
/** Internal shared host CSS, in browser cascade order. */
export declare const hostStyleText: (spec: {
    hostStyles?: string;
}) => string;
type Camel<S extends string> = S extends `${infer H}-${infer T}` ? `${H}${Capitalize<Camel<T>>}` : S;
type ValueOf<T> = T extends "boolean" ? boolean : T extends "number" ? number : string;
type Get<S, K extends string> = S extends {
    [P in K]: infer V;
} ? V : Record<never, never>;
/** Attributes as properties, camelCased: `supporting-text` is `supportingText`. */
export type ElementAttributes<S> = {
    [K in keyof Get<S, "attributes"> & string as Camel<K>]?: Get<S, "attributes">[K] extends {
        type: infer T;
    } ? ValueOf<T> : never;
};
/** Attributes as markup writes them (`supporting-text`), for a bare `m-*` tag in JSX (`material/react/jsx`, `material/solid/jsx`). */
export type ElementMarkup<S> = {
    [K in keyof Get<S, "attributes"> & string]?: Get<S, "attributes">[K] extends {
        type: infer T;
    } ? ValueOf<T> : never;
} & ElementSlotText<S>;
/** Live-state properties, typed by their getter. */
export type ElementProperties<S> = {
    [K in keyof Get<S, "properties"> & string]?: Get<S, "properties">[K] extends {
        get: (c: never) => infer R;
    } ? R : unknown;
};
/** The slot's fallback-text attribute, when the spec has one. */
export type ElementSlotText<S> = S extends {
    slot: {
        attribute: infer A extends string;
    };
} ? string extends A ? Record<never, never> : {
    [K in A]?: string;
} : Record<never, never>;
/** Event names to their `CustomEvent`, typed by the spec's `detail` mapper. */
export type ElementEvents<S> = {
    [K in keyof Get<S, "events"> & string]: CustomEvent<Get<S, "events">[K] extends {
        detail: (p: never) => infer D;
    } ? D : unknown>;
};
/** Methods the element forwards to its component. */
export type ElementMethods<S, C> = S extends {
    methods: readonly (infer M)[];
} ? string extends M ? Record<never, never> : {
    [K in M & keyof C & string]: C[K] extends (...args: infer A) => unknown ? (...args: A) => unknown : never;
} : Record<never, never>;
/** Every property an element instance has, beyond HTMLElement's. */
export type ElementProps<S> = Omit<ElementAttributes<S>, keyof ElementProperties<S>> & ElementProperties<S> & ElementSlotText<S>;
/** The names of the element's named slots, from its spec's `slots`. */
export type ElementSlots<S> = S extends {
    slots: readonly (infer N extends string)[];
} ? N : never;
/** A named slot as a prop name (`header-action` → `headerAction`), for adapters whose slots are props. */
export type ElementSlotProp<S> = Camel<ElementSlots<S>>;
/** An element instance, as a ref or `document.querySelector` returns it. */
export type ElementInstance<S, C extends ElementComponent> = ElementHost<C> & ElementProps<S> & ElementMethods<S, C>;
/** The element class for a spec. */
export declare const createElementClass: <C extends ElementComponent>(spec: ElementSpec<C>) => CustomElementConstructor;
/** The class of a declaration element (`<m-tab>`): it renders nothing, and each declared attribute has a property that reads and writes it. */
export declare const createDeclarationClass: (attributes: Record<string, {
    type: AttributeType;
}>) => CustomElementConstructor;
/** A spec with its element class and registration. */
export interface ElementDefinition<C extends ElementComponent> {
    spec: ElementSpec<C>;
    /** The element class, built on first access. */
    readonly element: CustomElementConstructor;
    /** Registers the element; a repeated call is a no-op. */
    define: (options?: DefineOptions) => string;
}
/** Creates the definition for a spec. */
export declare const defineElement: <C extends ElementComponent>(spec: ElementSpec<C>) => ElementDefinition<C>;
