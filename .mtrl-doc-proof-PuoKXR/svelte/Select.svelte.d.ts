import type { Component } from "svelte";
import type { SelectSpec, SelectElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Select: Component<SvelteProps<SelectSpec>, { readonly element: SelectElement | null }, Bindable<SelectSpec>>;
export default Select;
