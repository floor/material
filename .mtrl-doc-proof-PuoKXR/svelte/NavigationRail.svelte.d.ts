import type { Component } from "svelte";
import type { NavigationRailSpec, NavigationRailElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const NavigationRail: Component<SvelteProps<NavigationRailSpec>, { readonly element: NavigationRailElement | null }, Bindable<NavigationRailSpec>>;
export default NavigationRail;
