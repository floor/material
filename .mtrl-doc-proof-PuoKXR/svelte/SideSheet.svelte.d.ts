import type { Component } from "svelte";
import type { SideSheetSpec, SideSheetElement } from "../elements/index.js";
import type { Bindable, SvelteProps } from "./runtime.js";
declare const SideSheet: Component<SvelteProps<SideSheetSpec>, { readonly element: SideSheetElement | null }, Bindable<SideSheetSpec>>;
export default SideSheet;
