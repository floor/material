/** What every framework adapter shares: how a spec's attributes, live properties and events become a framework's props, how values are written as attributes, and the tag prefix. */
import { type AttributeType, type DefineOptions, type ElementAttributes, type ElementProperties } from "./define.js";
/** The runtime parts of an element spec an adapter reads. */
export interface ComponentSpec {
    name: string;
    /** `false`: the server never marks the host. */
    ssr?: boolean | ((host: HTMLElement) => boolean);
    /** The prefix-independent attribute the element's host carries once connected (`data-mtrl-icon-button`). */
    marker?: string;
    attributes?: Record<string, {
        type: AttributeType;
    }>;
    properties?: Record<string, unknown>;
    events?: Record<string, unknown>;
    slot?: {
        attribute: string;
    };
    slots?: readonly string[];
    form?: unknown;
    model?: string;
}
/** A declaration child (`<m-tab>`): attributes and children only, no behaviour. */
export interface DeclarationSpec {
    name: string;
    attributes: Record<string, {
        type: AttributeType;
    }>;
}
export type Pascal<S extends string> = S extends `${infer H}-${infer T}` ? `${Capitalize<H>}${Pascal<T>}` : Capitalize<S>;
/** An attribute a live property shadows is set through `default<Name>`. */
export type DefaultProps<S> = {
    [K in keyof ElementProperties<S> & keyof ElementAttributes<S> & string as `default${Capitalize<K>}`]?: ElementAttributes<S>[K];
};
/** Events a component had in 0.10 and material 3.0.0 removed: the icon button's `toggle`. */
export type RetiredEvents<S> = [
    S
] extends [
    import("./icon-button.js").IconButtonSpec
] ? [
    import("./icon-button.js").IconButtonSpec
] extends [
    S
] ? "toggle" : never : never;
/** A form-associated element takes `name`. */
export type FormProps<S> = S extends {
    form: unknown;
} ? {
    name?: string;
} : Record<never, never>;
/** The live property a framework's two-way binding (`v-model`, `bind:`) drives. */
export type ModelOf<S> = S extends {
    model: infer M extends keyof ElementProperties<S> & string;
} ? M : never;
export declare const camel: (name: string) => string;
export declare const pascal: (name: string) => string;
/** An attribute value as a framework should render it. */
export declare const toAttribute: (type: AttributeType, value: unknown) => string | undefined;
export interface AttributeProp {
    /** The attribute's name on the element. */
    name: string;
    type: AttributeType;
    /** A live property of the same name exists; this prop is its `default*`. */
    shadowed: boolean;
}
/** A spec, read once into the maps an adapter needs. */
export interface Described {
    /** Prop name (camelCase, or `default<Name>` when shadowed) to attribute. */
    attributes: Map<string, AttributeProp>;
    /** Live-state property names. */
    properties: string[];
    /** Event names, as the element dispatches them. */
    events: string[];
    /** The property two-way binding drives, if any. */
    model: string | undefined;
    form: boolean;
    /** Live property name to the attribute it shadows (`checked` → the `checked` attribute). */
    shadowedBy: Map<string, AttributeProp>;
    /** The named slots, as `slot="…"` names them. */
    slots: readonly string[];
}
export declare const describe: (spec: ComponentSpec) => Described;
/** Writes the attributes live properties shadow (`defaultChecked` → the `checked` attribute) on the element. */
export declare const writeDefaults: (element: HTMLElement, described: Described, read: (prop: string) => unknown) => void;
/** Writes live-state props to the element. */
export declare const writeLive: (element: HTMLElement, described: Described, read: (property: string) => unknown) => void;
/** On the server a live value is the markup's default, so the page renders in that state before it hydrates: the attribute each given live property shadows, with its value. */
export declare const serverDefaults: (described: Described, read: (property: string) => unknown) => Array<[
    string,
    string
]>;
export declare const describeDeclaration: (spec: DeclarationSpec) => Map<string, AttributeProp>;
/** The tag prefix adapters render. */
export declare const getPrefix: () => string;
/** Sets the tag prefix every adapter renders. */
export declare const configure: (options: DefineOptions) => void;
export declare const isBrowser: boolean;
