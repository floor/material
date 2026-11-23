/** Solid components over the elements. */
import { type Component, type JSX } from "solid-js";
import type { DefineOptions, ElementEvents, ElementProps, ElementSlotProp } from "../elements/index.js";
import { type ComponentSpec, type DeclarationSpec, type DefaultProps, type FormProps, type Pascal, type RetiredEvents } from "../elements/adapter.js";
export { configure } from "../elements/adapter.js";
export type { DefaultProps, FormProps } from "../elements/adapter.js";
/** `change` → `onChange`, typed with the element's event. */
export type EventProps<S> = {
    [K in keyof ElementEvents<S> & string as `on${Pascal<K>}`]?: (event: ElementEvents<S>[K]) => void;
};
type BaseProps<S> = ElementProps<S> & DefaultProps<S> & FormProps<S> & EventProps<S>;
/** Each named slot as a prop taking JSX (`actions={<Button />}`), rendered into a `<span slot="…">` the adapter owns; a text prop of the same name (`headline`) takes its text or JSX. */
type SlotProps<S> = {
    [K in ElementSlotProp<S>]?: JSX.Element;
};
type OwnProps<S> = Omit<BaseProps<S>, ElementSlotProp<S>> & SlotProps<S>;
/** Globals solid-js 1.8 leaves off `JSX.HTMLAttributes`: `popover` until 1.8.15, `enterkeyhint` (typed on input and textarea only), and `nonce` (script and style only; on `DOMAttributes` from 1.9). */
type SolidHostGaps = {
    popover?: "" | "auto" | "manual" | "hint";
    enterkeyhint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
    nonce?: string;
};
type Missing<Base, Extra> = {
    [K in Exclude<keyof Extra, keyof Base>]?: K extends keyof Extra ? Extra[K] : never;
};
/** `JSX.HTMLAttributes` for the host, plus globals a supported Solid 1.8 type omits. */
export type SolidHostAttributes<E extends HTMLElement = HTMLElement> = JSX.HTMLAttributes<E> & Missing<JSX.HTMLAttributes<E>, SolidHostGaps>;
/** Props of a generated component: the element's own, plus any HTML attribute for the host. */
export type SolidProps<S, E extends HTMLElement> = OwnProps<S> & Omit<SolidHostAttributes, keyof OwnProps<S> | "ref" | RetiredProps<S>> & {
    [K in RetiredProps<S>]?: `${K} was removed in material 3.0.0: use onChange`;
} & {
    ref?: E | ((element: E) => void);
};
/** The handler props of events material 3.0.0 removed (`onToggle` on the icon button): refused, see `RetiredEvents`. */
type RetiredProps<S> = `on${Pascal<RetiredEvents<S>>}`;
export type DeclarationProps<A> = A & Omit<SolidHostAttributes, keyof A>;
/** A generated component. */
export type MComponent<S, E extends HTMLElement> = Component<SolidProps<S, E>>;
/** A generated declaration component. */
export type MDeclaration<A> = Component<DeclarationProps<A>>;
/**
 * The Solid component for an element.
 * @param spec
 * @param define
 * @param _name
 */
export declare const createComponent: <S, E extends HTMLElement>(spec: ComponentSpec, define: (options?: DefineOptions) => string, _name?: string) => MComponent<S, E>;
/** The Solid component for a declaration child; its parent registers the tag. */
export declare const createDeclaration: <A>(spec: DeclarationSpec, _name?: string) => MDeclaration<A>;
