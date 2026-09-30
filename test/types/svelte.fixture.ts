// test/types/svelte.fixture.ts
//
// The Svelte components' props are derived from the element specs; the
// generated dist/svelte/*.svelte.d.ts files apply these types. Nothing here
// runs; the assertions are the test.
//
// Compiled by `bun run tooling:check` via test/types/tsconfig.json.
import type { Bindable, SvelteProps } from "../../src/svelte/runtime";
import type { SwitchSpec, TabsSpec, ButtonSpec, DialogSpec, CardSpec, ElementSlots } from "../../src/elements";
import type { Snippet } from "svelte";

/** true when A and B are the same type */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assert = <T extends true>(): T => true as T;

type SwitchProps = SvelteProps<SwitchSpec>;
assert<Equals<SwitchProps["checked"], boolean | undefined>>();
assert<Equals<SwitchProps["defaultChecked"], boolean | undefined>>();
assert<Equals<SwitchProps["name"], string | undefined>>();
// Svelte 5 names event props in lower case.
assert<Equals<SwitchProps["onchange"], ((event: CustomEvent<{ checked: boolean; value: string }>) => void) | undefined>>();
// `bind:checked` is allowed, and only the live properties are bindable.
assert<Equals<Bindable<SwitchSpec>, "checked">>();
assert<Equals<Bindable<TabsSpec>, "value">>();
assert<Equals<Bindable<ButtonSpec>, never>>();
assert<Equals<SvelteProps<TabsSpec>["value"], string | null | undefined>>();
// Host attributes still pass through.
assert<Equals<SvelteProps<ButtonSpec>["class"], import("svelte/elements").ClassValue | null | undefined>>();

// @ts-expect-error -- checked is a boolean
export const wrong: SwitchProps = { checked: "yes" };

// Named slots are snippet props (FLO-325): each slot the element declares; a
// text prop of the same name takes its text or a snippet.
assert<Equals<ElementSlots<DialogSpec>, "headline" | "actions">>();
assert<Equals<SvelteProps<DialogSpec>["actions"], Snippet | undefined>>();
assert<Equals<SvelteProps<DialogSpec>["headline"], string | Snippet | undefined>>();
assert<Equals<SvelteProps<CardSpec>["headerAction"], Snippet | undefined>>();
// A text prop without a slot of its name stays text.
assert<Equals<SwitchProps["supportingText"], string | undefined>>();
// @ts-expect-error -- the switch has no actions slot
export const noSlot: SwitchProps = { actions: (() => {}) as unknown as Snippet };
