import type { Component } from "svelte";
import type { ChipsSpec, ChipsElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Chips: Component<SvelteProps<ChipsSpec>, { readonly element: ChipsElement | null }, Bindable<ChipsSpec>>;
export default Chips;
