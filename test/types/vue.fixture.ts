// test/types/vue.fixture.ts
//
// The Vue components' props and events are derived from the element specs.
// Nothing here runs; the assertions are the test.
//
// Compiled by `bun run tooling:check` via test/types/tsconfig.json.
import type { MSwitch, MTabs, MTab, VueProps, VueEmits, VueSlots } from "../../src/vue";
import type { SwitchSpec, TabsSpec, TabAttributes, DialogSpec } from "../../src/elements";
import type { SlotsType, VNodeChild } from "vue";

/** true when A and B are the same type */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assert = <T extends true>(): T => true as T;

type SwitchProps = VueProps<SwitchSpec>;
// v-model binds `checked` through modelValue; v-model:checked through checked.
assert<Equals<SwitchProps["modelValue"], boolean | undefined>>();
assert<Equals<SwitchProps["checked"], boolean | undefined>>();
assert<Equals<SwitchProps["defaultChecked"], boolean | undefined>>();
assert<Equals<SwitchProps["name"], string | undefined>>();
assert<Equals<SwitchProps["supportingText"], string | undefined>>();

type SwitchEmits = VueEmits<SwitchSpec>;
assert<Equals<Parameters<SwitchEmits["change"]>[0], CustomEvent<{ checked: boolean; value: boolean; valueAttribute: string; nativeEvent: Event | undefined }>>>();
assert<Equals<Parameters<SwitchEmits["update:modelValue"]>[0], boolean>>();
assert<Equals<Parameters<SwitchEmits["update:checked"]>[0], boolean>>();

type TabsProps = VueProps<TabsSpec>;
assert<Equals<TabsProps["modelValue"], string | null | undefined>>();
assert<Equals<Parameters<VueEmits<TabsSpec>["update:modelValue"]>[0], string>>();

// The components carry those props: a wrong type is rejected.
type SwitchInstanceProps = InstanceType<typeof MSwitch>["$props"];
assert<Equals<SwitchInstanceProps["modelValue"], boolean | undefined>>();
// @ts-expect-error -- checked is a boolean
export const wrong: SwitchInstanceProps = { checked: "yes" };
type TabsInstanceProps = InstanceType<typeof MTabs>["$props"];
assert<Equals<TabsInstanceProps["modelValue"], string | null | undefined>>();
export const tab: typeof MTab = null as unknown as import("vue").FunctionalComponent<TabAttributes>;

// Named slots: the default one and each slot the element declares.
assert<Equals<VueSlots<DialogSpec>, SlotsType<{ default?: () => VNodeChild } & { headline?: () => VNodeChild; actions?: () => VNodeChild }>>>();
assert<Equals<VueSlots<SwitchSpec>, SlotsType<{ default?: () => VNodeChild } & Record<never, never>>>>();
