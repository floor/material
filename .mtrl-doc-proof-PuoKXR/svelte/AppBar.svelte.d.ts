import type { Component } from "svelte";
import type { AppBarSpec, AppBarElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const AppBar: Component<SvelteProps<AppBarSpec>, { readonly element: AppBarElement | null }, Bindable<AppBarSpec>>;
export default AppBar;
