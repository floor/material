import type { Component } from "svelte";
import type { FabSpec, FabElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const Fab: Component<SvelteProps<FabSpec>, { readonly element: FabElement | null }, Bindable<FabSpec>>;
export default Fab;
