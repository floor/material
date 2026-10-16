// The host `trailing` event and the handler each adapter derives from it.
// Nothing here runs; tooling:check compiles it.
import type { TextFieldTrailingPayload } from "../../src/components/text-field";
import type { ElementEvents, TextFieldSpec } from "../../src/elements";
import type { EventProps as ReactEvents } from "../../src/react/create";
import type { EventProps as SolidEvents } from "../../src/solid/create";
import type { EventProps as SvelteEvents } from "../../src/svelte/runtime";
import type { VueEmits } from "../../src/vue/create";

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Has<T, K extends PropertyKey> = K extends keyof T ? true : false;

type Detail = ElementEvents<TextFieldSpec>["trailing"]["detail"];

export const elementTrailing: Has<ElementEvents<TextFieldSpec>, "trailing"> = true;
export const trailingDetail: Equals<Detail, TextFieldTrailingPayload> = true;
export const reactTrailing: Has<ReactEvents<TextFieldSpec>, "onTrailing"> = true;
export const reactDetail: Equals<Parameters<NonNullable<ReactEvents<TextFieldSpec>["onTrailing"]>>[0]["detail"], TextFieldTrailingPayload> = true;
export const vueTrailing: Has<VueEmits<TextFieldSpec>, "trailing"> = true;
export const vueDetail: Equals<Parameters<VueEmits<TextFieldSpec>["trailing"]>[0]["detail"], TextFieldTrailingPayload> = true;
export const solidTrailing: Has<SolidEvents<TextFieldSpec>, "onTrailing"> = true;
export const solidDetail: Equals<Parameters<NonNullable<SolidEvents<TextFieldSpec>["onTrailing"]>>[0]["detail"], TextFieldTrailingPayload> = true;
export const svelteTrailing: Has<SvelteEvents<TextFieldSpec>, "ontrailing"> = true;
export const svelteDetail: Equals<Parameters<NonNullable<SvelteEvents<TextFieldSpec>["ontrailing"]>>[0]["detail"], TextFieldTrailingPayload> = true;
