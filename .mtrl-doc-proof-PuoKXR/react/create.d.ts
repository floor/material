/** React components over the elements. */
import * as React from "react";
import type { DefineOptions, ElementEvents, ElementProps, ElementSlotProp } from "../elements/index.js";
import { type ComponentSpec, type DeclarationSpec, type DefaultProps, type FormProps, type Pascal, type RetiredEvents } from "../elements/adapter.js";
export { configure } from "../elements/adapter.js";
export type { DefaultProps, FormProps } from "../elements/adapter.js";
/** `change` → `onChange`, typed with the element's event. */
export type EventProps<S> = {
    [K in keyof ElementEvents<S> & string as `on${Pascal<K>}`]?: (event: ElementEvents<S>[K]) => void;
};
type BaseProps<S> = ElementProps<S> & DefaultProps<S> & EventProps<S>;
/** Each named slot as a prop taking nodes (`actions={<Button />}`), rendered into a `<span slot="…">` the adapter owns; a text prop of the same name (`headline`) takes its text or nodes. */
type SlotProps<S> = {
    [K in ElementSlotProp<S>]?: React.ReactNode;
};
type OwnProps<S> = Omit<BaseProps<S>, ElementSlotProp<S>> & SlotProps<S>;
/** `@types/react` 18's `HTMLAttributes` has no `popover` through 18.3.31. */
type ReactHostGaps = {
    popover?: "" | "auto" | "manual" | "hint";
    enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
    nonce?: string;
};
type Missing<Base, Extra> = {
    [K in Exclude<keyof Extra, keyof Base>]?: K extends keyof Extra ? Extra[K] : never;
};
/** `HTMLAttributes` for the host, plus globals a supported React 18 type omits. */
export type ReactHostAttributes<E extends HTMLElement = HTMLElement> = React.HTMLAttributes<E> & Missing<React.HTMLAttributes<E>, ReactHostGaps>;
/** Props of a generated component: the element's own, plus any HTML attribute for the host. */
export type ComponentProps<S> = OwnProps<S> & FormProps<S> & Omit<ReactHostAttributes, keyof OwnProps<S> | RetiredProps<S>> & {
    [K in RetiredProps<S>]?: `${K} was removed in material 3.0.0: use onChange`;
} & {
    children?: React.ReactNode;
};
/** The handler props of events material 3.0.0 removed (`onToggle` on the icon button): refused, see `RetiredEvents`. */
type RetiredProps<S> = `on${Pascal<RetiredEvents<S>>}`;
/** A generated component; named so declarations stay short. */
export type MComponent<S, E extends HTMLElement> = React.ForwardRefExoticComponent<React.PropsWithoutRef<ComponentProps<S>> & React.RefAttributes<E>>;
/**
 * The React component for an element.
 * @param spec
 * @param define
 */
export declare const createComponent: <S, E extends HTMLElement>(spec: ComponentSpec, define: (options?: DefineOptions) => string, displayName: string) => MComponent<S, E>;
export type DeclarationProps<A> = A & Omit<ReactHostAttributes, keyof A> & {
    children?: React.ReactNode;
};
/** A generated declaration component. */
export type MDeclaration<A> = React.ForwardRefExoticComponent<React.PropsWithoutRef<DeclarationProps<A>> & React.RefAttributes<HTMLElement>>;
/** The React component for a declaration child; its parent registers the tag. */
export declare const createDeclaration: <A>(spec: DeclarationSpec, displayName: string) => MDeclaration<A>;
