import type { Component } from "svelte";
import type { DrawerSpec, DrawerElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
/** @deprecated Material Design 3 names this the navigation drawer. Use NavigationDrawer instead. */
declare const Drawer: Component<SvelteProps<DrawerSpec>, { readonly element: DrawerElement | null }, Bindable<DrawerSpec>>;
export default Drawer;
