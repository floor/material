// test/types/solid.fixture.ts
//
// The Solid components' props are derived from the element specs. Nothing
// here runs; the assertions are the test.
//
// Compiled by `bun run tooling:check` via tsconfig.types.json.
import type { ComponentProps } from "solid-js";
import type { Switch, Tabs, Tab, Button, Dialog } from "../../src/solid";
import type { SwitchElement } from "../../src/elements";

/** true when A and B are the same type */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assert = <T extends true>(): T => true as T;

type SwitchProps = ComponentProps<typeof Switch>;
assert<Equals<SwitchProps["checked"], boolean | undefined>>();
assert<Equals<SwitchProps["defaultChecked"], boolean | undefined>>();
assert<Equals<SwitchProps["name"], string | undefined>>();
assert<Equals<SwitchProps["onChange"], ((event: CustomEvent<{ checked: boolean; value: string }>) => void) | undefined>>();
assert<Equals<SwitchProps["ref"], SwitchElement | ((element: SwitchElement) => void) | undefined>>();

type TabsProps = ComponentProps<typeof Tabs>;
assert<Equals<TabsProps["value"], string | null | undefined>>();
assert<Equals<TabsProps["onChange"], ((event: CustomEvent<{ value: string | null }>) => void) | undefined>>();
assert<Equals<ComponentProps<typeof Tab>["disabled"], boolean | undefined>>();
// Host attributes still pass through.
assert<Equals<ComponentProps<typeof Button>["class"], string | undefined>>();

// @ts-expect-error -- checked is a boolean
export const wrong: SwitchProps = { checked: "yes" };

// Named slots are props taking JSX (FLO-333); a text prop of a slot's name
// takes text or JSX.
type DialogProps = ComponentProps<typeof Dialog>;
assert<Equals<DialogProps["actions"], import("solid-js").JSX.Element | undefined>>();
assert<Equals<DialogProps["headline"], import("solid-js").JSX.Element | undefined>>();
// @ts-expect-error -- the switch has no actions slot
export const noSlot: ComponentProps<typeof Switch> = { actions: null };
