// test/types/react.fixture.ts
//
// The React components' props are derived from the element specs. Nothing
// here runs; the assertions are the test. A derivation that widens lets any
// prop through without an error, so each shape is pinned here.
//
// Compiled by `bun run tooling:check` via test/types/tsconfig.json.
import type { ComponentProps as ReactProps } from "react";
import type { Button, Dialog, Switch, Tab, Tabs, TextField } from "../../src/react";
import type { SwitchElement } from "../../src/elements";

/** true when A and B are the same type */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assert = <T extends true>(): T => true as T;

type SwitchProps = ReactProps<typeof Switch>;
// `checked` is the live, controlled state; the attribute it shadows is `defaultChecked`.
assert<Equals<SwitchProps["checked"], boolean | undefined>>();
assert<Equals<SwitchProps["defaultChecked"], boolean | undefined>>();
assert<Equals<SwitchProps["supportingText"], string | undefined>>();
assert<Equals<SwitchProps["label"], string | undefined>>();
// Events are typed on* callbacks with the element's detail.
assert<Equals<SwitchProps["onChange"], ((event: CustomEvent<{ checked: boolean; value: boolean; valueAttribute: string; nativeEvent: Event | undefined }>) => void) | undefined>>();
// The ref is the element, with its forwarded methods.
assert<Equals<NonNullable<SwitchProps["ref"]> extends React.Ref<infer E> ? E : never, SwitchElement>>();

type TabsProps = ReactProps<typeof Tabs>;
assert<Equals<TabsProps["value"], string | null | undefined>>();
assert<Equals<TabsProps["defaultValue"], string | undefined>>();
assert<Equals<TabsProps["onChange"], ((event: CustomEvent<{ value: string | null }>) => void) | undefined>>();

type TabProps = ReactProps<typeof Tab>;
assert<Equals<TabProps["disabled"], boolean | undefined>>();

type ButtonProps = ReactProps<typeof Button>;
assert<Equals<ButtonProps["variant"], string | undefined>>();
// Host attributes still pass through.
assert<Equals<ButtonProps["className"], string | undefined>>();
assert<Equals<ButtonProps["onClick"], React.MouseEventHandler<HTMLElement> | undefined>>();

type TextFieldProps = ReactProps<typeof TextField>;
// `value` is the live text; the attribute it shadows is `defaultValue`.
assert<Equals<TextFieldProps["value"], string | undefined>>();
assert<Equals<TextFieldProps["defaultValue"], string | undefined>>();
assert<Equals<TextFieldProps["onInput"], ((event: CustomEvent<{ value: string }>) => void) | undefined>>();

// @ts-expect-error -- a switch's checked is a boolean
export const wrong: SwitchProps = { checked: "yes" };

// Named slots are props taking nodes; a text prop of a slot's name
// takes text or nodes.
type DialogProps = ReactProps<typeof Dialog>;
assert<Equals<DialogProps["actions"], import("react").ReactNode>>();
assert<Equals<DialogProps["headline"], import("react").ReactNode>>();
// @ts-expect-error -- the switch has no actions slot
export const noSlot: ReactProps<typeof Switch> = { actions: null };
