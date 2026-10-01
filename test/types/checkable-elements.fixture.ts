// test/types/checkable-elements.fixture.ts
import type { ElementEvents, CheckboxSpec, SwitchSpec, CheckboxElement, SwitchElement } from "../../src/elements";
import type { Checkbox, Switch } from "../../src/react";
import type { Checkbox as SolidCheckbox, Switch as SolidSwitch } from "../../src/solid";
import type { ComponentProps as ReactProps } from "react";
import type { ComponentProps as SolidProps } from "solid-js";
import type { SvelteProps, Bindable } from "../../src/svelte/runtime";
import type { VueEmits, VueProps } from "../../src/vue";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Detail = { checked: boolean; value: boolean; valueAttribute: string; nativeEvent: Event | undefined };
type Change = (event: CustomEvent<Detail>) => void;
export const checkbox: Equals<ElementEvents<CheckboxSpec>["change"], CustomEvent<Detail>> = true;
export const switchEvent: Equals<ElementEvents<SwitchSpec>["change"], CustomEvent<Detail>> = true;
export const checkboxModel: Equals<Detail["value"], NonNullable<CheckboxElement["checked"]>> = true;
export const switchModel: Equals<Detail["value"], NonNullable<SwitchElement["checked"]>> = true;
export const reactCheckbox: Equals<ReactProps<typeof Checkbox>["onChange"], Change | undefined> = true;
export const reactSwitch: Equals<ReactProps<typeof Switch>["onChange"], Change | undefined> = true;
export const solidCheckbox: Equals<SolidProps<typeof SolidCheckbox>["onChange"], Change | undefined> = true;
export const solidSwitch: Equals<SolidProps<typeof SolidSwitch>["onChange"], Change | undefined> = true;
export const svelteCheckbox: Equals<SvelteProps<CheckboxSpec>["onchange"], Change | undefined> = true;
export const svelteSwitch: Equals<SvelteProps<SwitchSpec>["onchange"], Change | undefined> = true;
export const vueCheckbox: Equals<Parameters<VueEmits<CheckboxSpec>["change"]>[0], CustomEvent<Detail>> = true;
export const vueSwitch: Equals<Parameters<VueEmits<SwitchSpec>["change"]>[0], CustomEvent<Detail>> = true;
export const svelteBinding: Equals<Bindable<CheckboxSpec>, "checked" | "indeterminate"> = true;
export const vueBinding: Equals<VueProps<CheckboxSpec>["modelValue"], boolean | undefined> = true;
// @ts-expect-error adapter consumers must migrate the old string value
export const oldReact: ReactProps<typeof Checkbox> = { onChange: (event: CustomEvent<{ value: string }>) => event.detail.value };
// @ts-expect-error element checked bindings stay boolean
export const oldBinding: SvelteProps<SwitchSpec> = { checked: "yes" };
