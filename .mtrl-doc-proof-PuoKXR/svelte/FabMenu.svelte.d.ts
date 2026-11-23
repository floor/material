import type { Component } from "svelte";
import type { FabMenuSpec, FabMenuElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const FabMenu: Component<SvelteProps<FabMenuSpec>, { readonly element: FabMenuElement | null }, Bindable<FabMenuSpec>>;
export default FabMenu;
