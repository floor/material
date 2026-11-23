/** What every generated Svelte component (`dist/svelte/*.svelte`) runs. */
import type { Snippet } from "svelte";
import type { Action } from "svelte/action";
import type { HTMLAttributes } from "svelte/elements";
import type { DefineOptions, ElementEvents, ElementProperties, ElementProps, ElementSlotProp } from "../elements/index.js";
import { type ComponentSpec, type DeclarationSpec, type DefaultProps, type FormProps, type RetiredEvents } from "../elements/adapter.js";
export { configure } from "../elements/adapter.js";
/** `change` → `onchange`, as Svelte 5 names event props, typed with the element's event. */
export type EventProps<S> = {
    [K in keyof ElementEvents<S> & string as `on${K}`]?: (event: ElementEvents<S>[K]) => void;
};
type BaseProps<S> = ElementProps<S> & DefaultProps<S> & FormProps<S> & EventProps<S>;
/** Each named slot as a snippet prop (`{#snippet actions()}`); a text prop of the same name (`headline`) takes its text or a snippet. */
type SnippetProps<S, P> = {
    [K in ElementSlotProp<S>]?: (K extends keyof P ? Exclude<P[K], undefined> : never) | Snippet;
};
type OwnProps<S> = Omit<BaseProps<S>, ElementSlotProp<S>> & SnippetProps<S, BaseProps<S>>;
/** `nonce` is global; Svelte types it on script and style only. */
type SvelteHostGaps = {
    nonce?: string;
};
type Missing<Base, Extra> = {
    [K in Exclude<keyof Extra, keyof Base>]?: K extends keyof Extra ? Extra[K] : never;
};
type SvelteHostAttributes = HTMLAttributes<HTMLElement> & Missing<HTMLAttributes<HTMLElement>, SvelteHostGaps>;
/** Props of a generated component: the element's own, plus any HTML attribute for the host. */
export type SvelteProps<S> = OwnProps<S> & Omit<SvelteHostAttributes, keyof OwnProps<S> | "children" | RetiredProps<S>> & {
    [K in RetiredProps<S>]?: `${K} was removed in material 3.0.0: use onchange`;
} & {
    children?: Snippet;
};
/** The handler props of events material 3.0.0 removed (`ontoggle` on the icon button): refused, see `RetiredEvents`. */
type RetiredProps<S> = `on${RetiredEvents<S>}`;
/** The live properties a generated component binds (`bind:checked`). */
export type Bindable<S> = keyof ElementProperties<S> & string;
export type DeclarationProps<A> = A & Omit<SvelteHostAttributes, keyof A | "children"> & {
    children?: Snippet;
};
/** What a generated component passes its action on every update. */
export interface Binding {
    /** The component's props other than the bindable ones and `children`. */
    props: Record<string, unknown>;
    /** The bindable props' current values. */
    live: Record<string, unknown>;
    /** Writes a bindable prop back, for `bind:`. */
    set: Record<string, (value: unknown) => void>;
}
export interface Adapter {
    tag: string;
    /** What to spread on the element. */
    attributes: (props: Record<string, unknown>, live: Record<string, unknown>, shadow?: string) => Record<string, unknown>;
    /** The named snippets, each with the slot it renders into (`headerAction` → `header-action`). */
    snippets: (props: Record<string, unknown>) => Array<[
        slot: string,
        snippet: Snippet
    ]>;
    action: Action<HTMLElement, Binding>;
}
/**
 * The runtime of the Svelte component for an element.
 * @param spec
 * @param define
 */
export declare const adapter: (spec: ComponentSpec, define: (options?: DefineOptions) => string) => Adapter;
/** The runtime of the Svelte component for a declaration child; its parent registers the tag. */
export declare const declaration: (spec: DeclarationSpec) => {
    tag: string;
    attributes: (props: Record<string, unknown>) => Record<string, unknown>;
};
/** Installed only by `material/ssr/svelte` on `Symbol.for("mtrl.ssr")`. */
export type SvelteShadowRenderer = (tag: string, attributes: Record<string, unknown>, children: Snippet | undefined, slots: Array<[
    slot: string,
    snippet: Snippet
]>, prefix: string) => string;
/** The declarative shadow template for a host, or `""` in the browser, when `material/ssr/svelte` was not imported, and when the element opts out of SSR. */
export declare const shadowMarkup: (runtime: Adapter, props: Record<string, unknown>, children: Snippet | undefined, live: Record<string, unknown>) => string;
