import type { Component } from "svelte";
import type { SplitButtonSpec, SplitButtonElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const SplitButton: Component<SvelteProps<SplitButtonSpec>, { readonly element: SplitButtonElement | null }, Bindable<SplitButtonSpec>>;
export default SplitButton;
