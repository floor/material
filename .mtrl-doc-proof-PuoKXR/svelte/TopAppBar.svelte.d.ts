import type { Component } from "svelte";
import type { TopAppBarSpec, TopAppBarElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
/** @deprecated Material Design 3 names this the app bar. Use AppBar instead. */
declare const TopAppBar: Component<SvelteProps<TopAppBarSpec>, { readonly element: TopAppBarElement | null }, Bindable<TopAppBarSpec>>;
export default TopAppBar;
