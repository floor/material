// test/types/elements.fixture.ts
//
// The element types are derived from each element's spec, and the framework
// adapters are typed from them. Nothing here runs; the assertions are the
// test. If a derivation widens to `unknown` or `string`, the adapters lose
// their types without any error, so each derived shape is pinned here.
//
// Compiled by `bun run tooling:check` via test/types/tsconfig.json.
import type {
  ButtonElement, ElementEvents, ElementProps, SwitchElement, SwitchSpec, TabAttributes, TabsSpec,
  TextFieldElement, TextFieldSpec,
} from "../../src/elements";

/** true when A and B are the same type */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assert = <T extends true>(): T => true as T;

// Attributes camelCase and take their declared type; the live `checked`
// property is typed by its getter; `label` comes from the slot.
type SwitchProps = ElementProps<SwitchSpec>;
assert<Equals<SwitchProps["checked"], boolean | undefined>>();
assert<Equals<SwitchProps["supportingText"], string | undefined>>();
assert<Equals<SwitchProps["disabled"], boolean | undefined>>();
assert<Equals<SwitchProps["label"], string | undefined>>();

// Events carry the detail their mapper returns.
assert<Equals<ElementEvents<SwitchSpec>["change"], CustomEvent<{ checked: boolean; value: boolean; valueAttribute: string; nativeEvent: Event | undefined }>>>();
assert<Equals<ElementEvents<TabsSpec>["change"], CustomEvent<{ value: string | null }>>>();
assert<Equals<keyof ElementEvents<SwitchSpec>, "change">>();

// The tabs' live value is the getter's type.
assert<Equals<ElementProps<TabsSpec>["value"], string | null | undefined>>();

// A tab declares plain attributes.
assert<Equals<TabAttributes, {
  value?: string; label?: string; icon?: string; badge?: string; disabled?: boolean;
}>>();

// Instances carry the forwarded methods and the component.
declare const sw: SwitchElement;
sw.toggle();
sw.checked = true;
// @ts-expect-error -- not a forwarded method
sw.destroy();
declare const button: ButtonElement;
button.variant = "outlined";
// @ts-expect-error -- attributes keep their declared type
button.disabled = "yes";

// The text field's live value is a string; input and change carry it.
type TextFieldProps = ElementProps<TextFieldSpec>;
assert<Equals<TextFieldProps["value"], string | undefined>>();
assert<Equals<TextFieldProps["maxlength"], number | undefined>>();
assert<Equals<keyof ElementEvents<TextFieldSpec>, "input" | "change">>();
assert<Equals<ElementEvents<TextFieldSpec>["input"], CustomEvent<{ value: string }>>>();
declare const field: TextFieldElement;
field.select();
field.setError(true, "Required");
field.value = "text";
