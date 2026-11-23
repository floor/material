import type { Component } from "svelte";
import type { NavigationDrawerSpec, NavigationDrawerElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const NavigationDrawer: Component<SvelteProps<NavigationDrawerSpec>, { readonly element: NavigationDrawerElement | null }, Bindable<NavigationDrawerSpec>>;
export default NavigationDrawer;
