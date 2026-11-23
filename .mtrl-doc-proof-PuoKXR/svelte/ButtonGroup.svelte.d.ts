import type { Component } from "svelte";
import type { ButtonGroupSpec, ButtonGroupElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const ButtonGroup: Component<SvelteProps<ButtonGroupSpec>, { readonly element: ButtonGroupElement | null }, Bindable<ButtonGroupSpec>>;
export default ButtonGroup;
