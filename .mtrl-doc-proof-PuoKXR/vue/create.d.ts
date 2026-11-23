/** Vue components over the elements. */
import { type DefineSetupFnComponent, type FunctionalComponent, type SlotsType, type HTMLAttributes, type VNodeChild } from "vue";
import type { DefineOptions, ElementEvents, ElementProperties, ElementProps, ElementSlots } from "../elements/index.js";
import { type ComponentSpec, type DeclarationSpec, type DefaultProps, type FormProps, type ModelOf, type RetiredEvents } from "../elements/adapter.js";
export { configure } from "../elements/adapter.js";
/** `modelValue` for the spec's model property, so plain `v-model` binds it. */
export type ModelProps<S> = [
    ModelOf<S>
] extends [
    never
] ? Record<never, never> : {
    modelValue?: ElementProperties<S>[ModelOf<S>];
};
type OwnProps<S> = ElementProps<S> & DefaultProps<S> & FormProps<S> & ModelProps<S>;
type EnterKeyHint = "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
/** Globals Vue's `HTMLAttributes` omits. */
type VueHostGaps = {
    popover?: "" | "auto" | "manual" | "hint";
    enterkeyhint?: EnterKeyHint;
    enterKeyHint?: EnterKeyHint;
    nonce?: string;
};
type Missing<Base, Extra> = {
    [K in Exclude<keyof Extra, keyof Base>]?: K extends keyof Extra ? Extra[K] : never;
};
/** `HTMLAttributes` for the host, plus globals a supported Vue release omits. */
type VueHostAttributes = HTMLAttributes & Missing<HTMLAttributes, VueHostGaps>;
/** `on…` names Vue builds from this component's emits (`change` → `onChange`). */
type EventKeys<S> = `on${Capitalize<keyof ElementEvents<S> & string>}` | `onUpdate:${keyof ElementProperties<S> & string}` | ([
    ModelOf<S>
] extends [
    never
] ? never : "onUpdate:modelValue");
/** Props of a generated component: the element's own, plus any HTML attribute for the host. */
export type VueProps<S> = OwnProps<S> & Omit<VueHostAttributes, keyof OwnProps<S> | EventKeys<S> | RetiredProps<S>> & {
    [K in RetiredProps<S>]?: `${K} was removed in material 3.0.0: use onChange`;
};
/** The handler props of events material 3.0.0 removed (`onToggle` on the icon button): refused, see `RetiredEvents`. */
type RetiredProps<S> = `on${Capitalize<RetiredEvents<S>>}`;
/** Its events: the element's, and `update:*` for two-way binding. */
export type VueEmits<S> = {
    [K in keyof ElementEvents<S> & string]: (event: ElementEvents<S>[K]) => true;
} & {
    [K in keyof ElementProperties<S> & string as `update:${K}`]: (value: NonNullable<ElementProperties<S>[K]>) => true;
} & ([
    ModelOf<S>
] extends [
    never
] ? Record<never, never> : {
    "update:modelValue": (value: NonNullable<ElementProperties<S>[ModelOf<S>]>) => true;
});
/** What a generated component's template ref exposes besides Vue's instance: `ref<InstanceType<typeof MSwitch> & Exposed<SwitchElement>>()`. */
export interface Exposed<E extends HTMLElement> {
    readonly element: E | null;
}
/** A generated component; named so declarations stay short. */
export type MComponent<S, _E extends HTMLElement> = DefineSetupFnComponent<VueProps<S>, VueEmits<S>, VueSlots<S>>;
/** Its slots: the default one, and each named slot the element reads (`<template #actions>`). */
export type VueSlots<S> = SlotsType<{
    default?: () => VNodeChild;
} & {
    [K in ElementSlots<S>]?: () => VNodeChild;
}>;
/** A generated declaration component: its attributes, plus any HTML attribute for the host. */
export type MDeclaration<A> = FunctionalComponent<A & Omit<VueHostAttributes, keyof A>>;
/**
 * The Vue component for an element.
 * @param spec
 * @param define
 */
export declare const createComponent: <S, E extends HTMLElement>(spec: ComponentSpec, define: (options?: DefineOptions) => string, name: string) => MComponent<S, E>;
/** The Vue component for a declaration child; its parent registers the tag. */
export declare const createDeclaration: <A>(spec: DeclarationSpec, name: string) => MDeclaration<A>;
