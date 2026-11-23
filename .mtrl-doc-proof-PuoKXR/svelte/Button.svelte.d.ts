import type { Component } from "svelte";
import type { ButtonSpec, ButtonElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Button: Component<SvelteProps<ButtonSpec>, { readonly element: ButtonElement | null }, Bindable<ButtonSpec>>;
export default Button;
