import type { Component } from "svelte";
import type { NavigationBarSpec, NavigationBarElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const NavigationBar: Component<SvelteProps<NavigationBarSpec>, { readonly element: NavigationBarElement | null }, Bindable<NavigationBarSpec>>;
export default NavigationBar;
