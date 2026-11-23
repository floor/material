import type { Component } from "svelte";
import type { CheckboxSpec, CheckboxElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Checkbox: Component<SvelteProps<CheckboxSpec>, { readonly element: CheckboxElement | null }, Bindable<CheckboxSpec>>;
export default Checkbox;
