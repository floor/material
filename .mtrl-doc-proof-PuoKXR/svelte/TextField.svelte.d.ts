import type { Component } from "svelte";
import type { TextFieldSpec, TextFieldElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const TextField: Component<SvelteProps<TextFieldSpec>, { readonly element: TextFieldElement | null }, Bindable<TextFieldSpec>>;
export default TextField;
