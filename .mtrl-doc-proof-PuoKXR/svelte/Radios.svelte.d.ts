import type { Component } from "svelte";
import type { RadiosSpec, RadiosElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Radios: Component<SvelteProps<RadiosSpec>, { readonly element: RadiosElement | null }, Bindable<RadiosSpec>>;
export default Radios;
