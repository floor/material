import type { Component } from "svelte";
import type { ExtendedFabSpec, ExtendedFabElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const ExtendedFab: Component<SvelteProps<ExtendedFabSpec>, { readonly element: ExtendedFabElement | null }, Bindable<ExtendedFabSpec>>;
export default ExtendedFab;
