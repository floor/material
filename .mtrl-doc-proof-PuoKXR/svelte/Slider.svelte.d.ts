import type { Component } from "svelte";
import type { SliderSpec, SliderElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Slider: Component<SvelteProps<SliderSpec>, { readonly element: SliderElement | null }, Bindable<SliderSpec>>;
export default Slider;
