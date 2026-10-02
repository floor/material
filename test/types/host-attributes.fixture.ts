// test/types/host-attributes.fixture.ts
//
// FLO-519: a component accepts the host element's standard HTML attributes.
// The component's own props keep their types where the names collide, a wrong
// type for one of those still fails, and an attribute the framework does not
// know still fails. Compiled under both strictNullChecks gates (tooling:check
// and test:types).
import type { ComponentProps as ReactProps } from "react";
import type { ComponentProps as SolidProps } from "solid-js";
import type { Button, Textfield } from "../../src/react";
import type { Button as SolidButton } from "../../src/solid";
import type { FunctionalComponent } from "vue";
import type { MButton, MTab, VueProps } from "../../src/vue";
import type { SvelteProps } from "../../src/svelte/runtime";
import type { ButtonSpec } from "../../src/elements";

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assert = <T extends true>(): T => true as T;

type ReactButton = ReactProps<typeof Button>;
export const reactHost: ReactButton = {
  popover: "auto",
  inputMode: "numeric",
  enterKeyHint: "send",
  itemProp: "name",
  nonce: "abc",
  label: "Save",
};
// The component's `type` stays its own string.
assert<Equals<ReactButton["type"], string | undefined>>();
// `defaultValue` stays the text field's string, not HTML's wider default.
assert<Equals<ReactProps<typeof Textfield>["defaultValue"], string | undefined>>();
// @ts-expect-error -- popover is "", "auto", "manual" or "hint"
export const reactPopover: ReactButton = { popover: "nope" };
// @ts-expect-error -- variant is a string
export const reactVariant: ReactButton = { variant: 1 };
// @ts-expect-error -- not an HTML attribute
export const reactUnknown: ReactButton = { notARealAttribute: true };

type SolidButtonProps = SolidProps<typeof SolidButton>;
export const solidHost: SolidButtonProps = {
  popover: "auto",
  inputMode: "numeric",
  enterkeyhint: "send",
  itemProp: "name",
  nonce: "abc",
  label: "Save",
};
assert<Equals<SolidButtonProps["type"], string | undefined>>();
// @ts-expect-error -- Solid spells the attribute enterkeyhint
export const solidHint: SolidButtonProps = { enterKeyHint: "send" };
// @ts-expect-error -- variant is a string
export const solidVariant: SolidButtonProps = { variant: 1 };
// @ts-expect-error -- not an HTML attribute
export const solidUnknown: SolidButtonProps = { notARealAttribute: true };

type SvelteButton = SvelteProps<ButtonSpec>;
export const svelteHost: SvelteButton = {
  popover: "auto",
  inputmode: "numeric",
  enterkeyhint: "send",
  itemprop: "name",
  nonce: "abc",
  label: "Save",
};
assert<Equals<SvelteButton["type"], string | undefined>>();
// @ts-expect-error -- Svelte spells the attribute inputmode
export const svelteMode: SvelteButton = { inputMode: "numeric" };
// @ts-expect-error -- variant is a string
export const svelteVariant: SvelteButton = { variant: 1 };
// @ts-expect-error -- not an HTML attribute
export const svelteUnknown: SvelteButton = { notARealAttribute: true };

type VueButton = VueProps<ButtonSpec>;
export const vueHost: VueButton = {
  popover: "auto",
  inputmode: "numeric",
  enterKeyHint: "send",
  itemprop: "name",
  nonce: "abc",
  label: "Save",
  id: "save",
};
export const vueInstance: InstanceType<typeof MButton>["$props"] = {
  popover: "auto",
  inputmode: "numeric",
  enterKeyHint: "send",
  nonce: "abc",
};
assert<Equals<VueButton["type"], string | undefined>>();
// @ts-expect-error -- Vue spells the attribute inputmode
export const vueMode: VueButton = { inputMode: "numeric" };
// @ts-expect-error -- variant is a string
export const vueVariant: VueButton = { variant: 1 };
// @ts-expect-error -- popover is "", "auto", "manual" or "hint"
export const vuePopover: VueButton = { popover: "nope" };
// @ts-expect-error -- not an HTML attribute
export const vueUnknown: VueButton = { notARealAttribute: true };
type FnProps<C> = C extends FunctionalComponent<infer P> ? P : never;
// A declaration child accepts host attributes; its own attribute keeps its type.
export const vueTab: FnProps<typeof MTab> = { value: "a", id: "tab-a", popover: "auto" };
// @ts-expect-error -- value is a string
export const vueTabValue: FnProps<typeof MTab> = { value: 1 };
