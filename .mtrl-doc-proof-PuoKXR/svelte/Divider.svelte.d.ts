import type { Component } from "svelte";
import type { DividerSpec, DividerElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Divider: Component<SvelteProps<DividerSpec>, { readonly element: DividerElement | null }, Bindable<DividerSpec>>;
export default Divider;
